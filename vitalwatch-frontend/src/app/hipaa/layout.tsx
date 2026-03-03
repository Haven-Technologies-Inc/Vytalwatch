import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HIPAA Compliance",
  description:
    "VytalWatch AI is fully HIPAA compliant with SOC 2 Type II certification. Learn about our data encryption, access controls, audit logging, and security infrastructure protecting patient data.",
  openGraph: {
    title: "HIPAA Compliance & Security - VytalWatch AI",
    description:
      "AES-256 encryption, role-based access controls, comprehensive audit logging, and SOC 2 Type II certification. Your patients' data security is our top priority.",
    url: "https://vytalwatch.com/hipaa",
    type: "website",
  },
};

export default function HipaaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
