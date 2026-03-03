import type { Metadata } from "next";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import Link from "next/link";
import Image from "next/image";
import {
  Heart,
  Shield,
  Zap,
  Users,
  Award,
  Target,
  Linkedin,
  Twitter,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about VytalWatch AI's mission to transform healthcare through AI-powered remote patient monitoring. 500K+ patients monitored, 150+ healthcare partners, and 40% readmission reduction.",
  openGraph: {
    title: "About VytalWatch AI - Transforming Healthcare, One Patient at a Time",
    description:
      "We're on a mission to make proactive, AI-powered healthcare accessible to every patient and provider. Discover our story, values, and leadership team.",
    url: "https://vytalwatch.com/about",
    type: "website",
  },
};

const stats = [
  { value: "500K+", label: "Patients Monitored" },
  { value: "150+", label: "Healthcare Partners" },
  { value: "40%", label: "Readmission Reduction" },
  { value: "99.9%", label: "Platform Uptime" },
];

const values = [
  {
    icon: Heart,
    title: "Patient-Centered Care",
    description:
      "Every feature we build starts with the question: How does this improve patient outcomes? We believe technology should empower patients and their care teams.",
  },
  {
    icon: Shield,
    title: "Trust & Security",
    description:
      "Healthcare data is sacred. We maintain the highest standards of security and compliance, treating every piece of patient information with the utmost care.",
  },
  {
    icon: Zap,
    title: "Continuous Innovation",
    description:
      "We're relentlessly focused on pushing the boundaries of what's possible in remote patient monitoring through AI, machine learning, and thoughtful design.",
  },
  {
    icon: Users,
    title: "Partnership",
    description:
      "We succeed when our healthcare partners succeed. We're committed to being more than a vendor – we're an extension of your care team.",
  },
];

const team = [
  {
    name: "Dr. Sarah Chen",
    role: "CEO & Co-Founder",
    bio: "Former Chief Medical Officer at Stanford Health. 20+ years in healthcare innovation.",
    image: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=400&fit=crop",
  },
  {
    name: "Michael Roberts",
    role: "CTO & Co-Founder",
    bio: "Ex-Google Health engineer. Pioneered AI diagnostics at DeepMind Health.",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
  },
  {
    name: "Dr. James Wilson",
    role: "Chief Medical Officer",
    bio: "Board-certified cardiologist. Led RPM programs at Mayo Clinic for 10 years.",
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop",
  },
  {
    name: "Lisa Thompson",
    role: "VP of Customer Success",
    bio: "15+ years in healthcare SaaS. Previously led customer success at Epic Systems.",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop",
  },
];

const milestones = [
  { year: "2020", title: "Founded", description: "VytalWatch AI founded with a mission to transform remote patient monitoring" },
  { year: "2021", title: "Series A", description: "Raised $15M to expand AI capabilities and device integrations" },
  { year: "2022", title: "100K Patients", description: "Reached milestone of 100,000 patients monitored on the platform" },
  { year: "2023", title: "SOC 2 & HIPAA", description: "Achieved SOC 2 Type II and HIPAA compliance certifications" },
  { year: "2024", title: "Series B", description: "Raised $45M to accelerate growth and international expansion" },
  { year: "2025", title: "500K Patients", description: "Now monitoring over half a million patients across 150+ organizations" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <Header />
      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-20 lg:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAzMHYySDI0di0yaDEyek0zNiAyNnYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6">
                Transforming Healthcare,<br />One Patient at a Time
              </h1>
              <p className="text-xl text-blue-200">
                We&apos;re on a mission to make proactive, AI-powered healthcare accessible to every patient and provider.
              </p>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-12 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl lg:text-4xl font-bold text-blue-600 dark:text-blue-400">
                    {stat.value}
                  </div>
                  <div className="mt-2 text-slate-600 dark:text-slate-300">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-full text-sm font-semibold mb-6">
                  <Target className="h-4 w-4" />
                  Our Mission
                </div>
                <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-6">
                  Bridging the Gap Between Clinic Visits
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-300 mb-6">
                  Traditional healthcare happens in isolated moments – during appointments, after symptoms appear, when it&apos;s often too late for prevention. We believe there&apos;s a better way.
                </p>
                <p className="text-lg text-slate-600 dark:text-slate-300 mb-6">
                  VytalWatch AI continuously monitors patients between visits, using artificial intelligence to detect concerning trends before they become emergencies. We&apos;re turning reactive healthcare into proactive care.
                </p>
                <p className="text-lg text-slate-600 dark:text-slate-300">
                  Our platform empowers providers to manage more patients with better outcomes, while giving patients peace of mind knowing they&apos;re always connected to their care team.
                </p>
              </div>
              <div className="relative">
                <img
                  src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=600&fit=crop"
                  alt="Healthcare professional with patient"
                  className="rounded-2xl shadow-xl"
                />
                <div className="absolute -bottom-6 -left-6 bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                      <Award className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">HIPAA Compliant</div>
                      <div className="text-sm text-slate-500">SOC 2 Type II Certified</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-16 lg:py-24 bg-slate-50 dark:bg-slate-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                Our Values
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                The principles that guide everything we do
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {values.map((value) => (
                <div
                  key={value.title}
                  className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700"
                >
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
                    <value.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                    {value.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 text-sm">
                    {value.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                Our Journey
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                From startup to industry leader in remote patient monitoring
              </p>
            </div>
            <div className="relative">
              <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-0.5 bg-slate-200 dark:bg-slate-700 hidden lg:block"></div>
              <div className="space-y-8 lg:space-y-0">
                {milestones.map((milestone, index) => (
                  <div
                    key={milestone.year}
                    className={`relative flex flex-col lg:flex-row items-center ${
                      index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
                    }`}
                  >
                    <div className={`w-full lg:w-1/2 ${index % 2 === 0 ? "lg:pr-12 lg:text-right" : "lg:pl-12"}`}>
                      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="text-blue-600 dark:text-blue-400 font-bold text-lg mb-1">
                          {milestone.year}
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                          {milestone.title}
                        </h3>
                        <p className="text-slate-600 dark:text-slate-300">
                          {milestone.description}
                        </p>
                      </div>
                    </div>
                    <div className="hidden lg:flex absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-blue-600 rounded-full border-4 border-white dark:border-slate-900"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="py-16 lg:py-24 bg-slate-50 dark:bg-slate-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                Leadership Team
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                Industry veterans committed to transforming healthcare
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {team.map((member) => (
                <div
                  key={member.name}
                  className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group"
                >
                  <div className="aspect-square relative overflow-hidden">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {member.name}
                    </h3>
                    <p className="text-blue-600 dark:text-blue-400 text-sm font-medium mb-3">
                      {member.role}
                    </p>
                    <p className="text-slate-600 dark:text-slate-300 text-sm mb-4">
                      {member.bio}
                    </p>
                    <div className="flex gap-3">
                      <a
                        href="#"
                        title="LinkedIn Profile"
                        aria-label="LinkedIn Profile"
                        className="text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        <Linkedin className="h-5 w-5" />
                      </a>
                      <a
                        href="#"
                        title="Twitter Profile"
                        aria-label="Twitter Profile"
                        className="text-slate-400 hover:text-blue-400 transition-colors"
                      >
                        <Twitter className="h-5 w-5" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 lg:py-24 bg-gradient-to-br from-blue-600 to-emerald-600">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Join Us in Transforming Healthcare
            </h2>
            <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
              Whether you&apos;re a healthcare provider looking to improve patient outcomes, or a talented individual who wants to make a difference, we&apos;d love to connect.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/careers"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors"
              >
                View Careers
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
