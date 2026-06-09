// Halo Efekt brand lockup — the real social-media mark (transparent SVG) + serif "Halo Efekt"
// wordmark. SINGLE source of truth for the brand lockup across the site (landing + global navbar
// + footer). The mark is served from /logo.svg (public/, transparent background — no white box on
// tinted sections). Links to the landing ("/") so it doubles as "back to home" from the blog and
// other routes (the homepage has no nav home link).
import { Link } from '@tanstack/react-router'

interface LogoProps {
  size?: number
  word?: boolean
}

export function Logo({ size = 30, word = true }: LogoProps) {
  return (
    <Link to="/" className="group flex items-center gap-2.5" aria-label="Halo Efekt — strona główna">
      <img
        src="/logo.svg"
        alt="Halo Efekt"
        width={size}
        height={size}
        className="block object-contain"
        style={{ width: size, height: size }}
      />
      {word && (
        <span className="serif text-[18px] tracking-[-0.01em] text-[var(--ink)]" style={{ fontWeight: 600 }}>
          Halo<span className="text-primary"> Efekt</span>
        </span>
      )}
    </Link>
  )
}
