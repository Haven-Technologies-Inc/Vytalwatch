import type { Metadata } from "next";
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "VytalWatch AI Terms of Service. Review the terms governing use of our AI-powered remote patient monitoring platform, subscription plans, and HIPAA compliance commitments.",
  openGraph: {
    title: "Terms of Service - VytalWatch AI",
    description:
      "Terms and conditions for using VytalWatch AI's remote patient monitoring platform, including subscription, data handling, and compliance policies.",
    url: "https://vytalwatch.com/terms",
    type: "website",
  },
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <main className="py-20">
        <div className="container mx-auto max-w-4xl px-4">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Terms of Service</h1>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Last updated: January 15, 2026</p>

          <div className="mt-12 space-y-8 text-gray-700 dark:text-gray-300">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">1. Acceptance of Terms</h2>
              <p className="mt-4">
                By accessing or using VytalWatch AI (&quot;Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">2. Description of Service</h2>
              <p className="mt-4">
                VytalWatch AI provides a remote patient monitoring platform that enables healthcare providers to monitor patient vital signs, receive AI-powered insights, and manage patient care remotely. The Service includes:
              </p>
              <ul className="mt-2 list-disc pl-6 space-y-1">
                <li>Vital signs data collection and monitoring</li>
                <li>AI-powered health analytics and alerts</li>
                <li>Secure messaging between patients and providers</li>
                <li>Care coordination tools</li>
                <li>Billing and reimbursement management</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">3. Medical Disclaimer</h2>
              <div className="mt-4 rounded-lg border-l-4 border-yellow-500 bg-yellow-50 p-4 dark:bg-yellow-900/20">
                <p className="font-semibold text-yellow-800 dark:text-yellow-400">Important Notice</p>
                <p className="mt-2 text-yellow-700 dark:text-yellow-300">
                  VytalWatch AI is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or qualified healthcare provider with any questions regarding a medical condition. Never disregard professional medical advice or delay seeking it because of information provided by the Service.
                </p>
              </div>
              <p className="mt-4">
                In case of a medical emergency, call 911 or your local emergency services immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">4. User Accounts</h2>
              <p className="mt-4">To use the Service, you must:</p>
              <ul className="mt-2 list-disc pl-6 space-y-1">
                <li>Provide accurate and complete registration information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Notify us immediately of any unauthorized access</li>
                <li>Be at least 18 years old (or have parental consent)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">5. Subscription and Payment</h2>
              <p className="mt-4">
                The Service is offered on a subscription basis. By subscribing, you agree to pay the applicable fees as described in our pricing. Subscriptions automatically renew unless cancelled before the renewal date.
              </p>
              <ul className="mt-2 list-disc pl-6 space-y-1">
                <li>Fees are billed in advance on a monthly or annual basis</li>
                <li>All fees are non-refundable except as required by law</li>
                <li>We reserve the right to change pricing with 30 days notice</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">6. Acceptable Use</h2>
              <p className="mt-4">You agree not to:</p>
              <ul className="mt-2 list-disc pl-6 space-y-1">
                <li>Use the Service for any unlawful purpose</li>
                <li>Attempt to gain unauthorized access to the Service</li>
                <li>Interfere with or disrupt the Service</li>
                <li>Upload malicious code or content</li>
                <li>Impersonate another person or entity</li>
                <li>Share account credentials with unauthorized users</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">7. Intellectual Property</h2>
              <p className="mt-4">
                The Service and its original content, features, and functionality are owned by VytalWatch AI and are protected by international copyright, trademark, and other intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">8. HIPAA Compliance</h2>
              <p className="mt-4">
                For healthcare providers subject to HIPAA, we will enter into a Business Associate Agreement (BAA) as required. We maintain HIPAA compliance through administrative, physical, and technical safeguards to protect Protected Health Information (PHI).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">9. Limitation of Liability</h2>
              <p className="mt-4">
                To the maximum extent permitted by law, VytalWatch AI shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">10. Termination</h2>
              <p className="mt-4">
                We may terminate or suspend your account immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties, or for any other reason.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">11. Changes to Terms</h2>
              <p className="mt-4">
                We reserve the right to modify these Terms at any time. We will provide notice of significant changes via email or through the Service. Your continued use after changes constitutes acceptance of the new Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">12. Contact Information</h2>
              <p className="mt-4">For questions about these Terms, contact us at:</p>
              <div className="mt-4 rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
                <p><strong>Email:</strong> legal@vitalwatch.ai</p>
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
