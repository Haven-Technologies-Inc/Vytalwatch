"use client";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function CTASection() {
  return (
    <section className="py-24 bg-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-violet-600/20 blur-3xl" />
      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Ready to Transform Patient Care?</h2>
        <p className="text-xl text-slate-400 mb-10">Start your free 30-day trial today. No credit card required.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/auth/register"><Button size="lg" className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 px-8" rightIcon={<ArrowRight className="h-5 w-5" />}>Start Free Trial</Button></Link>
          <Link href="/contact"><Button size="lg" variant="outline" className="border-slate-700 text-slate-300">Schedule Demo</Button></Link>
        </div>
      </div>
    </section>
  );
}
