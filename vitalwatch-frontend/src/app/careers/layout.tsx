import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Careers",
  description:
    "Join VytalWatch AI and help transform healthcare. Explore open positions in engineering, data science, product, compliance, and customer success. Remote-first culture with great benefits.",
  openGraph: {
    title: "Careers at VytalWatch AI - Join Our Mission to Transform Healthcare",
    description:
      "We're hiring! Explore open roles in engineering, data science, product management, and more. Remote-first with competitive benefits.",
    url: "https://vytalwatch.com/careers",
    type: "website",
  },
};

export default function CareersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
