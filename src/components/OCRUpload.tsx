"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { annotateDocument, type OCRResult } from "@/utils/ocr-api"
import { AiOutlineFileText } from "react-icons/ai"
import insightZustand from "@/utils/insight-zustand"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

        // Set first subject as default if available
        if (data.subjects && data.subjects.length > 0) {
          setSubject(data.subjects[0].id)
        }
      } catch (err) {
        console.error("Failed to fetch subjects:", err)
        // Fallback to empty array - user will see error in UI
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

  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSubject(e.target.value)
    setError(null)
    setResults(null)
    setAnnotatedPdfBlob(null)
  }

  const handleEvaluate = async () => {
    if (!file || !user) return
    if (!subject) {
      setError("Please select a subject before evaluating")
      return
    }
    setLoading(true)
    setError(null)
    setProgress(0)
    setLoadingStage("Uploading document...")

    try {
      // Simulate progress stages
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 90) return prev + 1
          return prev
        })
      }, 300)

      setLoadingStage("Extracting handwriting and text...")
      setProgress(10)

      setTimeout(() => setLoadingStage("Understanding the question..."), 3000)
      setTimeout(() => setProgress(40), 3000)

      setTimeout(() => setLoadingStage("Evaluating answer with rubric..."), 6000)
      setTimeout(() => setProgress(60), 6000)

      setTimeout(() => setLoadingStage("Generating annotated report..."), 9000)
      setTimeout(() => setProgress(80), 9000)

      // Single API call that returns both PDF and metadata
      const { pdfBlob, metadata } = await annotateDocument(file, user.id, subject)

      clearInterval(progressInterval)
      setProgress(100)
      setLoadingStage("Evaluation complete!")

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

      // Check if this is a limit exceeded error - show in toast beautifully
      if (errorMessage.includes("limit reached") || 
          errorMessage.includes("limit exceeded") || 
          errorMessage.includes("Monthly token limit")) {
        // Show limit exceeded message in toast (beautiful display)
        setToast(errorMessage)
        // Also set local error for component display
        setError(errorMessage)
        // Trigger status refresh if user was downgraded
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('refreshProStatus'))
          localStorage.setItem('proStatusRefresh', Date.now().toString())
        }
      } else {
        // Provide more detailed error messages for other errors
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
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6">
      <Card className="rounded-3xl border border-border/60 bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/50 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-foreground text-xl">Upload and analyze</CardTitle>
          <CardDescription className="text-muted-foreground">
            Securely upload a PDF and get AI-driven insights. No design dependencies added.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {!user && (
            <Alert variant="default" className="border-border bg-secondary/50">
              <AlertTitle className="font-medium text-foreground">Sign in required</AlertTitle>
              <AlertDescription className="text-muted-foreground">
                Please sign in to use the OCR analysis feature.
              </AlertDescription>
            </Alert>
          )}

          {/* Subject Selection */}
          <div className="space-y-2">
            <label htmlFor="ocr-subject" className="block text-sm font-medium text-foreground">
              Subject
            </label>
            <select
              id="ocr-subject"
              value={subject}
              onChange={handleSubjectChange}
              disabled={loadingSubjects || subjects.length === 0}
              className="w-full rounded-2xl border border-border/70 bg-background/70 p-3 text-sm text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingSubjects && <option value="">Loading subjects...</option>}
              {!loadingSubjects && subjects.length === 0 && <option value="">No subjects available</option>}
              {!loadingSubjects && subjects.length > 0 && subjects.map((subj) => (
                <option key={subj.id} value={subj.id}>
                  {subj.display_name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {loadingSubjects
                ? "Loading available subjects..."
                : subjects.length > 0
                  ? `${subjects.length} subjects available from rubric folders. Add/rename folders to update list.`
                  : "No subjects found. Please check rubric folders."}
            </p>
          </div>

          {/* File Upload */}
          <div className="space-y-3">
            <div
              className="group rounded-2xl border border-dashed border-border/70 p-6 md:p-8 transition-colors hover:bg-accent/30"
              aria-label="PDF file upload"
            >
              <div className="flex items-center gap-4">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-background/70 text-foreground/80 ring-1 ring-border/60 transition-transform group-hover:scale-105">
                  <AiOutlineFileText className="h-6 w-6" />
                </span>
                <div className="flex-1">
                  <p className="text-sm md:text-base text-foreground font-medium">Upload PDF Document</p>
                  <p className="text-xs text-muted-foreground">Max size 10MB. Only .pdf files are supported.</p>
                </div>
                <label className="inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-95 disabled:opacity-50">
                  Choose PDF
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="sr-only"
                    aria-label="Choose PDF"
                  />
                </label>
              </div>

              {file && (
                <div className="mt-4 rounded-xl border border-border/60 bg-card/70 px-3 py-2 text-sm text-muted-foreground">
                  Selected: <span className="text-foreground">{file.name}</span>{" "}
                  <span className="text-foreground/70">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-center">
            <Button onClick={handleEvaluate} disabled={!file || !user || !subject || loading} className="w-full md:w-auto px-8">
              {loading ? "Evaluating..." : "Evaluate"}
            </Button>
          </div>

          {/* Progress Indicator */}
          {loading && (
            <div className="space-y-3 rounded-2xl border border-border/60 bg-card/60 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{loadingStage}</span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                This may take 30-60 seconds depending on document length and complexity.
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
            <Alert className="border-border bg-secondary/40">
              <AlertTitle className="text-foreground">Evaluation Report Ready</AlertTitle>
              <AlertDescription className="flex flex-col gap-3">
                <span className="text-muted-foreground">Your detailed evaluation report is ready for download. The report includes scores, detailed feedback, issues found, and a model answer outline.</span>
                <div className="flex flex-col gap-2 md:flex-row">
                  <Button onClick={downloadAnnotatedPDF} className="w-full md:w-auto">
                    Download Report
                  </Button>
                  <Button onClick={resetEvaluation} variant="outline" className="w-full md:w-auto">
                    Evaluate Another Question
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
