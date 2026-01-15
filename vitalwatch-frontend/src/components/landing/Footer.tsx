"use client";

import Link from "next/link";
import { Activity, Linkedin, Twitter, Youtube, Facebook } from "lucide-react";

const footerLinks = {
  product: {
    title: "Product",
    links: [
      { name: "Features", href: "#features" },
      { name: "Pricing", href: "#pricing" },
      { name: "Integrations", href: "#integrations" },
      { name: "API Documentation", href: "/docs" },
      { name: "Security", href: "/security" },
    ],
  },
  resources: {
    title: "Resources",
    links: [
      { name: "Blog", href: "/blog" },
      { name: "Case Studies", href: "/case-studies" },
      { name: "Webinars", href: "/webinars" },
      { name: "Help Center", href: "/help" },
      { name: "Developer Docs", href: "/developers" },
    ],
  },
  company: {
    title: "Company",
    links: [
      { name: "About Us", href: "/about" },
      { name: "Careers", href: "/careers" },
      { name: "Press Kit", href: "/press" },
      { name: "Contact", href: "/contact" },
      { name: "Partner Program", href: "/partners" },
    ],
  },
  legal: {
    title: "Legal",
    links: [
      { name: "Privacy Policy", href: "/privacy" },
      { name: "Terms of Service", href: "/terms" },
      { name: "HIPAA Compliance", href: "/hipaa" },
      { name: "Cookie Policy", href: "/cookies" },
      { name: "BAA", href: "/baa" },
    ],
  },
};

const socialLinks = [
  { name: "LinkedIn", icon: Linkedin, href: "https://linkedin.com" },
  { name: "Twitter", icon: Twitter, href: "https://twitter.com" },
  { name: "YouTube", icon: Youtube, href: "https://youtube.com" },
  { name: "Facebook", icon: Facebook, href: "https://facebook.com" },
];

export function Footer() {
  return (
    <footer className="bg-slate-900 text-white">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {/* Brand Column */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-emerald-500 rounded-xl flex items-center justify-center">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold">
                VitalWatch<span className="text-blue-400">AI</span>
              </span>
            </Link>
            <p className="text-slate-400 text-sm mb-6 max-w-sm">
              AI-powered remote patient monitoring platform that reduces readmissions,
              improves outcomes, and generates sustainable RPM revenue.
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center transition-colors"
                  aria-label={social.name}
                >
                  <social.icon className="h-5 w-5 text-slate-400" />
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {Object.values(footerLinks).map((section) => (
            <div key={section.title}>
              <h4 className="font-semibold text-white mb-4">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-400">
              © {new Date().getFullYear()} VitalWatch AI. All rights reserved.
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-emerald-500/20 rounded flex items-center justify-center">
                  <span className="text-xs font-bold text-emerald-400">SOC2</span>
                </div>
                <span className="text-xs text-slate-500">Certified</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-500/20 rounded flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-400">HIPAA</span>
                </div>
                <span className="text-xs text-slate-500">Compliant</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
