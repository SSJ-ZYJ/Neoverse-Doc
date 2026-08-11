import { createSocialCard } from '@/lib/social-card';

export const dynamic = 'force-static';

export function GET() {
  return createSocialCard();
}
