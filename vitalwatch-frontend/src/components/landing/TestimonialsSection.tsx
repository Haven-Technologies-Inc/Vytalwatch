"use client";
import { Star } from "lucide-react";

const testimonials = [
  { name: "Dr. Sarah Chen", role: "Cardiologist", org: "Heart Care Center", text: "VytalWatch AI predicted a cardiac event 4 days early. We saved a life.", rating: 5 },
  { name: "James Miller", role: "CEO", org: "Senior Care Network", text: "40% reduction in readmissions. The ROI speaks for itself.", rating: 5 },
  { name: "Dr. Emily Rodriguez", role: "Medical Director", org: "City Clinic", text: "The AI alerts are incredibly accurate. Game-changer for our practice.", rating: 5 },
];

export function TestimonialsSection() {
  return (
    <section className="py-24 bg-slate-900">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-white text-center mb-4">Trusted by Healthcare Leaders</h2>
        <p className="text-slate-400 text-center mb-16">See what providers are saying about VytalWatch</p>
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <div key={i} className="p-6 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="flex gap-1 mb-4">{[...Array(t.rating)].map((_, j) => <Star key={j} className="h-5 w-5 text-yellow-500 fill-yellow-500" />)}</div>
              <p className="text-slate-300 mb-6">"{t.text}"</p>
              <div><p className="text-white font-semibold">{t.name}</p><p className="text-slate-500 text-sm">{t.role}, {t.org}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
