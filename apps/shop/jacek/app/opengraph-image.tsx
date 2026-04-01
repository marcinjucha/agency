import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Książki Jacka'
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
          backgroundColor: 'hsl(20, 10%, 6%)',
          fontFamily: 'Georgia, serif',
        }}
      >
        {/* Amber accent line */}
        <div
          style={{
            width: 80,
            height: 4,
            backgroundColor: 'hsl(36, 90%, 50%)',
            borderRadius: 2,
            marginBottom: 32,
          }}
        />
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: 'hsl(30, 15%, 88%)',
            letterSpacing: '-0.02em',
          }}
        >
          Książki Jacka
        </div>
        <div
          style={{
            fontSize: 24,
            color: 'hsl(25, 10%, 50%)',
            marginTop: 16,
          }}
        >
          Autorskie publikacje i materiały edukacyjne
        </div>
      </div>
    ),
    { ...size }
  )
}
