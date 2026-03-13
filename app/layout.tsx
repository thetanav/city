import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "@/components/providers";
import NextTopLoader from "nextjs-toploader";
import { AnchoredToastProvider, ToastProvider } from "@/components/ui/toast";

import { AnimatePresence, motion } from "framer-motion";

export const metadata: Metadata = {
  title: "City",
  description: "Modern event platform",
  openGraph: {
    type: "website",
    siteName: "City",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "City - Modern event platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-background">
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange>
            <ToastProvider>
              <AnchoredToastProvider>
                <NextTopLoader showSpinner={false} />
                <Navbar />
                <main className="max-w-5xl h-full mx-auto px-4 sm:px-6 lg:px-8">
                  {children}
                </main>
              </AnchoredToastProvider>
            </ToastProvider>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
