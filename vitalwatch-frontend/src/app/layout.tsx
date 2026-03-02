import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers/Providers";
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
    default: "VytalWatch AI - AI-Powered Remote Patient Monitoring",
    template: "%s | VytalWatch AI",
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/logo.png",
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
  authors: [{ name: "VytalWatch AI" }],
  openGraph: {
    title: "VytalWatch AI - AI-Powered Remote Patient Monitoring",
    description:
      "Reduce readmissions by 40% with AI-powered remote patient monitoring.",
    type: "website",
    locale: "en_US",
    siteName: "VytalWatch AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "VytalWatch AI - AI-Powered Remote Patient Monitoring",
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
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": "https://vytalwatch.com/#organization",
                  name: "VytalWatch AI",
                  url: "https://vytalwatch.com",
                  logo: {
                    "@type": "ImageObject",
                    url: "https://vytalwatch.com/logo.png",
                  },
                  description:
                    "AI-powered remote patient monitoring platform that reduces hospital readmissions by 40%, improves patient outcomes, and generates sustainable RPM revenue.",
                  foundingDate: "2020",
                  address: {
                    "@type": "PostalAddress",
                    streetAddress: "123 Healthcare Ave",
                    addressLocality: "San Francisco",
                    addressRegion: "CA",
                    postalCode: "94102",
                    addressCountry: "US",
                  },
                  contactPoint: [
                    {
                      "@type": "ContactPoint",
                      telephone: "+1-800-848-2524",
                      contactType: "sales",
                      availableLanguage: "English",
                    },
                    {
                      "@type": "ContactPoint",
                      telephone: "+1-800-848-2524",
                      contactType: "customer support",
                      availableLanguage: "English",
                    },
                  ],
                  sameAs: [
                    "https://www.linkedin.com/company/vytalwatch",
                    "https://twitter.com/vytalwatch",
                  ],
                },
                {
                  "@type": "MedicalBusiness",
                  "@id": "https://vytalwatch.com/#medicalbusiness",
                  name: "VytalWatch AI",
                  url: "https://vytalwatch.com",
                  description:
                    "HIPAA-compliant, SOC 2 Type II certified remote patient monitoring platform powered by artificial intelligence. Serving 150+ healthcare organizations and monitoring 500K+ patients.",
                  medicalSpecialty: [
                    "Remote Patient Monitoring",
                    "Telehealth",
                    "Digital Health",
                    "Chronic Disease Management",
                  ],
                  address: {
                    "@type": "PostalAddress",
                    streetAddress: "123 Healthcare Ave",
                    addressLocality: "San Francisco",
                    addressRegion: "CA",
                    postalCode: "94102",
                    addressCountry: "US",
                  },
                  telephone: "+1-800-848-2524",
                  email: "hello@vytalwatch.ai",
                  openingHours: "Mo-Fr 08:00-18:00",
                  isAcceptingNewPatients: true,
                },
                {
                  "@type": "WebSite",
                  "@id": "https://vytalwatch.com/#website",
                  url: "https://vytalwatch.com",
                  name: "VytalWatch AI",
                  publisher: {
                    "@id": "https://vytalwatch.com/#organization",
                  },
                },
              ],
            }),
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
