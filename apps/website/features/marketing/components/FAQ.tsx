'use client'

/**
 * FAQ Accordion Component
 *
 * Displays frequently asked questions in an interactive accordion format.
 * Features:
 * - One question open by default (first item)
 * - Smooth open/close animations with max-height transition
 * - ChevronDown icon that rotates when expanded
 * - Keyboard accessible: Tab through items, Enter/Space to toggle
 * - Hover effects for better UX
 * - Responsive design: Full width on all screen sizes
 * - Semantic HTML with proper ARIA labels
 *
 * @module apps/website/features/marketing/components/FAQ
 */

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { FAQS } from '../data/faqs'

export function FAQ() {
  const [expandedId, setExpandedId] = useState<string>('faq-1')

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? '' : id)
  }

  return (
    <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-4xl mx-auto">
        {/* Section Heading */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Pytania i odpowiedzi
          </h2>
        </div>

        {/* Accordion Container */}
        <div className="space-y-0 border border-gray-200 rounded-lg overflow-hidden">
          {FAQS.map((faq, index) => {
            const isExpanded = expandedId === faq.id

            return (
              <div
                key={faq.id}
                className={`border-b last:border-b-0 ${
                  isExpanded ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
                } transition-colors`}
              >
                {/* Question Trigger */}
                <button
                  onClick={() => toggleExpanded(faq.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggleExpanded(faq.id)
                    }
                  }}
                  aria-expanded={isExpanded}
                  aria-controls={`faq-answer-${faq.id}`}
                  className="w-full px-6 py-4 flex items-start justify-between gap-4 hover:bg-opacity-50 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <span className="text-left text-lg font-semibold text-gray-900">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-600 flex-shrink-0 transition-transform duration-300 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>

                {/* Answer Content */}
                <div
                  id={`faq-answer-${faq.id}`}
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isExpanded ? 'max-h-96' : 'max-h-0'
                  }`}
                >
                  <div className="px-6 py-4 text-gray-600 leading-relaxed border-t border-gray-100">
                    {faq.answer}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
