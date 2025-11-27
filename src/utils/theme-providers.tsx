import { ThemeProvider } from "next-themes";

export function ThemeProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider 
      attribute="class" 
      defaultTheme="light"
      enableSystem={false}
      storageKey="insight-llm-theme"
    >
    {children}
    </ThemeProvider>
  );
}

