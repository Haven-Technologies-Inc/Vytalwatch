import type { Metadata } from "next";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import Link from "next/link";
import { ArrowRight, TrendingUp, Users, DollarSign, Heart, Building2, Stethoscope } from "lucide-react";

export const metadata: Metadata = {
  title: "Case Studies",
  description:
    "See how 150+ healthcare organizations reduced readmissions by up to 42% and generated millions in RPM revenue with VytalWatch AI. Real results from real providers.",
  openGraph: {
    title: "Customer Success Stories - VytalWatch AI Case Studies",
    description:
      "Discover how health systems, cardiology practices, and primary care networks transformed patient outcomes with AI-powered remote patient monitoring.",
    url: "https://vytalwatch.com/case-studies",
    type: "website",
  },
};

const caseStudies = [
  {
    id: 1,
    title: "Regional Health System Reduces Readmissions by 42%",
    organization: "Midwest Regional Healthcare",
    type: "Health System",
    icon: Building2,
    challenge: "High 30-day readmission rates for heart failure and COPD patients were impacting quality scores and revenue.",
    solution: "Implemented VytalWatch AI's predictive monitoring for 2,500+ chronic disease patients with automated alert escalation.",
    results: [
      { metric: "42%", label: "Reduction in readmissions" },
      { metric: "$2.8M", label: "Annual savings" },
      { metric: "94%", label: "Patient satisfaction" },
    ],
    quote: "VytalWatch AI transformed how we manage our chronic disease population. The AI-driven insights allow us to intervene before patients deteriorate.",
    author: "Dr. Rebecca Martinez, Chief Medical Officer",
    image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&h=400&fit=crop",
  },
  {
    id: 2,
    title: "Cardiology Practice Generates $450K in New RPM Revenue",
    organization: "Heart & Vascular Associates",
    type: "Specialty Practice",
    icon: Heart,
    challenge: "Wanted to expand patient care beyond office visits while creating a sustainable revenue stream.",
    solution: "Deployed VytalWatch AI for 800 cardiac patients with blood pressure, weight, and ECG monitoring.",
    results: [
      { metric: "$450K", label: "Annual RPM revenue" },
      { metric: "35%", label: "Fewer ER visits" },
      { metric: "89%", label: "Device compliance" },
    ],
    quote: "The billing automation alone saved our staff 20+ hours per week. The clinical insights are invaluable.",
    author: "Dr. Michael Chen, Managing Partner",
    image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=400&fit=crop",
  },
  {
    id: 3,
    title: "Primary Care Network Improves Diabetes Outcomes",
    organization: "Community Health Partners",
    type: "Primary Care",
    icon: Stethoscope,
    challenge: "Managing 5,000+ diabetic patients across 12 locations with limited care coordination resources.",
    solution: "Centralized glucose monitoring with AI-powered trend analysis and care team notifications.",
    results: [
      { metric: "1.2%", label: "Average A1C reduction" },
      { metric: "28%", label: "Fewer complications" },
      { metric: "3x", label: "Patient engagement" },
    ],
    quote: "Our care coordinators can now manage 3x more patients with better outcomes. The AI does the heavy lifting.",
    author: "Sarah Johnson, RN, Director of Care Management",
    image: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&h=400&fit=crop",
  },
];

const stats = [
  { value: "150+", label: "Healthcare Organizations" },
  { value: "500K+", label: "Patients Monitored" },
  { value: "40%", label: "Avg. Readmission Reduction" },
  { value: "$50M+", label: "RPM Revenue Generated" },
];

export default function CaseStudiesPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <Header />
      <main className="pt-20">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6">
                Customer Success Stories
              </h1>
              <p className="text-xl text-blue-100">
                See how healthcare organizations are transforming patient care and generating sustainable RPM revenue with VytalWatch AI.
              </p>
            </div>

            {/* Stats */}
            <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat) => (
                <div key={stat.label} className="bg-white/10 backdrop-blur rounded-xl p-6 text-center">
                  <div className="text-3xl lg:text-4xl font-bold text-white">
                    {stat.value}
                  </div>
                  <div className="mt-2 text-sm text-blue-200">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Case Studies */}
        <section className="py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-16">
              {caseStudies.map((study, index) => (
                <article
                  key={study.id}
                  className={`grid lg:grid-cols-2 gap-8 lg:gap-12 items-center ${
                    index % 2 === 1 ? "lg:flex-row-reverse" : ""
                  }`}
                >
                  <div className={index % 2 === 1 ? "lg:order-2" : ""}>
                    <div className="relative">
                      <img
                        src={study.image}
                        alt={study.organization}
                        className="rounded-2xl w-full aspect-video object-cover"
                      />
                      <div className="absolute top-4 left-4 bg-white dark:bg-slate-800 rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-lg">
                        <study.icon className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          {study.type}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={index % 2 === 1 ? "lg:order-1" : ""}>
                    <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">
                      {study.title}
                    </h2>
                    <p className="mt-2 text-blue-600 dark:text-blue-400 font-semibold">
                      {study.organization}
                    </p>

                    <div className="mt-6 space-y-4">
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">Challenge</h3>
                        <p className="text-slate-600 dark:text-slate-300">{study.challenge}</p>
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">Solution</h3>
                        <p className="text-slate-600 dark:text-slate-300">{study.solution}</p>
                      </div>
                    </div>

                    {/* Results */}
                    <div className="mt-6 grid grid-cols-3 gap-4">
                      {study.results.map((result) => (
                        <div key={result.label} className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {result.metric}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {result.label}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Quote */}
                    <blockquote className="mt-6 border-l-4 border-blue-600 pl-4">
                      <p className="text-slate-600 dark:text-slate-300 italic">
                        &ldquo;{study.quote}&rdquo;
                      </p>
                      <cite className="mt-2 block text-sm text-slate-500 dark:text-slate-400 not-italic">
                        — {study.author}
                      </cite>
                    </blockquote>

                    <Link
                      href={`/case-studies/${study.id}`}
                      className="mt-6 inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold hover:gap-3 transition-all"
                    >
                      Read Full Case Study <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-gradient-to-br from-blue-600 to-emerald-600">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Ready to Write Your Success Story?
            </h2>
            <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
              Join 150+ healthcare organizations already transforming patient care with VytalWatch AI.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth/register"
                className="px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                Start Free Trial
              </Link>
              <Link
                href="/contact"
                className="px-8 py-4 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors"
              >
                Schedule Demo
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
