"use client"

import type React from "react"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { annotateDocument, analyzeDocument, type OCRResult } from "@/utils/ocr-api"
import { AiOutlineFileText } from "react-icons/ai"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

interface OCRUploadProps {
  onResults?: (results: OCRResult) => void
  onAnnotatedPDF?: (pdfUrl: string) => void
}

export default function OCRUpload({ onResults, onAnnotatedPDF }: OCRUploadProps) {
  const { user } = useUser()
  const [file, setFile] = useState<File | null>(null)
  const [question, setQuestion] = useState("")
  const [subject, setSubject] = useState("political_science")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<OCRResult | null>(null)
  const [annotatedPdfBlob, setAnnotatedPdfBlob] = useState<Blob | null>(null)

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

  const handleQuestionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuestion(e.target.value)
    setError(null)
    setResults(null)
    setAnnotatedPdfBlob(null)
  }

  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSubject(e.target.value)
    setError(null)
    setResults(null)
    setAnnotatedPdfBlob(null)
  }

  const handleAnalyze = async () => {
    if (!file || !user) return
    const trimmedQuestion = question.trim()
    if (!trimmedQuestion) {
      setError("Please enter a question to evaluate the document against")
      return
    }
    if (!subject) {
      setError("Please select a subject before analyzing")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const analysisResults = await analyzeDocument(file, user.id, trimmedQuestion, subject)
      setResults(analysisResults)
      onResults?.(analysisResults)
    } catch (err) {
      console.error("Analysis failed:", err)
      setError(err instanceof Error ? err.message : "Analysis failed")
    } finally {
      setLoading(false)
    }
  }

  const handleAnnotate = async () => {
    if (!file || !user) return
    const trimmedQuestion = question.trim()
    if (!trimmedQuestion) {
      setError("Please enter a question before generating an annotated PDF")
      return
    }
    if (!subject) {
      setError("Please select a subject before generating an annotated PDF")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const annotatedBlob = await annotateDocument(file, user.id, trimmedQuestion, subject)
      setAnnotatedPdfBlob(annotatedBlob)
      const analysisResults = await analyzeDocument(file, user.id, trimmedQuestion, subject)
      setResults(analysisResults)
      onResults?.(analysisResults)
      const url = URL.createObjectURL(annotatedBlob)
      onAnnotatedPDF?.(url)
    } catch (err) {
      console.error("Annotation failed:", err)
      setError(err instanceof Error ? err.message : "Annotation failed")
    } finally {
      setLoading(false)
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

          {/* Question Input */}
          <div className="space-y-2">
            <label htmlFor="ocr-question" className="block text-sm font-medium text-foreground">
              Question to evaluate
            </label>
            <textarea
              id="ocr-question"
              value={question}
              onChange={handleQuestionChange}
              placeholder="Enter the question that the document answers"
              className="min-h-[96px] w-full rounded-2xl border border-border/70 bg-background/70 p-3 text-sm text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <p className="text-xs text-muted-foreground">
              The question text will be stripped from the OCR output before analysis so only the answer is evaluated.
            </p>
          </div>

          {/* Subject Selection */}
          <div className="space-y-2">
            <label htmlFor="ocr-subject" className="block text-sm font-medium text-foreground">
              Subject
            </label>
            <select
              id="ocr-subject"
              value={subject}
              onChange={handleSubjectChange}
              className="w-full rounded-2xl border border-border/70 bg-background/70 p-3 text-sm text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="political_science">Political Science (CSS)</option>
            </select>
            <p className="text-xs text-muted-foreground">
              Political Science uses the CSS marking scheme with detailed criteria for relevance, theory, analysis, structure, and evidence.
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Button
              onClick={handleAnalyze}
              disabled={!file || !user || !question.trim() || loading}
              className="w-full bg-transparent"
              variant="outline"
            >
              {loading ? "Analyzing..." : "Analyze Only"}
            </Button>
            <Button onClick={handleAnnotate} disabled={!file || !user || !question.trim() || loading} className="w-full">
              {loading ? "Processing..." : "Analyze & Annotate"}
            </Button>
          </div>

          {/* Error */}
          {error && (
            <Alert variant="destructive" className="border-destructive/40">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Annotated PDF ready */}
          {annotatedPdfBlob && (
            <Alert className="border-border bg-secondary/40">
              <AlertTitle className="text-foreground">Annotated PDF is ready</AlertTitle>
              <AlertDescription className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <span className="text-muted-foreground">You can download the annotated document now.</span>
                <Button onClick={downloadAnnotatedPDF} className="w-full md:w-auto">
                  Download Annotated PDF
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {results && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
                <h3 className="text-lg font-medium text-foreground">Analysis Results</h3>
                <div className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                  <div className="rounded-xl bg-muted/40 p-3">
                    <div className="text-muted-foreground">Overall Score</div>
                    <div className="text-foreground text-lg font-semibold">
                      {results.score?.total_score || 0} / {results.score?.max_possible_score || 0}
                    </div>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-3">
                    <div className="text-muted-foreground">Pages</div>
                    <div className="text-foreground text-lg font-semibold">{results.metadata?.page_count || 0}</div>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-3">
                    <div className="text-muted-foreground">Processing Time</div>
                    <div className="text-foreground text-lg font-semibold">
                      {(results.metadata?.processing_time_seconds?.toFixed(2) || 0) + "s"}
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  File: {results.metadata?.file_name || "Unknown"}
                </div>
                {results.metadata?.provided_question && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Question: {results.metadata.provided_question}
                  </div>
                )}
                {results.metadata?.subject && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Subject: {results.metadata.subject.label}
                  </div>
                )}
                {typeof results.metadata?.question_occurrences_removed === "number" && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Removed question instances in OCR text: {results.metadata.question_occurrences_removed}
                  </div>
                )}
                {results.metadata?.scoring_profile && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Scoring breakdown: Content /{results.metadata.scoring_profile.content_max} + Writing /
                    {results.metadata.scoring_profile.writing_max} → Total /
                    {results.metadata.scoring_profile.total_max}
                  </div>
                )}
              </div>

              {results.issues && results.issues.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-base font-semibold text-foreground">Issues Found ({results.issues.length})</h4>

                  <div className="grid grid-cols-1 gap-3">
                    {results.issues.map((issue) => {
                      const severity = issue.impact_points_0to3 || 0
                      const severityBadgeClass =
                        severity >= 3
                          ? "bg-destructive/15 text-destructive-foreground"
                          : severity >= 2
                            ? "bg-accent text-accent-foreground"
                            : "bg-secondary text-secondary-foreground"

                      return (
                        <div
                          key={issue.issue_id || Math.random()}
                          className="rounded-2xl border border-border/60 bg-card/60 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h5 className="text-foreground font-medium">{issue.issue_title || "Untitled Issue"}</h5>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {issue.why_it_matters || "No description available"}
                              </p>
                            </div>
                            <Badge className={`shrink-0 ${severityBadgeClass}`} variant="outline">
                              Impact: {severity}/3
                            </Badge>
                          </div>

                          <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                            <p>
                              <span className="text-foreground font-medium">How to verify:</span>{" "}
                              {issue.how_to_verify || "Not specified"}
                            </p>
                            <p>
                              <span className="text-foreground font-medium">Location:</span>{" "}
                              {issue.location_hint || "Not specified"}
                            </p>
                            {issue.evidence_suggestions && issue.evidence_suggestions.length > 0 && (
                              <div className="mt-2">
                                <span className="text-foreground font-medium">Evidence suggestions:</span>
                                <ul className="mt-1 list-inside list-disc space-y-0.5">
                                  {issue.evidence_suggestions.map((suggestion, idx) => (
                                    <li key={idx} className="text-muted-foreground">
                                      {suggestion}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
