"use client";
import { Button } from "@/components/ui/Button";
import { ArrowRight, Calendar } from "lucide-react";
import Link from "next/link";

export function BookDemoSection() {
  return (
    <section id="book-demo" className="py-24 bg-blue-600 relative overflow-hidden">
                  <div className="relative max-w-4xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/30 bg-white/10 text-white text-sm mb-6">
          <Calendar className="h-4 w-4" />
          <span>Schedule a Demo</span>
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Ready to Transform Patient Care?</h2>
        <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">See VytalWatch in action. Book a personalized demo and discover how AI can revolutionize your practice.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/auth/register">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 px-8" rightIcon={<ArrowRight className="h-5 w-5" />}>
              Start Free Trial
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="border-white text-white hover:bg-blue-700">
            Book a Demo
          </Button>
        </div>
      </div>
    </section>
  );
}
