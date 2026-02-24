'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Briefcase, MapPin, Heart, Laptop, GraduationCap, Users } from 'lucide-react';

const jobs = [
  { id: '1', title: 'Senior Full-Stack Engineer', dept: 'Engineering', location: 'Remote', type: 'Full-time' },
  { id: '2', title: 'Clinical Data Scientist', dept: 'Data Science', location: 'Remote', type: 'Full-time' },
  { id: '3', title: 'Product Manager - RPM', dept: 'Product', location: 'Remote', type: 'Full-time' },
  { id: '4', title: 'Healthcare Compliance Specialist', dept: 'Compliance', location: 'Austin, TX', type: 'Full-time' },
  { id: '5', title: 'Customer Success Manager', dept: 'Customer Success', location: 'Remote', type: 'Full-time' },
];

const benefits = [
  { icon: Heart, title: 'Health Coverage', desc: 'Medical, dental, vision for you and family' },
  { icon: Laptop, title: 'Remote-First', desc: 'Work from anywhere with flexible hours' },
  { icon: GraduationCap, title: 'Learning Budget', desc: '$5,000 annual for professional growth' },
  { icon: Users, title: 'Parental Leave', desc: '16 weeks paid leave for new parents' },
];

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-primary">VytalWatch</Link>
          <Link href="/auth/login"><Button size="sm">Sign In</Button></Link>
        </div>
      </header>

      <section className="py-20 bg-linear-to-br from-primary/10 to-emerald-50 dark:from-primary/5 dark:to-gray-900">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Join Our Mission</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">Help us transform healthcare through AI-powered remote patient monitoring</p>
        </div>
      </section>

      <section className="py-16 max-w-7xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Open Positions</h2>
        <div className="space-y-4">
          {jobs.map((job) => (
            <div key={job.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{job.title}</h3>
                  <div className="flex gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1"><Briefcase className="h-4 w-4" />{job.dept}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{job.location}</span>
                    <span>{job.type}</span>
                  </div>
                </div>
                <Button size="sm">Apply Now</Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">Benefits & Perks</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {benefits.map((b, i) => (
              <div key={i} className="text-center p-6">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <b.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{b.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-8 border-t border-gray-200 dark:border-gray-700">
        <p className="text-center text-gray-500">&copy; 2024 VytalWatch. All rights reserved.</p>
      </footer>
    </div>
  );
}
