import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: 'linear-gradient(135deg, #f7741d 0%, #f7b64f 100%)',
          color: 'white',
          fontFamily: 'Inter, Arial, sans-serif',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '62px 74px',
            width: '100%',
            zIndex: '1',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div
              style={{
                width: 92,
                height: 92,
                borderRadius: 22,
                background: 'rgba(255,255,255,0.16)',
                border: '2px solid rgba(255,255,255,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 44,
                fontWeight: 700,
              }}
            >
              m
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.02 }}>Mojo mobile</div>
              <div style={{ fontSize: 30, opacity: 0.92, marginTop: 8 }}>
                Мобильный интернет по всему миру
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 24,
              fontSize: 30,
              fontWeight: 500,
            }}
          >
            <div>eSIM • Быстрое подключение • 100+ стран</div>
            <div style={{ opacity: 0.92 }}>mojomobile.ru</div>
          </div>
        </div>
      </div>
    ),
    size,
  )
}
