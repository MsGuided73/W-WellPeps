/**
 * Where WellPeps care is available (States We Serve page).
 *
 * Facts come from the released Medical Disclaimer set (A8, Block 8, verified 2026-10-02):
 * all 50 states, oral weight-loss tablets not in California, higher minimum ages in
 * Alabama, Nebraska and Mississippi, and a separate consumer health data policy for
 * Washington and Nevada. The District of Columbia is not on the list.
 *
 * Live video visits: the Practice schedules one when the clinician requires it or the
 * patient's state law requires it (owner, 2026-10-06). No per-state list is published
 * because none has been confirmed by the Practice.
 */

export interface StateInfo {
  name: string;
  code: string;
  /** Short note shown on the state chip; the full text is in STATE_NOTES. */
  note?: 'medication' | 'age' | 'privacy';
}

export const STATES: readonly StateInfo[] = [
  { name: 'Alabama', code: 'AL', note: 'age' },
  { name: 'Alaska', code: 'AK' },
  { name: 'Arizona', code: 'AZ' },
  { name: 'Arkansas', code: 'AR' },
  { name: 'California', code: 'CA', note: 'medication' },
  { name: 'Colorado', code: 'CO' },
  { name: 'Connecticut', code: 'CT' },
  { name: 'Delaware', code: 'DE' },
  { name: 'Florida', code: 'FL' },
  { name: 'Georgia', code: 'GA' },
  { name: 'Hawaii', code: 'HI' },
  { name: 'Idaho', code: 'ID' },
  { name: 'Illinois', code: 'IL' },
  { name: 'Indiana', code: 'IN' },
  { name: 'Iowa', code: 'IA' },
  { name: 'Kansas', code: 'KS' },
  { name: 'Kentucky', code: 'KY' },
  { name: 'Louisiana', code: 'LA' },
  { name: 'Maine', code: 'ME' },
  { name: 'Maryland', code: 'MD' },
  { name: 'Massachusetts', code: 'MA' },
  { name: 'Michigan', code: 'MI' },
  { name: 'Minnesota', code: 'MN' },
  { name: 'Mississippi', code: 'MS', note: 'age' },
  { name: 'Missouri', code: 'MO' },
  { name: 'Montana', code: 'MT' },
  { name: 'Nebraska', code: 'NE', note: 'age' },
  { name: 'Nevada', code: 'NV', note: 'privacy' },
  { name: 'New Hampshire', code: 'NH' },
  { name: 'New Jersey', code: 'NJ' },
  { name: 'New Mexico', code: 'NM' },
  { name: 'New York', code: 'NY' },
  { name: 'North Carolina', code: 'NC' },
  { name: 'North Dakota', code: 'ND' },
  { name: 'Ohio', code: 'OH' },
  { name: 'Oklahoma', code: 'OK' },
  { name: 'Oregon', code: 'OR' },
  { name: 'Pennsylvania', code: 'PA' },
  { name: 'Rhode Island', code: 'RI' },
  { name: 'South Carolina', code: 'SC' },
  { name: 'South Dakota', code: 'SD' },
  { name: 'Tennessee', code: 'TN' },
  { name: 'Texas', code: 'TX' },
  { name: 'Utah', code: 'UT' },
  { name: 'Vermont', code: 'VT' },
  { name: 'Virginia', code: 'VA' },
  { name: 'Washington', code: 'WA', note: 'privacy' },
  { name: 'West Virginia', code: 'WV' },
  { name: 'Wisconsin', code: 'WI' },
  { name: 'Wyoming', code: 'WY' },
];

export const NOTE_LABEL: Record<NonNullable<StateInfo['note']>, string> = {
  medication: 'medication limit',
  age: 'age requirement',
  privacy: 'privacy notice',
};

/** The state-specific notes, in the order shown under the grid. */
export const STATE_NOTES: readonly { states: string; note: string; link?: { href: string; label: string } }[] = [
  { states: 'California', note: 'Oral weight-loss tablets (semaglutide and tirzepatide) are not available to California residents. Weekly injections may be.' },
  { states: 'Alabama and Nebraska', note: 'You must be at least 19 years old.' },
  { states: 'Mississippi', note: 'You must be at least 21 years old.' },
  {
    states: 'Washington and Nevada',
    note: 'Your state gives you extra rights over consumer health data.',
    link: { href: '/consumer-health-data-privacy-policy', label: 'Consumer Health Data Privacy Policy' },
  },
];

export const STATES_LAST_UPDATED = 'October 8, 2026';
