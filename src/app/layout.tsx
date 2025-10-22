import type { Metadata } from "next";
import "./globals.css";
import { ThemeProviders } from "@/utils/theme-providers";
import ErrorBoundary from '@/components/ErrorBoundary';
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";


export const metadata: Metadata = {
  title: "Insight LLM",
  description: "An intelligent AI assistant built with Next.js for seamless conversations",
  keywords: ["AI", "assistant", "LLM", "Insight", "Next.js", "Chat", "Intelligence"],
  authors: [{ name: "Your Name" }],
  creator: "Your Name or Company",
  publisher: "Your Name or Company",
  openGraph: {
    title: "Insight LLM",
    description: "An advanced AI assistant built with Next.js, featuring enhanced functionalities and faster response times.",
    url: "https://insight-llm.vercel.app",
    siteName: "Insight LLM",
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
    title: "Insight LLM",
    description: "Experience the power of AI with our intelligent assistant",
    creator: "@yourTwitterHandle",
    images: ["/assets/insight-banner.png"],
  },
};


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
      <html lang="en" className="dark" suppressHydrationWarning>
        <body
          className="bg-background text-foreground h-dvh w-full overflow-auto"
        >
          <ErrorBoundary>
            <ThemeProviders>{children}</ThemeProviders>
          </ErrorBoundary>
        </body>
      </html>
    </ClerkProvider>
  );
}

