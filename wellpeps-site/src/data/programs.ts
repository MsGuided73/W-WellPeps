/** Wellness program cards (Section 4). Order matches the MASTER Guide. */
import { HAIR_COMING_SOON } from '../config';

export interface Program {
  slug: string;
  title: string;
  tagline: string;      // italic serif accent line
  blurb: string;
  image: string;
  imageAlt: string;
  status: 'live' | 'coming-soon';
  href: string;         // sub-page for the program (waitlist page when coming soon)
}

export const programs: Program[] = [
  {
    slug: 'weight-management',
    title: 'Weight Management',
    tagline: 'Feel Your Best',
    blurb: 'Personalized medical weight management designed to help you achieve sustainable, lasting results.',
    image: '/images/program-weight.webp',
    imageAlt: 'Woman running along the beach at sunrise',
    status: 'live',
    href: '/weight-loss',
  },
  {
    slug: 'hair-restoration',
    title: 'Hair Restoration',
    tagline: 'Rediscover Your Confidence',
    blurb: 'Provider-guided treatments to help regrow hair and restore natural confidence.',
    image: '/images/program-hair.webp',
    imageAlt: 'A smiling man in a white T-shirt outdoors on a sunny day',
    // Derived from the one launch switch so this card, the program page band,
    // and the product-card ribbons all flip together. Renders exactly like the
    // Hormone Optimization card while true.
    status: HAIR_COMING_SOON ? 'coming-soon' : 'live',
    // Points at the notify band rather than the top of the page, so the card's
    // "Notify Me" CTA lands on the form it promises.
    href: HAIR_COMING_SOON ? '/hair-restoration#hair-notify' : '/hair-restoration',
  },
  {
    slug: 'sexual-wellness',
    title: 'Sexual Wellness',
    tagline: 'Reconnect',
    blurb: 'Personalized solutions to improve performance, confidence, and intimacy.',
    image: '/images/program-sexual.webp',
    imageAlt: 'A smiling couple sharing a relaxed evening together',
    status: 'live',
    href: '/sexual-wellness',
  },
  {
    slug: 'wellness-longevity',
    title: 'Healthy Aging & Vitality',
    tagline: 'Thrive',
    blurb: 'Optimize your health, boost energy, and support long-term vitality.',
    image: '/images/program-longevity.webp',
    imageAlt: 'Woman hiking near a mountain lake',
    status: 'live',
    href: '/healthy-aging',
  },
  {
    slug: 'hormone-optimization',
    title: 'Hormone Optimization',
    tagline: 'Provider-Guided Care',
    blurb: 'Provider-guided testosterone therapy for men and menopause hormone therapy for women.',
    image: '/images/program-hormone.webp',
    imageAlt: 'Man smiling in a bright kitchen',
    // Available since 2026-11-10; the hub page links to the men's and women's program pages.
    status: 'live',
    href: '/hormone-optimization/',
  },
];
