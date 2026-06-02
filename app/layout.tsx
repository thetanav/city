import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "@/components/providers";
import NextTopLoader from "nextjs-toploader";
import { AnchoredToastProvider, ToastProvider } from "@/components/ui/toast";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "City",
    template: "%s | City",
  },
  description:
    "City helps hosts launch, sell, and run memorable events without the usual operational clutter.",
  openGraph: {
    type: "website",
    siteName: "City",
    title: "City",
    description: "Publish events, sell tickets, and run the room from one polished workflow.",
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
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen bg-background antialiased">
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ToastProvider>
              <AnchoredToastProvider>
                <NextTopLoader color="#09090b" shadow={false} showSpinner={false} />
                <div className="flex min-h-screen flex-col">
                  <Navbar />
                  <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
                    <div className="mx-auto w-full max-w-6xl">{children}</div>
                  </main>
                </div>
              </AnchoredToastProvider>
            </ToastProvider>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
