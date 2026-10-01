/**
 * Demo tools, loaded ONLY by `npm run dev` (import.meta.env.DEV), never in a
 * production build. They let you watch the privacy control work: turning a
 * switch on sets a harmless test cookie and marks the tool as running; turning
 * it off stops the tool and deletes the cookie. They contact no outside host.
 */
import type { Tracker } from './registry';

declare global {
  interface Window {
    __wpDemo?: Record<string, boolean>;
  }
}

function demo(id: string, name: string, category: 'analytics' | 'advertising', cookie: string, description: string): Tracker {
  return {
    id,
    name,
    vendor: 'WellPeps (demo only)',
    category,
    description,
    hosts: ['demo.invalid'],
    cookies: [cookie],
    storageKeys: [`${id}-store`],
    load() {
      document.cookie = `${cookie}=1; Path=/; Max-Age=3600; SameSite=Lax`;
      try {
        localStorage.setItem(`${id}-store`, '1');
      } catch {
        /* storage may be blocked */
      }
      (window.__wpDemo ??= {})[id] = true;
    },
    unload() {
      (window.__wpDemo ??= {})[id] = false;
    },
  };
}

export function demoTrackers(): Tracker[] {
  return [
    demo('demo-analytics', 'Demo analytics', 'analytics', '_demo_analytics', 'Pretend visit counter (development only). Sets one test cookie.'),
    demo('demo-advertising', 'Demo advertising', 'advertising', '_demo_ads', 'Pretend ad measurement tool (development only). Sets one test cookie.'),
  ];
}
