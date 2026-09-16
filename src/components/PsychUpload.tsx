"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { Upload, X, FileText, Download, Loader2 } from "lucide-react"
import {
  submitPsychJob,
  getPsychJobStatus,
  getPsychProgress,
  getPsychJobResult,
  type PsychMetadata,
} from "@/utils/psych-api"

export default function PsychUpload() {
  const { user } = useUser()
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ pct: number; message: string } | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [downloadName, setDownloadName] = useState("psychological_assessment_report.pdf")
  const [meta, setMeta] = useState<PsychMetadata | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pickFile = (f: File | null) => {
    setError(null)
    if (!f) return
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF file.")
      return
    }
    if (f.size > 20 * 1024 * 1024) {
      setError("File is larger than 20 MB.")
      return
    }
    setFile(f)
    setDownloadUrl(null)
    setMeta(null)
  }

  const reset = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    setFile(null)
    setBusy(false)
    setProgress(null)
    setError(null)
    setDownloadUrl(null)
    setMeta(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  const startPolling = (jobId: string, requestId: string) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const [status, prog] = await Promise.all([
          getPsychJobStatus(jobId),
          getPsychProgress(requestId),
        ])
        if (prog) setProgress({ pct: prog.progress_percent, message: prog.message || prog.step })
        if (!status) return
        if (status.status === "completed") {
          if (pollRef.current) clearInterval(pollRef.current)
          const { pdfBlob, metadata, filename } = await getPsychJobResult(jobId)
          const url = URL.createObjectURL(pdfBlob)
          setDownloadUrl(url)
          setDownloadName(filename)
          setMeta(metadata)
          setProgress({ pct: 100, message: "Report ready" })
          setBusy(false)
        } else if (status.status === "failed" || status.status === "cancelled") {
          if (pollRef.current) clearInterval(pollRef.current)
          setError(status.error || "Evaluation failed. Please try again.")
          setBusy(false)
        }
      } catch (e: any) {
        // transient poll errors are ignored; keep polling
      }
    }, 2500)
  }

  const handleEvaluate = async () => {
    if (!file) return
    if (!user?.id) {
      setError("Please sign in to evaluate.")
      return
    }
    setBusy(true)
    setError(null)
    setDownloadUrl(null)
    setMeta(null)
    setProgress({ pct: 2, message: "Uploading…" })
    try {
      const { jobId, requestId } = await submitPsychJob(file, user.id)
      setProgress({ pct: 5, message: "Queued for evaluation…" })
      startPolling(jobId, requestId)
    } catch (e: any) {
      setError(e?.message || "Could not start the evaluation.")
      setBusy(false)
    }
  }

  const iq = meta?.report?.iq
  const suit = meta?.report?.suitability

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-6 sm:p-8">
      <h3 className="font-serif text-2xl text-zinc-900 dark:text-zinc-100 mb-1">Upload the answer booklet</h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
        A scanned Psychological Assessment PDF (IQ, sentence completion, drawings, stories). Up to 20&nbsp;MB.
      </p>

      {/* Dropzone */}
      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          pickFile(e.dataTransfer.files?.[0] || null)
        }}
        className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/40 px-6 py-10 cursor-pointer hover:border-red-400 dark:hover:border-red-500 transition-colors"
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0] || null)}
        />
        {file ? (
          <div className="flex items-center gap-3 text-zinc-800 dark:text-zinc-100">
            <FileText className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="font-medium truncate max-w-[240px]">{file.name}</span>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); reset() }}
              className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
              aria-label="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 text-zinc-400" />
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Drag & drop or click to choose a PDF</span>
          </>
        )}
      </label>

      {error && (
        <div className="mt-4 rounded-lg border border-red-300 dark:border-red-800/70 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Progress */}
      {busy && progress && (
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {progress.message}
            </span>
            <span>{Math.round(progress.pct)}%</span>
          </div>
          <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-red-600 dark:bg-red-500 transition-all duration-500"
              style={{ width: `${Math.max(2, Math.min(100, progress.pct))}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-zinc-400">Evaluation takes a few minutes for a full booklet — you can keep this tab open.</p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={handleEvaluate}
          disabled={!file || busy}
          className="inline-flex items-center gap-2 rounded-xl bg-red-700 hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 transition-colors"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {busy ? "Evaluating…" : "Evaluate"}
        </button>
        {downloadUrl && (
          <a
            href={downloadUrl}
            download={downloadName}
            className="inline-flex items-center gap-2 rounded-xl border border-red-700 text-red-700 dark:text-red-400 dark:border-red-500 font-semibold px-5 py-2.5 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download report
          </a>
        )}
      </div>

      {/* Quick summary */}
      {meta?.report && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {iq && (iq.total ?? 0) > 0 && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">IQ (Objective)</p>
              <p className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">{iq.correct}/{iq.total} correct</p>
              {iq.weakest && <p className="text-xs text-red-700 dark:text-red-400">Weakest: {iq.weakest}</p>}
            </div>
          )}
          {suit?.label && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Suitability (screening aid)</p>
              <p className="mt-1 text-lg font-bold text-red-700 dark:text-red-400">{suit.label}</p>
              {suit.note && <p className="text-xs text-zinc-500 dark:text-zinc-400">{suit.note}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
