/**
 * The optional tools named in the published Cookie and Tracking Technologies
 * Notice (docs/Legal Docs — Cookie notice, tables for analytics and advertising).
 *
 * Keep this list in step with the notice. notice-inventory.test.ts compares it
 * with the tool registry, so adding a tool to the registry without naming it in
 * the notice (and here) fails the build, and so does the reverse.
 *
 * Today the notice names one optional tool: Curve Compliance, advert measurement (2026-11-13).
 */
import type { ConsentCategory } from './consent';
import { CURVE_TRACKER_ID } from './trackers/curve';

export const NOTICE_TOOL_IDS: Record<ConsentCategory, string[]> = {
  analytics: [],
  advertising: [CURVE_TRACKER_ID],
};
