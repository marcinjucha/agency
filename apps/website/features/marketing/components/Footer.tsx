'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { Button, Input } from '@agency/ui'
import {
  Github,
  Twitter,
  Linkedin,
  Facebook,
  Mail,
  ChevronRight
} from 'lucide-react'

/**
 * Footer Component
 *
 * Professional footer for the Legal Hub landing page with:
 * - Multiple columns of organized links
 * - Logo and company description
 * - Social media links
 * - Newsletter signup
 * - Copyright notice
 * - Responsive design (mobile, tablet, desktop)
 * - Dark styling with smooth hover effects
 */

const FOOTER_LINKS = {
  product: [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Security', href: '#security' },
    { label: 'FAQ', href: '#faq' }
  ],
  company: [
    { label: 'O nas', href: '/o-nas' },
    { label: 'Blog', href: '#blog' },
    { label: 'Press', href: '#press' },
    { label: 'Kontakt', href: '/kontakt' }
  ],
  legal: [
    { label: 'Warunki korzystania', href: '#terms' },
    { label: 'Polityka prywatności', href: '#privacy' },
    { label: 'GDPR', href: '#gdpr' },
    { label: 'Cookies', href: '#cookies' }
  ],
  resources: [
    { label: 'Documentation', href: '#docs' },
    { label: 'API', href: '#api' },
    { label: 'Support', href: '#support' },
    { label: 'Community', href: '#community' }
  ]
}

const SOCIAL_LINKS = [
  {
    icon: Github,
    href: 'https://github.com',
    label: 'GitHub',
    ariaLabel: 'Visit our GitHub'
  },
  {
    icon: Twitter,
    href: 'https://twitter.com',
    label: 'Twitter',
    ariaLabel: 'Visit our Twitter'
  },
  {
    icon: Linkedin,
    href: 'https://linkedin.com',
    label: 'LinkedIn',
    ariaLabel: 'Visit our LinkedIn'
  },
  {
    icon: Facebook,
    href: 'https://facebook.com',
    label: 'Facebook',
    ariaLabel: 'Visit our Facebook'
  }
]

function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!email) {
      setError('Please enter your email')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email')
      return
    }

    try {
      // TODO: Implement newsletter signup API
      await new Promise((resolve) => setTimeout(resolve, 500))
      setIsSubscribed(true)
      setEmail('')
      setTimeout(() => setIsSubscribed(false), 3000)
    } catch (err) {
      setError('Failed to subscribe. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubscribed}
          className="bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
          aria-label="Email address for newsletter"
        />
        <Button
          type="submit"
          disabled={isSubscribed}
          size="sm"
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
          aria-label="Subscribe to newsletter"
        >
          {isSubscribed ? (
            <span className="flex items-center gap-1">
              <span>✓</span>
            </span>
          ) : (
            <Mail className="w-4 h-4" />
          )}
        </Button>
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
      {isSubscribed && (
        <p className="text-primary text-xs">
          Thanks for subscribing! Check your email.
        </p>
      )}
    </form>
  )
}

function FooterColumn({
  title,
  links
}: {
  title: string
  links: Array<{ label: string; href: string }>
}) {
  return (
    <div>
      <h3 className="text-foreground font-semibold text-sm mb-4">{title}</h3>
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-muted-foreground hover:text-foreground transition-colors duration-200 text-sm flex items-center gap-1 group"
            >
              {link.label}
              <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SocialLinks() {
  return (
    <div className="flex items-center gap-4">
      {SOCIAL_LINKS.map((social) => {
        const Icon = social.icon
        return (
          <a
            key={social.label}
            href={social.href}
            aria-label={social.ariaLabel}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors duration-200"
            title={social.label}
          >
            <Icon className="w-5 h-5" />
            <span className="sr-only">{social.label}</span>
          </a>
        )
      })}
    </div>
  )
}

export function Footer() {
  return (
    <footer className="bg-card text-muted-foreground border-t border-border">
      {/* Main Footer Content */}
      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          {/* Top Section: Logo and Newsletter */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 pb-12 border-b border-border">
            {/* Brand Section */}
            <div>
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-foreground">Legal Hub</h2>
                <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                  Empower your law practice with AI-driven client qualification.
                  Streamline intake, qualify leads, and focus on winning cases.
                </p>
              </div>

              {/* Social Links */}
              <div className="mt-6">
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-3">
                  Follow us
                </p>
                <SocialLinks />
              </div>
            </div>

            {/* Newsletter Section */}
            <div className="md:flex md:flex-col md:justify-start">
              <div>
                <h3 className="text-foreground font-semibold text-sm mb-2">
                  Stay Updated
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Get the latest updates on features and news delivered to your
                  inbox.
                </p>
                <NewsletterForm />
              </div>
            </div>
          </div>

          {/* Links Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <FooterColumn title="Product" links={FOOTER_LINKS.product} />
            <FooterColumn title="Company" links={FOOTER_LINKS.company} />
            <FooterColumn title="Legal" links={FOOTER_LINKS.legal} />
            <FooterColumn
              title="Resources"
              links={FOOTER_LINKS.resources}
            />
          </div>
        </div>
      </div>

      {/* Copyright Section */}
      <div className="bg-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-muted-foreground text-sm text-center sm:text-left">
              © 2025 Legal Hub. All rights reserved.
            </p>

            {/* Footer Meta Links */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <a
                href="#sitemap"
                className="hover:text-foreground transition-colors duration-200"
              >
                Sitemap
              </a>
              <span className="text-muted-foreground/50">•</span>
              <a
                href="#status"
                className="hover:text-foreground transition-colors duration-200"
              >
                Status
              </a>
              <span className="text-muted-foreground/50">•</span>
              <a
                href="#security"
                className="hover:text-foreground transition-colors duration-200"
              >
                Security
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
