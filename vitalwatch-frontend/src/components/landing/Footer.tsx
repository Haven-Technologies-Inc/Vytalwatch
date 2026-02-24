"use client";
import Link from "next/link";
import Image from "next/image";

const links = {
  Product: [{ name: "Features", href: "#why-choose" }, { name: "Use Cases", href: "#use-cases" }, { name: "Pricing", href: "#pricing" }, { name: "Devices", href: "/devices" }],
  Company: [{ name: "About", href: "#about" }, { name: "Careers", href: "/careers" }, { name: "Contact", href: "/contact" }],
  Legal: [{ name: "Privacy Policy", href: "/privacy" }, { name: "Terms of Service", href: "/terms" }, { name: "HIPAA Compliance", href: "/hipaa" }],
};

export function Footer() {
  return (
    <footer className="bg-slate-900 border-t border-slate-800">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div>
            <Image src="/logo.png" alt="VytalWatch" width={120} height={40} className="mb-4" style={{ width: "auto", height: "auto" }} />
            <p className="text-slate-400 text-sm">AI-powered remote patient monitoring platform revolutionizing healthcare delivery.</p>
          </div>
          {Object.entries(links).map(([title, items]) => (
            <div key={title}>
              <h4 className="text-white font-semibold mb-4">{title}</h4>
              <ul className="space-y-2">{items.map((item) => <li key={item.name}><Link href={item.href} className="text-slate-500 hover:text-white text-sm transition-colors">{item.name}</Link></li>)}</ul>
            </div>
          ))}
        </div>
        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-sm"> 2025 VytalWatch. All rights reserved.</p>
          <div className="flex gap-6 text-slate-500 text-sm">
            <span>HIPAA Compliant</span><span>SOC 2 Certified</span><span>FDA Approved</span>
          </div>
        </div>
      </div>
      <div className="bg-slate-950 py-4 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-slate-600 text-sm">Powered by <span className="text-slate-400 font-medium">Haven Technologies Inc.</span></p>
        </div>
      </div>
    </footer>
  );
}
