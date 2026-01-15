import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "VitalWatch AI - AI-Powered Remote Patient Monitoring",
    template: "%s | VitalWatch AI",
  },
  description:
    "AI-powered remote patient monitoring platform that reduces hospital readmissions by 40%, improves patient outcomes, and generates sustainable RPM revenue.",
  keywords: [
    "remote patient monitoring",
    "RPM",
    "healthcare AI",
    "patient monitoring",
    "vital signs",
    "telehealth",
    "HIPAA compliant",
  ],
  authors: [{ name: "VitalWatch AI" }],
  openGraph: {
    title: "VitalWatch AI - AI-Powered Remote Patient Monitoring",
    description:
      "Reduce readmissions by 40% with AI-powered remote patient monitoring.",
    type: "website",
    locale: "en_US",
    siteName: "VitalWatch AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "VitalWatch AI - AI-Powered Remote Patient Monitoring",
    description:
      "Reduce readmissions by 40% with AI-powered remote patient monitoring.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
