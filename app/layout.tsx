import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "@/components/providers";
import NextTopLoader from "nextjs-toploader";

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
      <body className="antialiased">
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange>
            <NextTopLoader />
            <Navbar />
            <div className="min-h-screen max-w-5xl mx-auto">{children}</div>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
