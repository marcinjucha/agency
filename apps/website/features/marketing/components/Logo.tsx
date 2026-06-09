// Halo Efekt brand lockup — the real social-media mark (PNG) + serif "Halo Efekt" wordmark.
// SINGLE source of truth for the brand lockup across the site (landing + global navbar + footer).
// The mark is served from /halo-efekt-logo.png (public/). The prototype linked to "#top";
// here it anchors to the page top via "#top" (the page renders a #top anchor at the top).
interface LogoProps {
  size?: number
  word?: boolean
}

export function Logo({ size = 30, word = true }: LogoProps) {
  return (
    <a href="#top" className="group flex items-center gap-2.5" aria-label="Halo Efekt">
      <img
        src="/halo-efekt-logo.png"
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
    </a>
  )
}
