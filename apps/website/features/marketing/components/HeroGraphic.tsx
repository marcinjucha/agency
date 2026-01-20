/**
 * HeroGraphic Component
 *
 * Placeholder graphic/illustration for the hero section.
 * Features SVG shapes with gradient styling and subtle animations.
 *
 * Currently displays:
 * - Animated gradient background shapes
 * - Legal/business themed illustration elements
 * - Responsive SVG that scales with container
 *
 * TODO: Replace with actual illustration or photography
 *
 * @module apps/website/features/marketing/components/HeroGraphic
 */

export function HeroGraphic() {
  return (
    <div className="relative w-full max-w-md h-96 flex items-center justify-center">
      {/* Background gradient shapes */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 400 400"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        {/* Define gradients */}
        <defs>
          <linearGradient id="heroGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="heroGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
          </linearGradient>
          <filter id="blur">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
          </filter>
        </defs>

        {/* Large background circle */}
        <circle cx="200" cy="200" r="180" fill="url(#heroGrad1)" />

        {/* Accent circles */}
        <circle cx="320" cy="80" r="60" fill="url(#heroGrad2)" opacity="0.6" />
        <circle cx="100" cy="300" r="50" fill="url(#heroGrad2)" opacity="0.5" />

        {/* Document/Form illustration */}
        <g className="animate-bounce" style={{ animationDuration: '3s' }}>
          {/* Main document card */}
          <rect
            x="120"
            y="100"
            width="160"
            height="200"
            rx="12"
            fill="white"
            stroke="#3b82f6"
            strokeWidth="2"
            filter="drop-shadow(0 10px 20px rgba(59, 130, 246, 0.1))"
          />

          {/* Document lines */}
          <line x1="140" y1="130" x2="240" y2="130" stroke="#3b82f6" strokeWidth="2" />
          <line x1="140" y1="155" x2="240" y2="155" stroke="#dbeafe" strokeWidth="2" />
          <line x1="140" y1="175" x2="240" y2="175" stroke="#dbeafe" strokeWidth="2" />
          <line x1="140" y1="195" x2="220" y2="195" stroke="#dbeafe" strokeWidth="2" />

          {/* Checkmark */}
          <circle cx="260" cy="130" r="20" fill="#10b981" opacity="0.9" />
          <path
            d="M 256 130 L 259 133 L 264 128"
            stroke="white"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Calendar element */}
        <g className="animate-pulse" style={{ animationDuration: '2s' }}>
          <rect
            x="200"
            y="240"
            width="80"
            height="70"
            rx="8"
            fill="#dbeafe"
            stroke="#3b82f6"
            strokeWidth="1.5"
            opacity="0.8"
          />
          {/* Calendar grid */}
          <circle cx="215" cy="250" r="3" fill="#3b82f6" />
          <circle cx="230" cy="250" r="3" fill="#3b82f6" />
          <circle cx="245" cy="250" r="3" fill="#3b82f6" />
          <circle cx="215" cy="270" r="3" fill="#3b82f6" />
          <circle cx="230" cy="270" r="3" fill="#10b981" />
          <circle cx="245" cy="270" r="3" fill="#3b82f6" />
        </g>

        {/* Automation arrow */}
        <g className="animate-pulse" style={{ animationDuration: '2.5s' }}>
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
            </marker>
          </defs>
          <path
            d="M 290 170 Q 320 170, 330 200"
            stroke="#3b82f6"
            strokeWidth="2.5"
            fill="none"
            markerEnd="url(#arrowhead)"
            strokeDasharray="5,5"
            opacity="0.7"
          />
        </g>
      </svg>

      {/* Floating label - "Automatyzacja" */}
      <div className="absolute bottom-12 right-0 bg-card px-4 py-2 rounded-lg shadow-lg border border-primary/10 animate-bounce" style={{ animationDelay: '0.5s' }}>
        <p className="text-sm font-semibold text-primary">Automatyzacja 24/7</p>
      </div>
    </div>
  )
}
