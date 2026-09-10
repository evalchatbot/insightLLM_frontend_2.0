"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import {
  annotateDocument, 
  type OCRResult,
  submitOCRJob,
  getJobStatus,
  getProgress,
  cancelJob,
  getJobResult,
  gradeEssay,
  submitEssayJob,
  getEssayJobStatus,
  getEssayJobResult,
  submitOutlineJob,
  getOutlineJobStatus,
  getOutlineJobResult,
  submitPrecisJob,
  getPrecisJobStatus,
  getPrecisJobResult,
  type JobStatus,
  type ProgressData
} from "@/utils/ocr-api"
import { Upload, X } from "lucide-react"
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
  // Hardcoded-login build: no Clerk. Use a static local identity so all
  // downstream `user` / `user.id` usages keep working unchanged.
  const user = { id: "standalone-user" }
  const { setToast } = insightZustand()
  const [file, setFile] = useState<File | null>(null)
  const [exam, setExam] = useState("")
  const [subject, setSubject] = useState("")
  const [isEssay, setIsEssay] = useState(false)
  const [isPrecis, setIsPrecis] = useState(false)
  const [isOutlineMode, setIsOutlineMode] = useState(false)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(true)
  const [loading, setLoading] = useState(false)
  const [loadingStage, setLoadingStage] = useState<string>("")
  const [progress, setProgress] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<OCRResult | null>(null)
  const [annotatedPdfBlob, setAnnotatedPdfBlob] = useState<Blob | null>(null)
  const [annotatedPdfUrl, setAnnotatedPdfUrl] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
  const [progressData, setProgressData] = useState<ProgressData | null>(null)

  // Document Guidelines Modal State
  const [showGuidelines, setShowGuidelines] = useState(false)

  // ---- Bulk evaluation (up to MAX_BULK PDFs at once) ----
  const MAX_BULK = 10
  type BulkItem = {
    name: string
    status: "queued" | "processing" | "completed" | "failed"
    downloadUrl?: string
    scoreText?: string
    error?: string
  }
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkFiles, setBulkFiles] = useState<File[]>([])
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([])
  const [bulkRunning, setBulkRunning] = useState(false)

  // Refs for polling intervals
  const statusPollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const progressPollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const getFriendlyOutlineStepMessage = (
    stepNumber: number,
    details?: ProgressData["details"]
  ): string => {
    const step = Math.max(1, Math.min(9, Number(stepNumber) || 1))
    const labels: Record<number, string> = {
      1: "We received your outline and started checking it.",
      2: "Reading your pages clearly.",
      3: "Extracting key outline points.",
      4: "Understanding your structure and flow.",
      5: "Checking quality against the rubric.",
      6: "Preparing feedback and improvements.",
      7: "Matching feedback to exact lines on your page.",
      8: "Building your annotated PDF report.",
      9: "Final review and saving your report.",
    }

    let message = labels[step] || "Working on your outline report."

    if (
      details?.pages_completed !== undefined &&
      details?.total_pages !== undefined
    ) {
      message += ` (Page ${details.pages_completed} of ${details.total_pages})`
    }

    return message
  }

  // Subject Mapping & Grouping Logic
  const getDisplayName = (originalName: string) => {
    const mapping: Record<string, string> = {
      "CLAW": "Constitutional Law",
      "European": "European History",
      "I Law": "International Law",
      "IR": "International Relations",
      "Mass Comm": "Mass Communication",
      "Pak Affairs": "Pakistan Affairs",
      "Political Science Rubric": "Political Science",
      "Islamic studies": "Islamic Studies"
    }
    return mapping[originalName] || originalName
  }

  const isEnglishEssaySubject = (subjectId: string): boolean => {
    const selectedSubject = subjects.find(s => s.id === subjectId)
    return selectedSubject?.display_name === "English Essay" || subjectId === "english_essay"
  }

  const isPrecisSubject = (subjectId: string): boolean => {
    const selectedSubject = subjects.find(s => s.id === subjectId)
    return selectedSubject?.display_name === "English Precis" || subjectId === "english_precis"
  }

  const renderSubjectOptions = () => {
    if (loadingSubjects) return null
    if (subjects.length === 0) return null

    // Transform subjects with new names
    const transformedSubjects = subjects.map(s => ({
      ...s,
      display_name: getDisplayName(s.display_name)
    }))

    const prioritizeEssay = (a: Subject, b: Subject) => {
      if (a.display_name === "English Essay") return -1
      if (b.display_name === "English Essay") return 1
      return 0
    }

    if (exam === "PMS") {
      const compulsoryNames = ["Pakistan Affairs", "Islamic Studies", "English Essay", "English Precis"]
      const compulsory = transformedSubjects
        .filter(s => compulsoryNames.includes(s.display_name))
        .sort(prioritizeEssay)
      // Add English Essay if not in subjects list and keep it at top
      if (!compulsory.some(s => s.display_name === "English Essay")) {
        compulsory.unshift({ id: "english_essay", display_name: "English Essay" })
      }
      // Add English Precis if not in subjects list
      if (!compulsory.some(s => s.display_name === "English Precis")) {
        compulsory.push({ id: "english_precis", display_name: "English Precis" })
      }

      const optionalNames = [
        "Business Administration",
        "Public Administration",
        "Political Science",
        "Mass Communication",
        "Sociology",
        "Psychology",
        "Philosophy"
      ]

      const optional = transformedSubjects.filter(s => optionalNames.includes(s.display_name))

      return (
        <>
          <option value="">Select a subject</option>
          <optgroup label="COMPULSORY SUBJECTS">
            {compulsory.map(s => <option key={s.id} value={s.id}>{s.display_name}</option>)}
          </optgroup>
          <optgroup label="OPTIONAL SUBJECTS">
            {optional.map(s => <option key={s.id} value={s.id}>{s.display_name}</option>)}
          </optgroup>
        </>
      )
    } else if (exam === "CSS") {
      const compulsoryNames = ["Current Affairs", "Pakistan Affairs", "Islamic Studies", "English Essay", "English Precis"]
      const compulsory = transformedSubjects
        .filter(s => compulsoryNames.includes(s.display_name))
        .sort(prioritizeEssay)
      // Add English Essay if not in subjects list and keep it at top
      if (!compulsory.some(s => s.display_name === "English Essay")) {
        compulsory.unshift({ id: "english_essay", display_name: "English Essay" })
      }
      // Add English Precis if not in subjects list
      if (!compulsory.some(s => s.display_name === "English Precis")) {
        compulsory.push({ id: "english_precis", display_name: "English Precis" })
      }
      const optional = transformedSubjects.filter(s => !compulsoryNames.includes(s.display_name))

      return (
        <>
          <option value="">Select a subject</option>
          <optgroup label="COMPULSORY SUBJECTS">
            {compulsory.map(s => <option key={s.id} value={s.id}>{s.display_name}</option>)}
          </optgroup>
          <optgroup label="OPTIONAL SUBJECTS">
            {optional.map(s => <option key={s.id} value={s.id}>{s.display_name}</option>)}
          </optgroup>
        </>
      )
    }

    return (
      <>
        <option value="">Select a subject</option>
        {transformedSubjects.map(s => (
          <option key={s.id} value={s.id}>{s.display_name}</option>
        ))}
      </>
    )
  }

  // Fetch available subjects on component mount
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        // Check localStorage cache first
        const cachedSubjects = localStorage.getItem('ocr_subjects')
        const cacheTimestamp = localStorage.getItem('ocr_subjects_timestamp')
        const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

        if (cachedSubjects && cacheTimestamp) {
          const age = Date.now() - parseInt(cacheTimestamp)
          if (age < CACHE_DURATION) {
            console.log('[OCR] Using cached subjects')
            setSubjects(JSON.parse(cachedSubjects))
            setLoadingSubjects(false)
            return
          }
        }

        // Normalize API URL to fix malformed URLs (e.g., "http:localhost:127.0.0.1:8001" -> "http://localhost:127.0.0.1:8001")
        let apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"
        if (apiUrl.startsWith("http:") && !apiUrl.startsWith("http://") && !apiUrl.startsWith("https://")) {
          apiUrl = apiUrl.replace(/^http:/, "http://")
        }
        console.log(`[OCR] Fetching subjects from: ${apiUrl}/api/ocr/subjects`)
        console.log(`[OCR] Environment check - NEXT_PUBLIC_API_BASE_URL:`, process.env.NEXT_PUBLIC_API_BASE_URL || "NOT SET (using default)")
        
        const response = await fetch(`${apiUrl}/api/ocr/subjects`, {
          headers: {
            'Accept': 'application/json',
          },
          cache: 'no-cache'
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`[OCR] Failed to load subjects. Status: ${response.status}, Response:`, errorText)
          throw new Error(`Failed to load subjects (${response.status})`)
        }

        const data = await response.json()
        console.log(`[OCR] Successfully loaded ${data.subjects?.length || 0} subjects`)
        
        if (data.subjects && data.subjects.length > 0) {
          setSubjects(data.subjects)
          // Cache the subjects
          localStorage.setItem('ocr_subjects', JSON.stringify(data.subjects))
          localStorage.setItem('ocr_subjects_timestamp', Date.now().toString())
        } else {
          console.warn('[OCR] No subjects returned from API')
        }

      } catch (err) {
        console.error("[OCR] Failed to fetch subjects:", err)
        console.error("[OCR] API URL was:", process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000 (default)")
        console.error("[OCR] Make sure NEXT_PUBLIC_API_BASE_URL is set in your deployment environment variables")
        
        // Try to use cached data even if expired
        const cachedSubjects = localStorage.getItem('ocr_subjects')
        if (cachedSubjects) {
          console.log('[OCR] Using expired cache as fallback')
          setSubjects(JSON.parse(cachedSubjects))
        } else {
          setSubjects([])
        }
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
      if (selectedFile.size > 20 * 1024 * 1024) {
        setError("File size must be less than 20MB")
        return
      }
      setFile(selectedFile)
      setError(null)
      setResults(null)
      setAnnotatedPdfBlob(null)
    }
  }

  // Cleanup polling intervals on unmount
  useEffect(() => {
    return () => {
      if (statusPollIntervalRef.current) {
        clearInterval(statusPollIntervalRef.current)
      }
      if (progressPollIntervalRef.current) {
        clearInterval(progressPollIntervalRef.current)
      }
    }
  }, [])

  const stopPolling = () => {
    if (statusPollIntervalRef.current) {
      clearInterval(statusPollIntervalRef.current)
      statusPollIntervalRef.current = null
    }
    if (progressPollIntervalRef.current) {
      clearInterval(progressPollIntervalRef.current)
      progressPollIntervalRef.current = null
    }
  }

  const handleCancel = async () => {
    if (!jobId) return
    
    try {
      await cancelJob(jobId)
      stopPolling()
      setLoading(false)
      setLoadingStage("")
      setProgress(0)
      setError("Job cancelled by user")
      setJobId(null)
      setRequestId(null)
      setJobStatus(null)
      setAnnotatedPdfUrl(null)
    } catch (err) {
      console.error("Failed to cancel job:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to cancel job"
      setError(errorMessage)
      setToast(errorMessage)
    }
  }

  const handleEvaluate = async (requestedMode: "auto" | "essay" | "outline" | "precis" | "regular" = "auto") => {
    if (!file || !user) return

    const currentIsEssay = isEnglishEssaySubject(subject)
    const currentIsPrecis = isPrecisSubject(subject)

    const selectedMode: "essay" | "outline" | "precis" | "regular" =
      requestedMode === "auto"
        ? (currentIsPrecis
            ? "precis"
            : currentIsEssay
            ? (isOutlineMode ? "outline" : "essay")
            : "regular")
        : requestedMode

    const useOutline = selectedMode === "outline"
    const useEssay = selectedMode === "essay"
    const usePrecis = selectedMode === "precis"

    setIsOutlineMode(useOutline)

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
    setLoadingStage(
      useOutline ? "Starting your outline evaluation..." :
      useEssay ? "Starting Essay Evaluation..." :
      usePrecis ? "Starting Precis Evaluation..." :
      "Submitting job..."
    )
    setJobId(null)
    setRequestId(null)
    setJobStatus(null)

    let newJobId: string
    let newRequestId: string

    try {
      if (useOutline) {
           const resp = await submitOutlineJob(file, user.id);
           newJobId = resp.jobId
           newRequestId = resp.requestId
         } else if (useEssay) {
           const resp = await submitEssayJob(file, user.id);
           newJobId = resp.jobId
           newRequestId = resp.requestId
         } else if (usePrecis) {
           const resp = await submitPrecisJob(file, user.id);
           newJobId = resp.jobId
           newRequestId = resp.requestId
      } else {
           const resp = await submitOCRJob(file, user.id, subject);
           newJobId = resp.jobId
           newRequestId = resp.requestId
      }

      setJobId(newJobId)
      setRequestId(newRequestId)
      recordEvalStat(subject) // count at submit (per-subject + total)
      setLoadingStage(useOutline ? "Outline file uploaded. We are starting now..." : "Job submitted. Processing started...")
      setProgress(5)

      // Poll job status
      const pollStatus = async () => {
        try {
          const status = useOutline
              ? await getOutlineJobStatus(newJobId)
              : useEssay 
              ? await getEssayJobStatus(newJobId)
              : usePrecis
              ? await getPrecisJobStatus(newJobId)
              : await getJobStatus(newJobId)

          if (!status) {
             return 
          }

          // Ensure we get the status string
          const currentStatus = status.status || status;
          setJobStatus(currentStatus)

          if (currentStatus === "completed") {
            stopPolling()
            setProgress(100)
            setLoadingStage(
              useOutline
                ? "Outline check complete. Getting your report..."
                : "✅ Evaluation complete! Retrieving results..."
            )

            try {
                if (useOutline || useEssay || usePrecis) {
                  // All three pipeline types return the same { result, annotated_pdf_url } shape
                  const pipelineData = useOutline
                    ? await getOutlineJobResult(newJobId)
                  : useEssay
                    ? await getEssayJobResult(newJobId)
                    : await getPrecisJobResult(newJobId);
                  
                  if (pipelineData.result) {
                      setResults(pipelineData.result as OCRResult);
                      onResults?.(pipelineData.result as OCRResult);
                  }
                  
                    if (pipelineData.annotated_pdf_url) {
                      const url = pipelineData.annotated_pdf_url;
                      setAnnotatedPdfUrl(url)
                      onAnnotatedPDF?.(url)
                      
                      try {
                        const resp = await fetch(url, { credentials: "include" })
                        if (!resp.ok) throw new Error(`PDF download failed: ${resp.status}`)
                        const blob = await resp.blob()
                        setAnnotatedPdfBlob(blob)
                      } catch (e) {
                        console.error("Blob fetch failed", e)
                        setAnnotatedPdfBlob(null)
                      }
                    }
              } else {
                  const { pdfBlob, metadata } = await getJobResult(newJobId)
                  setAnnotatedPdfBlob(pdfBlob)
                  setResults(metadata)
                  onResults?.(metadata)
                    const url = URL.createObjectURL(pdfBlob)
                    setAnnotatedPdfUrl(url)
                    onAnnotatedPDF?.(url)
              }
              
              setLoadingStage(useOutline ? "✅ Done! Your outline report is ready." : "✅ Evaluation complete!")
              
              setTimeout(() => {
                setLoadingStage("")
                setProgress(0)
              }, 2000)
            } catch (err) {
              console.error("Failed to get job result:", err)
              const errorMessage = err instanceof Error ? err.message : "Failed to retrieve results"
              setError(errorMessage)
              setToast(errorMessage)
            } finally {
              setLoading(false)
            }
          } else if (currentStatus === "failed") {
            stopPolling()
            setLoading(false)
            setError(status.error || "Job failed")
            setToast(status.error || "Job failed")
          } else if (currentStatus === "cancelled") {
            stopPolling()
            setLoading(false)
            setError("Job was cancelled")
          }
        } catch (err) {
          console.error("Failed to poll job status:", err)
        }
      }

      // Poll progress
      const pollProgress = async () => {
        if (!newRequestId) return
        
        try {
          const progressData = await getProgress(newRequestId)
          if (progressData) {
            // Update progress state
            setProgressData(progressData)
            setProgress(Math.round(progressData.progress_percent))
            
            // Build loading stage message
            let stageMessage = progressData.message || `Step ${progressData.step_number}/${progressData.total_steps}: ${progressData.step}`

            if (useOutline) {
              stageMessage = getFriendlyOutlineStepMessage(progressData.step_number, progressData.details)
            }
            
            // Add page-level progress if available (during OCR step)
            if (!useOutline && progressData.details?.pages_completed !== undefined && 
                progressData.details?.total_pages !== undefined) {
              const pagesCompleted = progressData.details.pages_completed
              const totalPages = progressData.details.total_pages
              stageMessage += ` (Page ${pagesCompleted} of ${totalPages})`
            }
            
            setLoadingStage(stageMessage)
            
            // Stop polling progress when complete
            if (progressData.progress_percent >= 100) {
              if (progressPollIntervalRef.current) {
                clearInterval(progressPollIntervalRef.current)
                progressPollIntervalRef.current = null
              }
            }
          }
        } catch (err) {
          // Silently fail progress polling
          console.error("Failed to poll progress:", err)
        }
      }

      // Start polling
      statusPollIntervalRef.current = setInterval(pollStatus, 2000) // Poll status every 2 seconds
      progressPollIntervalRef.current = setInterval(pollProgress, 2000) // Poll progress every 2 seconds

      // Initial poll
      pollStatus()
      pollProgress()

    } catch (err) {
      console.error("Evaluation failed:", err)
      stopPolling()
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
          const msg = "File is too large. Please upload a PDF smaller than 20MB."
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
      return
    }

    if (annotatedPdfUrl) {
      window.open(annotatedPdfUrl, "_blank")
    }
  }

  const resetEvaluation = () => {
    stopPolling()
    setFile(null)
    setResults(null)
    setAnnotatedPdfBlob(null)
    setAnnotatedPdfUrl(null)
    setError(null)
    setLoading(false)
    setLoadingStage("")
    setProgress(0)
    setJobId(null)
    setRequestId(null)
    setJobStatus(null)
    setProgressData(null)
    setIsOutlineMode(false)
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ""
    }
  }






  // Record an evaluation at submit time (per-subject + total counter).
  // Fire-and-forget: never blocks or breaks the evaluation flow.
  const recordEvalStat = (subjectId: string) => {
    if (!subjectId) return
    const label = getDisplayName(subjects.find(s => s.id === subjectId)?.display_name || subjectId)
    fetch("/api/eval-stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: subjectId, label }),
    })
      .then(() => {
        if (typeof window !== "undefined") window.dispatchEvent(new Event("evalStatRecorded"))
      })
      .catch(() => {})
  }

  // ---- Bulk evaluation handlers ----
  const updateBulkItem = (index: number, patch: Partial<BulkItem>) => {
    setBulkItems(prev => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  }

  const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || [])
    const pdfs = picked.filter(f => f.type === "application/pdf")
    if (picked.length !== pdfs.length) {
      setError("Only PDF files are allowed — non-PDF files were skipped.")
    } else {
      setError(null)
    }
    if (pdfs.length > MAX_BULK) {
      setError(`You can evaluate up to ${MAX_BULK} PDFs at once. Only the first ${MAX_BULK} were kept.`)
      setBulkFiles(pdfs.slice(0, MAX_BULK))
    } else {
      setBulkFiles(pdfs)
    }
    setBulkItems([])
  }

  const resolveBulkMode = (): "essay" | "outline" | "precis" | "regular" => {
    if (isPrecisSubject(subject)) return "precis"
    if (isEnglishEssaySubject(subject)) return isOutlineMode ? "outline" : "essay"
    return "regular"
  }

  const processOneBulk = async (
    file: File,
    index: number,
    mode: "essay" | "outline" | "precis" | "regular"
  ) => {
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
    updateBulkItem(index, { status: "processing" })
    try {
      let bulkJobId: string
      if (mode === "essay") bulkJobId = (await submitEssayJob(file, user.id)).jobId
      else if (mode === "outline") bulkJobId = (await submitOutlineJob(file, user.id)).jobId
      else if (mode === "precis") bulkJobId = (await submitPrecisJob(file, user.id)).jobId
      else bulkJobId = (await submitOCRJob(file, user.id, subject)).jobId

      recordEvalStat(subject) // count each bulk file at submit

      // Poll until a terminal state (safety cap ~10 min at 3s intervals).
      for (let attempt = 0; attempt < 200; attempt++) {
        await sleep(3000)
        const raw = mode === "essay"
          ? await getEssayJobStatus(bulkJobId)
          : mode === "outline"
          ? await getOutlineJobStatus(bulkJobId)
          : mode === "precis"
          ? await getPrecisJobStatus(bulkJobId)
          : await getJobStatus(bulkJobId)
        if (!raw) continue
        const s = ((raw as any).status || raw) as string
        if (s === "completed") {
          if (mode === "regular") {
            const { pdfBlob, metadata } = await getJobResult(bulkJobId)
            const url = URL.createObjectURL(pdfBlob)
            const total = metadata?.score?.total_score
            const max = metadata?.score?.max_score
            const scoreText = total != null ? `${total}/${max ?? 20}` : undefined
            updateBulkItem(index, { status: "completed", downloadUrl: url, scoreText })
          } else {
            const data = mode === "essay"
              ? await getEssayJobResult(bulkJobId)
              : mode === "outline"
              ? await getOutlineJobResult(bulkJobId)
              : await getPrecisJobResult(bulkJobId)
            updateBulkItem(index, { status: "completed", downloadUrl: data.annotated_pdf_url })
          }
          return
        }
        if (s === "failed") {
          updateBulkItem(index, { status: "failed", error: (raw as any).error || "Evaluation failed" })
          return
        }
        if (s === "cancelled") {
          updateBulkItem(index, { status: "failed", error: "Cancelled" })
          return
        }
      }
      updateBulkItem(index, { status: "failed", error: "Timed out" })
    } catch (e) {
      updateBulkItem(index, { status: "failed", error: e instanceof Error ? e.message : "Error" })
    }
  }

  const handleBulkEvaluate = async () => {
    if (!exam) { setError("Please select an exam"); return }
    if (!subject) { setError("Please select a subject"); return }
    if (bulkFiles.length === 0) { setError(`Please choose up to ${MAX_BULK} PDF files`); return }
    setError(null)
    setBulkRunning(true)
    const mode = resolveBulkMode()
    setBulkItems(bulkFiles.map(f => ({ name: f.name, status: "queued" as const })))
    const CONCURRENCY = 3
    let cursor = 0
    const worker = async () => {
      while (cursor < bulkFiles.length) {
        const i = cursor++
        await processOneBulk(bulkFiles[i], i, mode)
      }
    }
    try {
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, bulkFiles.length) }, () => worker())
      )
    } finally {
      setBulkRunning(false)
    }
  }

  return (
    <>
      <Card className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl overflow-hidden">
        <CardContent className="p-8 space-y-6">
          {/* Single vs Bulk toggle */}
          <div className="flex items-center gap-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1 w-full max-w-xs mx-auto">
            <button
              type="button"
              onClick={() => setBulkMode(false)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${!bulkMode ? "bg-white dark:bg-zinc-900 text-red-600 shadow" : "text-zinc-500 dark:text-zinc-400"}`}
            >
              Single
            </button>
            <button
              type="button"
              onClick={() => setBulkMode(true)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${bulkMode ? "bg-white dark:bg-zinc-900 text-red-600 shadow" : "text-zinc-500 dark:text-zinc-400"}`}
            >
              Bulk (up to {MAX_BULK})
            </button>
          </div>

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
              <button
                onClick={() => setShowGuidelines(true)}
                className="text-xs text-red-600 font-medium cursor-pointer hover:underline"
              >
                Document Guidelines
              </button>
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
              onChange={(e) => {
                setSubject(e.target.value)
                setIsEssay(isEnglishEssaySubject(e.target.value))
                setIsPrecis(isPrecisSubject(e.target.value))
                setIsOutlineMode(false)
              }}
              disabled={loadingSubjects || !exam}
              className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#2E5C55]/20 dark:focus:ring-[#4ade80]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exam ? renderSubjectOptions() : <option value="">Select an exam first</option>}
            </select>
          </div>

          {!bulkMode && (
          <>
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
                    <p className="text-xs text-zinc-500 mb-4">or click to browse (Max 20MB)</p>
                    <span className="inline-block px-4 py-2 border border-red-600 text-red-600 dark:border-red-500 dark:text-red-400 rounded-lg text-sm font-medium">
                      Choose File
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          {isEssay ? (
            /* Essay Mode - Two Buttons: Full Essay + Outline Only */
            <div className="space-y-3">
              <Button
                onClick={() => handleEvaluate("essay")}
                disabled={!file || !user || loading || (!subject || !exam)}
                className="w-full py-6 text-lg font-bold bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-xl shadow-lg shadow-red-600/20 dark:shadow-red-500/20 transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading && !isOutlineMode ? "Evaluating..." : "Complete Essay Analysis"}
              </Button>
              
              <Button
                onClick={() => handleEvaluate("outline")}
                disabled={!file || !user || loading || (!subject || !exam)}
                className="w-full py-6 text-lg font-bold bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700 text-white rounded-xl shadow-lg shadow-amber-600/20 dark:shadow-amber-500/20 transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading && isOutlineMode ? "Evaluating Outline..." : "Outline Only"}
              </Button>
            </div>
          ) : isPrecis ? (
            /* Precis Mode - Single Button */
            <Button
              onClick={() => handleEvaluate("precis")}
              disabled={!file || !user || loading || (!subject || !exam)}
              className="w-full py-6 text-lg font-bold bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-xl shadow-lg shadow-red-600/20 dark:shadow-red-500/20 transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Evaluating Precis..." : "Analyze Precis"}
            </Button>
          ) : (
            /* Regular Subject Mode - Single Button */
            <Button
              onClick={() => handleEvaluate("regular")}
              disabled={!file || !user || loading || (!subject || !exam)}
              className="w-full py-6 text-lg font-bold bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-xl shadow-lg shadow-red-600/20 dark:shadow-red-500/20 transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Evaluating..." : "Analyze"}
            </Button>
          )}
          </>
          )}

          {/* Bulk upload + per-file results */}
          {bulkMode && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Upload PDFs (up to {MAX_BULK})</label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={handleBulkFileChange}
                    disabled={bulkRunning}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                  />
                  <div className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-red-600/10 text-red-600 dark:bg-red-500/10 dark:text-red-400">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                      {bulkFiles.length > 0
                        ? `${bulkFiles.length} file${bulkFiles.length > 1 ? "s" : ""} selected`
                        : "Drag & drop or click to browse"}
                    </p>
                    <p className="text-xs text-zinc-500">Select up to {MAX_BULK} PDFs (max 20MB each)</p>
                  </div>
                </div>
              </div>

              {bulkFiles.length > 0 && bulkItems.length === 0 && (
                <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1 max-h-40 overflow-auto pl-1">
                  {bulkFiles.map((f, i) => (
                    <li key={i} className="truncate">
                      • {f.name} <span className="text-xs text-zinc-400">({(f.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </li>
                  ))}
                </ul>
              )}

              <Button
                onClick={handleBulkEvaluate}
                disabled={bulkRunning || bulkFiles.length === 0 || !subject || !exam}
                className="w-full py-6 text-lg font-bold bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-xl shadow-lg shadow-red-600/20 dark:shadow-red-500/20 transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {bulkRunning
                  ? "Evaluating…"
                  : `Evaluate ${bulkFiles.length || ""} PDF${bulkFiles.length === 1 ? "" : "s"}`}
              </Button>

              {bulkItems.length > 0 && (
                <div className="space-y-1 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
                  {bulkItems.map((it, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">{it.name}</p>
                        <p className="text-xs">
                          {it.status === "queued" && <span className="text-zinc-500">Queued…</span>}
                          {it.status === "processing" && <span className="text-amber-600 dark:text-amber-400">Processing…</span>}
                          {it.status === "completed" && (
                            <span className="text-green-600 dark:text-green-400">
                              Completed{it.scoreText ? ` · ${it.scoreText}` : ""}
                            </span>
                          )}
                          {it.status === "failed" && (
                            <span className="text-red-600 dark:text-red-400">Failed{it.error ? `: ${it.error}` : ""}</span>
                          )}
                        </p>
                      </div>
                      {it.status === "completed" && it.downloadUrl && (
                        <a
                          href={it.downloadUrl}
                          download={it.name.replace(/\.pdf$/i, "") + "-report.pdf"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 inline-flex items-center rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-2"
                        >
                          Download
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Progress Indicator */}
          {loading && (
            <div className="space-y-3 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-900 dark:text-white">{loadingStage}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">{progress}%</span>
                  {jobId && (
                    <button
                      onClick={handleCancel}
                      className="p-1 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title="Cancel job"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full bg-red-600 dark:bg-red-500 transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              
              {/* Progress Details */}
              {progressData && (
                <div className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                  {progressData.details?.pages_completed !== undefined && 
                   progressData.details?.total_pages !== undefined && (
                    <div className="flex items-center justify-between">
                      <span>OCR Progress:</span>
                      <span className="font-medium">
                        {progressData.details.pages_completed} / {progressData.details.total_pages} pages
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span>Current Step:</span>
                    <span className="font-medium">
                      {progressData.step_number} / {progressData.total_steps}
                    </span>
                  </div>
                </div>
              )}
              
              {jobStatus && jobStatus.status === "running" && (
                <p className="text-xs text-zinc-600 dark:text-zinc-400 text-center">
                  <span className="font-medium">
                    {isOutlineMode ? "Your outline is being checked..." : "Processing in background..."}
                  </span><br />
                  {jobId && (
                    <>
                      Job ID: <span className="font-mono text-xs">{jobId}</span><br />
                    </>
                  )}
                  {isOutlineMode
                    ? "Please wait while we prepare your report. You can keep this page open or come back later."
                    : "You can close this page and check back later. The job will continue processing."}
                </p>
              )}
              {(!jobStatus || jobStatus.status === "pending") && (
                <p className="text-xs text-zinc-600 dark:text-zinc-400 text-center">
                  <span className="font-medium">
                    {isOutlineMode ? "Setting things up for your outline..." : "Starting processing..."}
                  </span><br />
                  {isOutlineMode
                    ? "This usually takes a few minutes."
                    : <>
                        Depending on document size and complexity, this may take <span className="font-semibold text-red-600 dark:text-red-400">3-4 minutes</span>.
                      </>}
                </p>
              )}
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
          {(annotatedPdfBlob || annotatedPdfUrl) && (
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

      {/* Document Guidelines Modal */}
      {showGuidelines && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pt-36 pb-10 bg-black/60 backdrop-blur-sm">
          <div className="relative max-w-lg w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col shadow-black/20 max-h-full">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center sticky top-0 bg-white dark:bg-zinc-900 z-10 shrink-0">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Document Guidelines</h3>
              <button
                onClick={() => setShowGuidelines(false)}
                className="p-2 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white rounded-full transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="p-8 space-y-8 overflow-y-auto">
              <p className="text-zinc-600 dark:text-zinc-400">
                Follow these guidelines to ensure optimal scanning quality and accurate evaluation results.
              </p>

              <div>
                <h4 className="text-lg font-bold mb-3 flex items-center gap-2 text-zinc-900 dark:text-red-400">
                  <span className="w-1 h-6 bg-red-600 rounded-full"></span>
                  Document Structure
                </h4>
                <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300 pl-4 list-disc marker:text-red-500">
                  <li>Begin your response by writing the question statement at the top</li>
                  <li>Start the response with the Introduction heading</li>
                  <li>Number every heading and subheading</li>
                  <li>Leave proper margins on all sides</li>
                  <li>Do not upload checked, marked, or annotated papers</li>
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-bold mb-3 flex items-center gap-2 text-zinc-900 dark:text-red-400">
                  <span className="w-1 h-6 bg-red-600 rounded-full"></span>
                  Scanning Quality
                </h4>
                <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300 pl-4 list-disc marker:text-red-500">
                  <li>Scan documents at high resolution</li>
                  <li>Ensure good lighting with no shadows on the page</li>
                  <li>Keep pages flat and aligned during scanning</li>
                  <li>Use black or blue ink for better text recognition</li>
                  <li>Avoid crumpled or damaged pages</li>
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-bold mb-3 flex items-center gap-2 text-zinc-900 dark:text-red-400">
                  <span className="w-1 h-6 bg-red-600 rounded-full"></span>
                  Best Practices
                </h4>
                <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300 pl-4 list-disc marker:text-red-500">
                  <li>Write legibly with consistent spacing between words</li>
                  <li>Avoid excessive strike-throughs or corrections</li>
                  <li>Save as PDF format (not images) for best results</li>
                  <li>Keep file size under 20MB for faster processing</li>
                </ul>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex justify-end">
              <Button onClick={() => setShowGuidelines(false)} className="bg-red-600 hover:bg-red-700 text-white">
                Understood
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
