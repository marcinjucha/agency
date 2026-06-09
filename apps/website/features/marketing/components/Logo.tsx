// Halo Efekt mark — serif H (ink) overlapping a serif E (primary/orange). Lora to match theme.
// Faithful port of project/landing/logo.jsx. The prototype linked to "#top"; here it
// anchors to the page top via "#top" too (the page renders a #top anchor at the top).
interface LogoProps {
  size?: number
  word?: boolean
}

export function Logo({ size = 30, word = true }: LogoProps) {
  return (
    <a href="#top" className="group flex items-center gap-2.5" aria-label="Halo Efekt">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{ display: 'block' }}>
        <text x="29" y="55" fontFamily="'Lora Variable', 'Lora', Georgia, serif" fontWeight="700" fontSize="60" fill="var(--color-primary)">
          E
        </text>
        <text x="0" y="44" fontFamily="'Lora Variable', 'Lora', Georgia, serif" fontWeight="700" fontSize="60" fill="#0a0a0a">
          H
        </text>
      </svg>
      {word && (
        <span className="serif text-[18px] tracking-[-0.01em] text-[var(--ink)]" style={{ fontWeight: 600 }}>
          Halo<span className="text-primary"> Efekt</span>
        </span>
      )}
    </a>
  )
}
