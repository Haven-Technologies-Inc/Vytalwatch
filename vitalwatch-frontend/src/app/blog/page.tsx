import type { Metadata } from "next";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import Link from "next/link";
import Image from "next/image";
import { Calendar, Clock, ArrowRight, User } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Insights, guides, and best practices for remote patient monitoring and healthcare innovation. Stay updated with the latest in RPM, AI diagnostics, and patient care.",
  openGraph: {
    title: "VytalWatch AI Blog - RPM Insights & Healthcare Innovation",
    description:
      "Expert articles on remote patient monitoring, AI in healthcare, billing compliance, and patient engagement strategies.",
    url: "https://vytalwatch.com/blog",
    type: "website",
  },
};

const blogPosts = [
  {
    id: 1,
    title: "The Future of Remote Patient Monitoring: AI-Driven Insights",
    excerpt: "Discover how artificial intelligence is revolutionizing remote patient monitoring and improving patient outcomes across healthcare systems.",
    category: "AI & Technology",
    author: "Dr. Sarah Chen",
    date: "Jan 15, 2026",
    readTime: "8 min read",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=400&fit=crop",
    featured: true,
  },
  {
    id: 2,
    title: "Maximizing RPM Reimbursement: A Complete Guide to CPT Codes",
    excerpt: "Learn how to properly document and bill for remote patient monitoring services to maximize your practice's revenue.",
    category: "Billing & Compliance",
    author: "Michael Roberts",
    date: "Jan 12, 2026",
    readTime: "12 min read",
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=400&fit=crop",
    featured: false,
  },
  {
    id: 3,
    title: "Reducing Hospital Readmissions with Proactive Monitoring",
    excerpt: "Case study: How one health system reduced 30-day readmissions by 40% using VytalWatch AI's predictive alerts.",
    category: "Case Study",
    author: "Dr. James Wilson",
    date: "Jan 10, 2026",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&h=400&fit=crop",
    featured: false,
  },
  {
    id: 4,
    title: "HIPAA Compliance in Remote Patient Monitoring",
    excerpt: "Essential guidelines for maintaining patient privacy and data security in your RPM program.",
    category: "Compliance",
    author: "Lisa Thompson",
    date: "Jan 8, 2026",
    readTime: "10 min read",
    image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&h=400&fit=crop",
    featured: false,
  },
  {
    id: 5,
    title: "Patient Engagement Strategies for Better Health Outcomes",
    excerpt: "Proven techniques to increase patient adherence and engagement in remote monitoring programs.",
    category: "Patient Care",
    author: "Dr. Emily Park",
    date: "Jan 5, 2026",
    readTime: "7 min read",
    image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=400&fit=crop",
    featured: false,
  },
  {
    id: 6,
    title: "Integrating Wearables into Your RPM Workflow",
    excerpt: "A practical guide to incorporating consumer wearables and medical devices into your monitoring ecosystem.",
    category: "Devices",
    author: "Tech Team",
    date: "Jan 3, 2026",
    readTime: "9 min read",
    image: "https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=800&h=400&fit=crop",
    featured: false,
  },
];

const categories = [
  "All Posts",
  "AI & Technology",
  "Billing & Compliance",
  "Case Study",
  "Patient Care",
  "Devices",
];

export default function BlogPage() {
  const featuredPost = blogPosts.find((post) => post.featured);
  const regularPosts = blogPosts.filter((post) => !post.featured);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <Header />
      <main className="pt-20">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6">
                VytalWatch AI Blog
              </h1>
              <p className="text-xl text-blue-100">
                Insights, guides, and best practices for remote patient monitoring and healthcare innovation.
              </p>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="border-b border-slate-200 dark:border-slate-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-6 py-4 overflow-x-auto">
              {categories.map((category) => (
                <button
                  key={category}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    category === "All Posts"
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Post */}
        {featuredPost && (
          <section className="py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <Link href={`/blog/${featuredPost.id}`} className="group block">
                <div className="grid lg:grid-cols-2 gap-8 items-center bg-slate-50 dark:bg-slate-800 rounded-2xl overflow-hidden">
                  <div className="aspect-video lg:aspect-auto lg:h-full relative">
                    <img
                      src={featuredPost.image}
                      alt={featuredPost.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                        Featured
                      </span>
                    </div>
                  </div>
                  <div className="p-8 lg:p-12">
                    <span className="text-blue-600 dark:text-blue-400 text-sm font-semibold">
                      {featuredPost.category}
                    </span>
                    <h2 className="mt-3 text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {featuredPost.title}
                    </h2>
                    <p className="mt-4 text-slate-600 dark:text-slate-300 line-clamp-3">
                      {featuredPost.excerpt}
                    </p>
                    <div className="mt-6 flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {featuredPost.author}
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {featuredPost.date}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {featuredPost.readTime}
                      </div>
                    </div>
                    <div className="mt-6 inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold group-hover:gap-3 transition-all">
                      Read Article <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </section>
        )}

        {/* Blog Grid */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">
              Latest Articles
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {regularPosts.map((post) => (
                <Link key={post.id} href={`/blog/${post.id}`} className="group">
                  <article className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
                    <div className="aspect-video relative">
                      <img
                        src={post.image}
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-6">
                      <span className="text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wide">
                        {post.category}
                      </span>
                      <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                        {post.excerpt}
                      </p>
                      <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>{post.author}</span>
                        <span>{post.readTime}</span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>

            {/* Load More */}
            <div className="mt-12 text-center">
              <button className="px-8 py-3 border-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 rounded-lg font-semibold hover:bg-blue-600 hover:text-white transition-colors">
                Load More Articles
              </button>
            </div>
          </div>
        </section>

        {/* Newsletter CTA */}
        <section className="py-16 bg-blue-600">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Stay Updated with Healthcare Insights
            </h2>
            <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
              Get the latest articles, case studies, and industry news delivered to your inbox weekly.
            </p>
            <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-white"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                Subscribe
              </button>
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
