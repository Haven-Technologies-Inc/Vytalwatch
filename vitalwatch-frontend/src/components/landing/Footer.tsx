"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

const footerLinks = {
  Platform: [
    { name: "Features", href: "#platform" },
    { name: "Clinical Solutions", href: "#solutions" },
    { name: "Pricing", href: "#pricing" },
    { name: "Devices", href: "/devices" },
    { name: "Integrations", href: "#platform" },
  ],
  Resources: [
    { name: "Documentation", href: "/docs" },
    { name: "Clinical Evidence", href: "#evidence" },
    { name: "FAQ", href: "#faqs" },
    { name: "Blog", href: "/blog" },
    { name: "Case Studies", href: "/case-studies" },
  ],
  Company: [
    { name: "About", href: "/about" },
    { name: "Careers", href: "/careers" },
    { name: "Contact", href: "/contact" },
    { name: "Partners", href: "/partners" },
  ],
  Legal: [
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms of Service", href: "/terms" },
    { name: "HIPAA Compliance", href: "/hipaa" },
    { name: "BAA", href: "/baa" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main footer */}
        <div className="py-12 sm:py-16">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-12">
            {/* Brand column - spans 2 cols on lg */}
            <div className="col-span-2">
              <Link href="/" className="inline-block mb-4">
                <Image
                  src="/logo.png"
                  alt="VytalWatch"
                  width={120}
                  height={40}
                  style={{ width: "auto", height: "auto" }}
                />
              </Link>
              <p className="text-slate-500 text-sm leading-relaxed max-w-xs mb-6">
                AI-powered remote patient monitoring platform. Improving
                outcomes, reducing readmissions, and enabling sustainable RPM
                revenue for healthcare organizations.
              </p>
              <div className="flex flex-wrap gap-2">
                {["HIPAA", "SOC 2", "FDA"].map((badge) => (
                  <span
                    key={badge}
                    className="px-2 py-1 rounded-md bg-white/[0.03] border border-white/5 text-slate-600 text-[10px] font-medium"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>

            {/* Link columns */}
            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title}>
                <h4 className="text-white font-medium text-sm mb-4">{title}</h4>
                <ul className="space-y-2.5">
                  {links.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="text-slate-500 hover:text-slate-300 text-sm transition-colors duration-200"
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

        {/* Bottom bar */}
        <div className="py-6 border-t border-white/5">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-slate-600 text-xs">
              &copy; {new Date().getFullYear()} VytalWatch AI. All rights
              reserved.
            </p>
            <p className="text-slate-700 text-xs">
              Powered by{" "}
              <span className="text-slate-500 font-medium">
                Haven Technologies Inc.
              </span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
