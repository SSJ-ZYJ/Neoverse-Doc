import { ImageResponse } from 'next/og';
import { SOCIAL_IMAGE } from '@/lib/site-config';

export const SOCIAL_CARD_SIZE = {
  width: SOCIAL_IMAGE.width,
  height: SOCIAL_IMAGE.height,
} as const;

export function createSocialCard(): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        alignItems: 'center',
        background:
          'radial-gradient(circle at 18% 15%, rgba(91, 212, 255, 0.34), transparent 34%), radial-gradient(circle at 82% 78%, rgba(123, 255, 196, 0.26), transparent 38%), linear-gradient(135deg, #07111f 0%, #0b1729 52%, #101c30 100%)',
        color: '#f5fbff',
        display: 'flex',
        height: '100%',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
        width: '100%',
      }}
    >
      <div
        style={{
          border: '1px solid rgba(175, 231, 255, 0.26)',
          borderRadius: 42,
          boxShadow: '0 30px 90px rgba(0, 0, 0, 0.38)',
          display: 'flex',
          flexDirection: 'column',
          height: 470,
          justifyContent: 'space-between',
          padding: '64px 72px',
          width: 1010,
        }}
      >
        <div
          style={{
            alignItems: 'center',
            color: '#9ddfff',
            display: 'flex',
            fontSize: 24,
            fontWeight: 600,
            gap: 16,
            letterSpacing: 5,
          }}
        >
          <span style={{ background: '#79e4ff', borderRadius: 999, height: 12, width: 12 }} />
          OPEN KNOWLEDGE NETWORK
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontSize: 88, fontWeight: 800, letterSpacing: -3 }}>Neoverse</span>
          <span style={{ color: '#b8ffd9', fontSize: 88, fontWeight: 800, letterSpacing: -3 }}>
            Docs
          </span>
        </div>

        <div
          style={{
            color: '#b6c7d9',
            display: 'flex',
            fontSize: 24,
            justifyContent: 'space-between',
            letterSpacing: 1,
          }}
        >
          <span>docs.shenshijun.space</span>
          <span>ZH · EN</span>
        </div>
      </div>
    </div>,
    SOCIAL_CARD_SIZE,
  );
}
