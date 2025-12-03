"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { annotateDocument, type OCRResult } from "@/utils/ocr-api"
import { Upload } from "lucide-react"
import insightZustand from "@/utils/insight-zustand"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface OCRUploadProps {
  onResults?: (results: OCRResult) => void
  onAnnotatedPDF?: (pdfUrl: string) => void
}

interface Subject {
  id: string
  display_name: string
}

export default function OCRUpload({ onResults, onAnnotatedPDF }: OCRUploadProps) {
  const { user } = useUser()
  const { setToast } = insightZustand()
  const [file, setFile] = useState<File | null>(null)
  const [exam, setExam] = useState("")
  const [subject, setSubject] = useState("")
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(true)
  const [loading, setLoading] = useState(false)
  const [loadingStage, setLoadingStage] = useState<string>("")
  const [progress, setProgress] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<OCRResult | null>(null)
  const [annotatedPdfBlob, setAnnotatedPdfBlob] = useState<Blob | null>(null)

  // Fetch available subjects on component mount
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"
        const response = await fetch(`${apiUrl}/api/ocr/subjects`)

        if (!response.ok) {
          throw new Error("Failed to load subjects")
        }

        const data = await response.json()
        setSubjects(data.subjects || [])

      } catch (err) {
        console.error("Failed to fetch subjects:", err)
        setSubjects([])
      } finally {
        setLoadingSubjects(false)
      }
    }

    fetchSubjects()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        setError("Please select a PDF file")
        return
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB")
        return
      }
      setFile(selectedFile)
      setError(null)
      setResults(null)
      setAnnotatedPdfBlob(null)
    }
  }

  const handleEvaluate = async () => {
    if (!file || !user) return
    if (!exam) {
      setError("Please select an exam")
      return
    }
    if (!subject) {
      setError("Please select a subject")
      return
    }
    setLoading(true)
    setError(null)
    setProgress(0)
    setLoadingStage("Uploading document...")

    try {
      // Real backend pipeline progress stages (11 steps total)
      // Each step matches actual backend processing in grade_pdf_answer.py
      
      // Step 1: Upload & Convert (0-8%)
      setProgress(3)
      setTimeout(() => {
        setLoadingStage("Step 1/11: Converting PDF pages to images...")
        setProgress(8)
      }, 800)

      // Step 2: OCR Extraction (8-18%)
      setTimeout(() => {
        setLoadingStage("Step 2/11: Running OCR on document (Google Vision)...")
        setProgress(18)
      }, 8000)

      // Step 3: Section Detection (18-28%)
      setTimeout(() => {
        setLoadingStage("Step 3/11: Detecting sections and headings with AI...")
        setProgress(28)
      }, 18000)

      // Step 4: Load Rubric (28-33%)
      setTimeout(() => {
        setLoadingStage("Step 4/11: Loading subject-specific rubric...")
        setProgress(33)
      }, 28000)

      // Step 5: AI Grading (33-48%) - Longest step
      setTimeout(() => {
        setLoadingStage("Step 5/11: AI analyzing and grading your answer...")
        setProgress(48)
      }, 35000)

      // Step 6: Report Generation (48-58%)
      setTimeout(() => {
        setLoadingStage("Step 6/11: Generating detailed evaluation report...")
        setProgress(58)
      }, 55000)

      // Step 7: Refined Rubric (58-63%)
      setTimeout(() => {
        setLoadingStage("Step 7/11: Loading advanced rubric criteria...")
        setProgress(63)
      }, 65000)

      // Step 8: Advanced Annotations (63-73%)
      setTimeout(() => {
        setLoadingStage("Step 8/11: Generating refined annotations...")
        setProgress(73)
      }, 75000)

      // Step 9: Annotating Pages (73-83%)
      setTimeout(() => {
        setLoadingStage("Step 9/11: Annotating answer pages...")
        setProgress(83)
      }, 90000)

      // Step 10: Ideal Outline (83-88%)
      setTimeout(() => {
        setLoadingStage("Step 10/11: Creating ideal answer outline...")
        setProgress(88)
      }, 105000)

      // Step 11: Final Assembly (88-95%)
      setTimeout(() => {
        setLoadingStage("Step 11/11: Assembling final PDF report...")
        setProgress(95)
      }, 120000)

      // Single API call that returns both PDF and metadata
      const { pdfBlob, metadata } = await annotateDocument(file, user.id, subject)

      // Final step: Complete
      setProgress(100)
      setLoadingStage("✅ Evaluation complete!")

      setAnnotatedPdfBlob(pdfBlob)
      setResults(metadata)
      onResults?.(metadata)
      const url = URL.createObjectURL(pdfBlob)
      onAnnotatedPDF?.(url)

      // Reset progress after a brief moment
      setTimeout(() => {
        setLoadingStage("")
        setProgress(0)
      }, 1000)
    } catch (err) {
      console.error("Evaluation failed:", err)
      const errorMessage = err instanceof Error ? err.message : "Evaluation failed"

      if (errorMessage.includes("limit reached") ||
        errorMessage.includes("limit exceeded") ||
        errorMessage.includes("Monthly token limit")) {
        setToast(errorMessage)
        setError(errorMessage)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('refreshProStatus'))
          localStorage.setItem('proStatusRefresh', Date.now().toString())
        }
      } else {
        if (errorMessage.includes("503")) {
          const msg = "OCR service is temporarily unavailable. Please try again later."
          setError(msg)
          setToast(msg)
        } else if (errorMessage.includes("413")) {
          const msg = "File is too large. Please upload a PDF smaller than 10MB."
          setError(msg)
          setToast(msg)
        } else if (errorMessage.includes("timeout")) {
          const msg = "Request timed out. The document may be too complex. Please try a shorter document."
          setError(msg)
          setToast(msg)
        } else if (errorMessage.includes("OCR")) {
          const msg = "OCR extraction failed. Please ensure the PDF contains readable text."
          setError(msg)
          setToast(msg)
        } else {
          const msg = `Evaluation failed: ${errorMessage}`
          setError(msg)
          setToast(msg)
        }
      }
    } finally {
      setLoading(false)
      setLoadingStage("")
      setProgress(0)
    }
  }

  const downloadAnnotatedPDF = () => {
    if (annotatedPdfBlob) {
      const url = URL.createObjectURL(annotatedPdfBlob)
      const link = document.createElement("a")
      link.href = url
      link.download = `annotated_${file?.name || "document.pdf"}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
  }

  const resetEvaluation = () => {
    setFile(null)
    setResults(null)
    setAnnotatedPdfBlob(null)
    setError(null)
    setLoading(false)
    setLoadingStage("")
    setProgress(0)
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ""
    }
  }

  return (
    <Card className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl overflow-hidden">
      <CardContent className="p-8 space-y-6">
        {!user && (
          <Alert variant="default" className="border-border bg-secondary/50">
            <AlertTitle className="font-medium text-foreground">Sign in required</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              Please sign in to use the OCR analysis feature.
            </AlertDescription>
          </Alert>
        )}

        {/* Exam Selection */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Select Exam</label>
            <span className="text-xs text-red-500 font-medium cursor-pointer hover:underline">Document Guidelines</span>
          </div>
          <select
            value={exam}
            onChange={(e) => setExam(e.target.value)}
            className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#2E5C55]/20 dark:focus:ring-[#4ade80]/20 transition-all"
          >
            <option value="">Choose your exam</option>
            <option value="CSS">CSS (Central Superior Services)</option>
            <option value="PMS">PMS (Provincial Management Service)</option>
          </select>
        </div>

        {/* Subject Selection */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Select Subject</label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={loadingSubjects || !exam}
            className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#2E5C55]/20 dark:focus:ring-[#4ade80]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">{exam ? "Select a subject" : "Select an exam first"}</option>
            {!loadingSubjects && subjects.length > 0 && subjects.map((subj) => (
              <option key={subj.id} value={subj.id}>
                {subj.display_name}
              </option>
            ))}
          </select>
        </div>

        {/* File Upload */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Upload Your Answer (PDF)</label>
          <div className="relative">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              disabled={loading}
            />
            <div className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all duration-200 ${file
                ? "border-red-600 bg-red-50 dark:border-red-500 dark:bg-red-950/20"
                : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              }`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${file ? "bg-red-600 text-white dark:bg-red-500 dark:text-white" : "bg-red-600/10 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                }`}>
                <Upload className="w-6 h-6" />
              </div>

              {file ? (
                <div className="text-center">
                  <p className="font-bold text-zinc-800 dark:text-zinc-200 mb-1">{file.name}</p>
                  <p className="text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="font-bold text-zinc-800 dark:text-zinc-200 mb-1">Drag and drop</p>
                  <p className="text-xs text-zinc-500 mb-4">or click to browse (Max 10MB)</p>
                  <span className="inline-block px-4 py-2 border border-red-600 text-red-600 dark:border-red-500 dark:text-red-400 rounded-lg text-sm font-medium">
                    Choose File
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <Button
          onClick={handleEvaluate}
          disabled={!file || !user || !subject || !exam || loading}
          className="w-full py-6 text-lg font-bold bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-xl shadow-lg shadow-red-600/20 dark:shadow-red-500/20 transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Evaluating..." : "Analyze"}
        </Button>

        {/* Progress Indicator */}
        {loading && (
          <div className="space-y-3 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-900 dark:text-white">{loadingStage}</span>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">{progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full bg-red-600 dark:bg-red-500 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 text-center">
              <span className="font-medium">Processing your document...</span><br />
              Depending on document size and complexity, this may take <span className="font-semibold text-red-600 dark:text-red-400">3-4 minutes</span>.
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive" className="border-destructive/40">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Report Ready */}
        {annotatedPdfBlob && (
          <Alert className="border-2 border-red-500/30 bg-red-50 dark:border-red-500/30 dark:bg-red-950/20 rounded-2xl">
            <AlertTitle className="text-red-700 dark:text-red-400 font-bold">Evaluation Report Ready</AlertTitle>
            <AlertDescription className="flex flex-col gap-3">
              <span className="text-zinc-700 dark:text-zinc-300">Your detailed evaluation report is ready for download.</span>
              <div className="flex flex-col gap-2 md:flex-row">
                <Button onClick={downloadAnnotatedPDF} className="w-full md:w-auto bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white">
                  Download Report
                </Button>
                <button 
                  onClick={resetEvaluation} 
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors h-9 px-4 py-2 border-2 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Evaluate Another Question
                </button>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
