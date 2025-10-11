import type { Metadata } from "next"
import OCRUpload from "@/components/OCRUpload"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Document OCR Analysis | Insight LLM",
  description: "Upload and analyze PDF documents with AI-powered OCR and writing issue detection",
}

export default function OCRPage() {
  return (
    <main className="min-h-dvh bg-background py-10">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <header className="mb-10 text-center">
          <h1 className="mb-3 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Document OCR Analysis
          </h1>
          <p className="mx-auto max-w-2xl text-pretty text-base text-muted-foreground md:text-lg">
            Upload your PDF documents to get AI-powered writing analysis, grammar insights, and annotated feedback
            highlighting key issues and improvements.
          </p>
        </header>

        {/* Uploader */}
        <OCRUpload />

        {/* How it works */}
        <section className="mt-12">
          <Card className="rounded-3xl border border-border/60 bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl text-foreground">How it works</CardTitle>
              <CardDescription className="text-muted-foreground">
                A streamlined flow for fast, clear results.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-border/60 bg-muted/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-background text-foreground ring-1 ring-border/60 text-xs font-medium">
                        1
                      </span>
                      <CardTitle className="text-base text-foreground">Upload PDF</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Select any PDF document (up to 10MB). We securely extract text for analysis.
                  </CardContent>
                </Card>

                <Card className="border-border/60 bg-muted/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-background text-foreground ring-1 ring-border/60 text-xs font-medium">
                        2
                      </span>
                      <CardTitle className="text-base text-foreground">AI Analysis</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    The AI reviews writing quality, clarity, and grammar, producing focused feedback.
                  </CardContent>
                </Card>

                <Card className="border-border/60 bg-muted/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-background text-foreground ring-1 ring-border/60 text-xs font-medium">
                        3
                      </span>
                      <CardTitle className="text-base text-foreground">Detailed Results</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    View a structured report with issues, impact ratings, and guidance to improve.
                  </CardContent>
                </Card>

                <Card className="border-border/60 bg-muted/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-background text-foreground ring-1 ring-border/60 text-xs font-medium">
                        4
                      </span>
                      <CardTitle className="text-base text-foreground">Annotated PDF</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Download an annotated PDF with highlights mapped directly to the original document.
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
