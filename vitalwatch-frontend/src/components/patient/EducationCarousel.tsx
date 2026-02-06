/**
 * EducationCarousel Component
 *
 * Health education content carousel.
 * @module components/patient/EducationCarousel
 */

'use client';

import React, { useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EducationContent {
  id: string;
  title: string;
  description: string;
  category: string;
  imageUrl?: string;
  readTime?: string;
  url?: string;
}

export interface EducationCarouselProps {
  content: EducationContent[];
  className?: string;
}

/**
 * EducationCarousel - Health education content
 */
export function EducationCarousel({ content, className }: EducationCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % content.length);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + content.length) % content.length);
  };

  if (content.length === 0) {
    return null;
  }

  const currentContent = content[currentIndex];

  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white p-6', className)}>
      <div className="mb-4 flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900">Health Education</h3>
      </div>

      <div className="relative">
        {currentContent.imageUrl && (
          <div className="mb-4 aspect-video w-full overflow-hidden rounded-lg bg-gray-100">
            <img
              src={currentContent.imageUrl}
              alt={currentContent.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="mb-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
              {currentContent.category}
            </span>
            {currentContent.readTime && (
              <span className="text-xs text-gray-500">{currentContent.readTime} read</span>
            )}
          </div>
          <h4 className="mb-2 text-lg font-semibold text-gray-900">
            {currentContent.title}
          </h4>
          <p className="text-sm text-gray-600">{currentContent.description}</p>
        </div>

        {currentContent.url && (
          <a
            href={currentContent.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Read More
            <ExternalLink className="h-3 w-3" />
          </a>
        )}

        {content.length > 1 && (
          <>
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={goToPrevious}
                className="rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100"
                aria-label="Previous"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <div className="flex gap-2">
                {content.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={cn(
                      'h-2 w-2 rounded-full transition-all',
                      index === currentIndex
                        ? 'w-6 bg-purple-600'
                        : 'bg-gray-300 hover:bg-gray-400'
                    )}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>

              <button
                onClick={goToNext}
                className="rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100"
                aria-label="Next"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-2 text-center text-xs text-gray-500">
              {currentIndex + 1} of {content.length}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default EducationCarousel;
