import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with VytalWatch AI. Reach our sales, support, or partnership teams. Schedule a demo, request a quote, or ask about our AI-powered remote patient monitoring platform.",
  openGraph: {
    title: "Contact VytalWatch AI - Sales, Support & Partnerships",
    description:
      "Have questions about remote patient monitoring? Contact our team for demos, pricing, technical support, or partnership opportunities.",
    url: "https://vytalwatch.com/contact",
    type: "website",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
