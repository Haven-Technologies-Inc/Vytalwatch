'use client';

import { useState, useCallback, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { useToast } from '@/hooks/useToast';
import {
  BookOpen,
  Play,
  Clock,
  Search,
  Heart,
  Pill,
  Activity,
  Apple,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Article {
  id: string;
  title: string;
  description: string;
  category: string;
  type: 'article' | 'video';
  duration: string;
  completed: boolean;
  thumbnail?: string;
}

const categories = [
  { id: 'all', label: 'All', icon: BookOpen },
  { id: 'heart', label: 'Heart Health', icon: Heart },
  { id: 'medication', label: 'Medications', icon: Pill },
  { id: 'vitals', label: 'Understanding Vitals', icon: Activity },
  { id: 'nutrition', label: 'Nutrition', icon: Apple },
];

const staticArticles: Article[] = [
  { id: '1', title: 'Understanding Your Blood Pressure Readings', description: 'Learn what systolic and diastolic numbers mean and when to be concerned.', category: 'vitals', type: 'article', duration: '5 min read', completed: false },
  { id: '2', title: 'Managing Hypertension Through Lifestyle Changes', description: 'Practical tips for lowering blood pressure naturally.', category: 'heart', type: 'video', duration: '8 min', completed: false },
  { id: '3', title: 'Taking Your Medications Safely', description: 'Important guidelines for managing multiple medications.', category: 'medication', type: 'article', duration: '6 min read', completed: false },
  { id: '4', title: 'Heart-Healthy Diet Basics', description: 'Simple dietary changes that can improve your heart health.', category: 'nutrition', type: 'video', duration: '12 min', completed: false },
  { id: '5', title: 'Recognizing Warning Signs', description: 'When to seek immediate medical attention for your condition.', category: 'heart', type: 'article', duration: '4 min read', completed: false },
  { id: '6', title: 'How Remote Monitoring Helps You', description: 'Understanding how your device readings support your care.', category: 'vitals', type: 'video', duration: '6 min', completed: false },
];

export default function PatientEducationPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate initial loading state, then show static content
  useEffect(() => {
    const timer = setTimeout(() => {
      setArticles(staticArticles);
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleArticleClick = useCallback((article: Article) => {
    if (!article.completed) {
      setArticles(prev => prev.map(a =>
        a.id === article.id ? { ...a, completed: true } : a
      ));
    }
    toast({
      title: article.type === 'video' ? 'Playing video' : 'Opening article',
      description: article.title,
      type: 'info'
    });
  }, [toast]);

  const filteredArticles = articles.filter((a) => {
    if (selectedCategory !== 'all' && a.category !== selectedCategory) return false;
    if (searchQuery && !a.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const completedCount = articles.filter((a) => a.completed).length;
  const progress = articles.length > 0 ? Math.round((completedCount / articles.length) * 100) : 0;

  if (isLoading) {
    return (
      <DashboardLayout>
        <LoadingState message="Loading educational content..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Health Education</h1>
          <p className="mt-1 text-sm text-gray-500">Learn more about managing your health</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-500">Your Progress</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{completedCount} of {articles.length} completed</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-3 w-48 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{progress}%</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                selectedCategory === cat.id
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              )}
            >
              <cat.icon className="h-4 w-4" />
              {cat.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredArticles.map((article) => (
            <div
              key={article.id}
              onClick={() => handleArticleClick(article)}
              className="group cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-primary/5">
                <div className="absolute inset-0 flex items-center justify-center">
                  {article.type === 'video' ? (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-primary shadow-lg">
                      <Play className="h-6 w-6 ml-1" />
                    </div>
                  ) : (
                    <BookOpen className="h-12 w-12 text-primary/50" />
                  )}
                </div>
                {article.completed && (
                  <div className="absolute right-3 top-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant={article.type === 'video' ? 'info' : 'secondary'}>
                    {article.type === 'video' ? 'Video' : 'Article'}
                  </Badge>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    {article.duration}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-primary dark:text-white">
                  {article.title}
                </h3>
                <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                  {article.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {filteredArticles.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
            <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-gray-500">No articles found matching your search.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
