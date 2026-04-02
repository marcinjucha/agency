// Hardcoded colors required — Satori/ImageResponse cannot resolve CSS variables.
// Values derived from globals.css theme tokens.
import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Sklep Olega'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F9F7F3',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {/* Steel blue accent line */}
        <div
          style={{
            width: 80,
            height: 4,
            backgroundColor: '#3B6497',
            borderRadius: 2,
            marginBottom: 32,
          }}
        />
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: '#252A30',
            letterSpacing: '-0.02em',
          }}
        >
          Sklep Olega
        </div>
        <div
          style={{
            fontSize: 24,
            color: '#6B7280',
            marginTop: 16,
          }}
        >
          Meble, elektronika i wiele więcej
        </div>
      </div>
    ),
    { ...size }
  )
}
