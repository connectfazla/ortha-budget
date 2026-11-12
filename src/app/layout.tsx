import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const mono = Geist_Mono({ variable: "--font-mono-ui", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Ortha Budget", template: "%s · Ortha Budget" },
  description: "Mobile-first budget tracker for agencies: subscriptions, lifetime deals, contractors and expenses.",
  appleWebApp: { capable: true, title: "Budget", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0d0f" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${mono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <ClerkProvider
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          appearance={{ theme: shadcn, variables: { fontFamily: "var(--font-mono-ui)", borderRadius: "0.375rem" } }}
        >
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            {children}
            <Toaster position="top-center" />
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
