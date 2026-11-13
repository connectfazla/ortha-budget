import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const sans = Geist({ variable: "--font-sans-ui", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono-ui", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Budget Ortha", template: "%s · Budget Ortha" },
  description: "Mobile-first budget tracker for agencies: subscriptions, lifetime deals, contractors and expenses.",
  appleWebApp: { capable: true, title: "Budget", statusBarStyle: "default" },
  // Next 16 renders appleWebApp.capable as the generic mobile-web-app-capable; older iOS only reads the apple- name.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0c0e" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full">
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            {children}
            <Toaster />
          </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
