import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { ThemeProviders } from "@/utils/theme-providers";
import ErrorBoundary from '@/components/ErrorBoundary';
import { ClerkProvider } from "@clerk/nextjs";
import EnsureSupabaseUser from "@/components/EnsureSupabaseUser";
import NavigationWrapper from "@/components/NavigationWrapper";
import Footer from "@/components/Footer";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: "Rubric AI",
  description: "AI-powered essay evaluation and feedback for CSS exam preparation",
  keywords: ["AI", "essay evaluation", "CSS", "Rubric", "exam preparation", "feedback", "grading"],
  authors: [{ name: "Rubric AI" }],
  creator: "Rubric AI",
  publisher: "Rubric AI",
  openGraph: {
    title: "Rubric AI",
    description: "AI-powered essay evaluation and feedback for CSS exam preparation",
    url: "https://insight-llm.vercel.app",
    siteName: "Rubric AI",
    images: [
      {
        url: "/assets/insight-banner.png",
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Rubric AI",
    description: "AI-powered essay evaluation and feedback for CSS exam preparation",
    creator: "@yourTwitterHandle",
    images: ["/assets/insight-banner.png"],
  },
};


export const dynamic = 'force-dynamic';


export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
} as const;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${outfit.className} bg-background text-foreground h-dvh w-full overflow-auto selection:bg-blue-100 dark:selection:bg-blue-900`}
        >
          <ErrorBoundary>
            <ThemeProviders>
              <EnsureSupabaseUser />
              <NavigationWrapper />
              {children}
            </ThemeProviders>
          </ErrorBoundary>
        </body>
      </html>
    </ClerkProvider>
  );
}
