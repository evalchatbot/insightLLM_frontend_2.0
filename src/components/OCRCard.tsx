"use client"

import Link from "next/link"
import { AiOutlineFileText } from "react-icons/ai"

export default function OCRCard() {
  return (
    <Link href="/app/ocr" className="group block">
      <div className="relative rounded-2xl border border-border/60 bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/50 p-4 md:p-6 md:aspect-square transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-border">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-background/70 text-foreground/80 ring-1 ring-border/60 transition-transform duration-200 group-hover:scale-105">
            <AiOutlineFileText className="h-5 w-5" />
          </span>
          <h3 className="font-semibold tracking-tight text-card-foreground">Document OCR Analysis</h3>
        </div>

        <AiOutlineFileText
          aria-hidden
          className="pointer-events-none absolute bottom-3 right-3 h-8 w-8 rounded-full p-1 text-foreground/50 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </div>
    </Link>
  )
}
