import type { Metadata } from "next";
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "VytalWatch AI Privacy Policy. Learn how we collect, use, and protect your personal and health information in compliance with HIPAA, GDPR, and applicable privacy laws.",
  openGraph: {
    title: "Privacy Policy - VytalWatch AI",
    description:
      "Our commitment to protecting your privacy. HIPAA and GDPR compliant data handling with AES-256 encryption and SOC 2 Type II certification.",
    url: "https://vytalwatch.com/privacy",
    type: "website",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <main className="py-20">
        <div className="container mx-auto max-w-4xl px-4">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Privacy Policy</h1>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Last updated: January 15, 2026</p>

          <div className="mt-12 space-y-8 text-gray-700 dark:text-gray-300">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">1. Introduction</h2>
              <p className="mt-4">
                VytalWatch AI (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our remote patient monitoring platform.
              </p>
              <p className="mt-2">
                We comply with the Health Insurance Portability and Accountability Act (HIPAA), the General Data Protection Regulation (GDPR), and other applicable privacy laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">2. Information We Collect</h2>
              <h3 className="mt-4 text-lg font-semibold">Personal Information</h3>
              <ul className="mt-2 list-disc pl-6 space-y-1">
                <li>Name, email address, phone number</li>
                <li>Date of birth and demographic information</li>
                <li>Healthcare provider information</li>
                <li>Insurance and billing information</li>
              </ul>
              <h3 className="mt-4 text-lg font-semibold">Health Information (PHI)</h3>
              <ul className="mt-2 list-disc pl-6 space-y-1">
                <li>Vital signs (blood pressure, glucose, weight, etc.)</li>
                <li>Medical history and conditions</li>
                <li>Medication information</li>
                <li>Care plans and treatment notes</li>
              </ul>
              <h3 className="mt-4 text-lg font-semibold">Technical Information</h3>
              <ul className="mt-2 list-disc pl-6 space-y-1">
                <li>Device information and identifiers</li>
                <li>IP address and browser type</li>
                <li>Usage data and analytics</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">3. How We Use Your Information</h2>
              <ul className="mt-4 list-disc pl-6 space-y-2">
                <li><strong>Healthcare Services:</strong> To provide remote patient monitoring and communicate with your care team</li>
                <li><strong>AI Analysis:</strong> To generate health insights and predictive alerts using artificial intelligence</li>
                <li><strong>Communications:</strong> To send notifications, reminders, and important updates</li>
                <li><strong>Billing:</strong> To process payments and generate invoices</li>
                <li><strong>Improvement:</strong> To improve our services and develop new features</li>
                <li><strong>Compliance:</strong> To comply with legal obligations and healthcare regulations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">4. Data Sharing</h2>
              <p className="mt-4">We may share your information with:</p>
              <ul className="mt-2 list-disc pl-6 space-y-2">
                <li><strong>Healthcare Providers:</strong> Your designated care team and healthcare organizations</li>
                <li><strong>Service Providers:</strong> Third-party vendors who assist in operating our platform (under strict confidentiality agreements)</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our legal rights</li>
              </ul>
              <p className="mt-4">We never sell your personal or health information to third parties.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">5. Data Security</h2>
              <p className="mt-4">We implement industry-standard security measures including:</p>
              <ul className="mt-2 list-disc pl-6 space-y-1">
                <li>256-bit AES encryption for data at rest and in transit</li>
                <li>Multi-factor authentication</li>
                <li>Regular security audits and penetration testing</li>
                <li>SOC 2 Type II compliance</li>
                <li>HIPAA-compliant data centers</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">6. Your Rights</h2>
              <p className="mt-4">You have the right to:</p>
              <ul className="mt-2 list-disc pl-6 space-y-1">
                <li>Access your personal and health information</li>
                <li>Request corrections to inaccurate data</li>
                <li>Request deletion of your data (subject to legal requirements)</li>
                <li>Opt out of marketing communications</li>
                <li>Request a copy of your data in a portable format</li>
                <li>File a complaint with regulatory authorities</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">7. Data Retention</h2>
              <p className="mt-4">
                We retain your health information for the period required by applicable healthcare regulations (typically 6-10 years). Account information is retained while your account is active and for a reasonable period thereafter.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">8. Contact Us</h2>
              <p className="mt-4">
                For questions about this Privacy Policy or to exercise your rights, contact our Privacy Officer:
              </p>
              <div className="mt-4 rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
                <p><strong>Email:</strong> privacy@vitalwatch.ai</p>
                <p><strong>Phone:</strong> 1-800-VITAL-AI</p>
                <p><strong>Address:</strong> 123 Healthcare Ave, San Francisco, CA 94102</p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
