/** Wellness program cards (Section 4). Order matches the MASTER Guide. */
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
    image: '/images/program-weight.jpg',
    imageAlt: 'Woman running along the beach at sunrise',
    status: 'live',
    href: '/weight-loss',
  },
  {
    slug: 'hair-restoration',
    title: 'Hair Restoration',
    tagline: 'Rediscover Your Confidence',
    blurb: 'Provider-guided treatments to help regrow hair and restore natural confidence.',
    image: '/images/program-hair.jpg',
    imageAlt: 'Smiling man outdoors',
    status: 'live',
    href: '/hair-restoration',
  },
  {
    slug: 'sexual-wellness',
    title: 'Sexual Wellness',
    tagline: 'Reconnect',
    blurb: 'Personalized solutions to improve performance, confidence, and intimacy.',
    image: '/images/program-sexual.jpg',
    imageAlt: 'Happy couple together',
    status: 'live',
    href: '/sexual-wellness',
  },
  {
    slug: 'wellness-longevity',
    title: 'Wellness & Longevity',
    tagline: 'Thrive',
    blurb: 'Optimize your health, boost energy, and support long-term vitality.',
    image: '/images/program-longevity.jpg',
    imageAlt: 'Woman hiking near a mountain lake',
    status: 'live',
    href: '/peptides',
  },
  {
    slug: 'hormone-optimization',
    title: 'Hormone Optimization',
    tagline: 'Feel Like Yourself Again',
    blurb: 'Balance hormones and support your body so you can feel like yourself again.',
    image: '/images/program-hormone.jpg',
    imageAlt: 'Man smiling in a bright kitchen',
    status: 'coming-soon',
    href: '/hormone-optimization',
  },
  {
    slug: 'mental-wellness',
    title: 'Mental Wellness',
    tagline: 'Find Your Balance',
    blurb: 'Support your mental well-being, reduce stress, and improve your everyday life.',
    image: '/images/program-mental.jpg',
    imageAlt: 'Woman relaxing outdoors at golden hour',
    status: 'coming-soon',
    href: '/mental-wellness',
  },
];
