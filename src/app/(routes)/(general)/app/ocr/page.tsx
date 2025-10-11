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
          <h1 className="text-balance text-3xl md:text-4xl font-semibold text-foreground mb-3">
            Document OCR Analysis
          </h1>
          <p className="text-pretty text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Upload your PDF documents to get AI-powered writing analysis, grammar insights, and annotated feedback
            highlighting key issues and improvements.
          </p>
        </header>

        {/* Uploader */}
        <OCRUpload />

        {/* How it works */}
        <section className="mt-12">
          <Card className="bg-card border-border/60 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-foreground text-xl">How it works</CardTitle>
              <CardDescription className="text-muted-foreground">
                A streamlined flow for fast, clear results.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-muted/30 border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-foreground">Upload PDF</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Select any PDF document (up to 10MB). We securely extract text for analysis.
                  </CardContent>
                </Card>
                <Card className="bg-muted/30 border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-foreground">AI Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    The AI reviews writing quality, clarity, and grammar, producing focused feedback.
                  </CardContent>
                </Card>
                <Card className="bg-muted/30 border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-foreground">Detailed Results</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    View a structured report with issues, impact ratings, and guidance to improve.
                  </CardContent>
                </Card>
                <Card className="bg-muted/30 border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-foreground">Annotated PDF</CardTitle>
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
