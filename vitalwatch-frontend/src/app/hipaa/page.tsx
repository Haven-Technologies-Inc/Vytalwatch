'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Shield, Lock, Eye, FileCheck, Server, Users, CheckCircle } from 'lucide-react';

const sections = [
  {
    icon: Lock,
    title: 'Data Encryption',
    items: ['AES-256 encryption at rest', 'TLS 1.3 in transit', 'End-to-end encrypted messaging'],
  },
  {
    icon: Eye,
    title: 'Access Controls',
    items: ['Role-based access (RBAC)', 'Multi-factor authentication', 'Session timeout enforcement'],
  },
  {
    icon: FileCheck,
    title: 'Audit Logging',
    items: ['Complete PHI access logs', '6-year retention policy', 'Tamper-evident records'],
  },
  {
    icon: Server,
    title: 'Infrastructure',
    items: ['SOC 2 Type II certified', 'HIPAA-compliant cloud hosting', 'Regular penetration testing'],
  },
  {
    icon: Users,
    title: 'Workforce Training',
    items: ['Annual HIPAA training', 'Security awareness program', 'Incident response procedures'],
  },
  {
    icon: Shield,
    title: 'Business Associates',
    items: ['BAA with all vendors', 'Vendor security assessments', 'Subcontractor compliance'],
  },
];

export default function HIPAAPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-primary">VytalWatch</Link>
          <Link href="/auth/login"><Button size="sm">Sign In</Button></Link>
        </div>
      </header>

      <section className="py-16 bg-linear-to-br from-emerald-600 to-primary text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Shield className="h-16 w-16 mx-auto mb-6 opacity-90" />
          <h1 className="text-4xl font-bold mb-4">HIPAA Compliance</h1>
          <p className="text-xl opacity-90">Your patients&apos; data security is our top priority</p>
        </div>
      </section>

      <section className="py-16 max-w-7xl mx-auto px-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Our Commitment</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            VytalWatch is fully compliant with the Health Insurance Portability and Accountability Act (HIPAA). 
            We implement comprehensive administrative, physical, and technical safeguards to protect Protected 
            Health Information (PHI). Our platform undergoes regular security audits and assessments to ensure 
            continued compliance with all HIPAA requirements.
          </p>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Security Measures</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((section, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <section.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{section.title}</h3>
              <ul className="space-y-2">
                {section.items.map((item, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Request BAA or Compliance Documentation</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">Contact our compliance team for Business Associate Agreements or security documentation.</p>
          <Link href="/contact"><Button size="lg">Contact Compliance Team</Button></Link>
        </div>
      </section>

      <footer className="py-8 border-t border-gray-200 dark:border-gray-700">
        <p className="text-center text-gray-500">&copy; 2024 VytalWatch. All rights reserved.</p>
      </footer>
    </div>
  );
}
