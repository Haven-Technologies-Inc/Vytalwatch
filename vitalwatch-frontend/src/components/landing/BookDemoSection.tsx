"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { ArrowRight, Calendar, Phone } from "lucide-react";
import Link from "next/link";

export function BookDemoSection() {
  return (
    <section id="book-demo" className="relative py-20 sm:py-28 bg-slate-900 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.08)_0%,_transparent_60%)]" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-400 text-xs font-medium mb-6 sm:mb-8">
            <Calendar className="h-3.5 w-3.5" />
            Get Started
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6 tracking-tight">
            Ready to transform your
            <br className="hidden sm:block" /> patient outcomes?
          </h2>

          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed">
            See how VytalWatch can work for your practice. Our team will walk you
            through the platform, answer your questions, and help you build an
            RPM program tailored to your patient population.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8">
            <Link href="/auth/register">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-8 shadow-xl shadow-blue-600/20 hover:shadow-blue-500/30 transition-all duration-300 hover:-translate-y-0.5"
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Start Free Trial
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 hover:bg-white/5 transition-all duration-300"
              leftIcon={<Phone className="h-4 w-4" />}
            >
              Schedule a Demo
            </Button>
          </div>

          <p className="text-slate-600 text-xs">
            Free 14-day trial. No credit card required. Full platform access.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
