/**
 * Privacy control interface — binds the markup in PrivacyCenter.astro,
 * PrivacyRoot.astro (banner + panel) to the consent gate.
 *
 * The page does the adjusting automatically: every switch applies the moment
 * it is flipped, the gate loads or stops tools, and render() brings every
 * control, message and list on the page back in line with what is actually
 * running. Nothing here decides a rule; the rules live in consent.ts.
 *
 * All text is written with textContent (never innerHTML) so tool names from the
 * registry cannot inject markup.
 */
import {
  CONSENT_MAX_AGE_DAYS,
  advertisingLockedByGpc,
  allowed,
  isSensitivePath,
  type ConsentAction,
  type ConsentChanges,
} from './consent';
import type { GateSnapshot, PrivacyGate } from './gate';
import type { Tracker } from './registry';

/** The switches in PrivacyCenter.astro (data-pc-toggle). `anonymous` is "anonymous usage statistics on". */
const TOGGLE_KEYS: readonly (keyof ConsentChanges)[] = [
  'anonymous',
  'analytics',
  'analyticsSensitive',
  'advertising',
  'advertisingSensitive',
];

const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T>(sel));

const COPY = {
  gpcDetected:
    'We detected your Global Privacy Control signal. We treat it as your choice to opt out of advertising, sale and sharing, so that setting is off.',
  gpcConflict:
    'Your browser’s Global Privacy Control signal says opt out, but you earlier chose to allow advertising on this site. We are following your browser’s signal. Do you want to allow advertising anyway?',
  gpcOverride: 'You chose to allow advertising even though your browser sends a Global Privacy Control signal.',
  storageBlocked:
    'We could not save your choice because your browser blocks storage. We will treat analytics and advertising as off.',
  advertisingLockedByGpc: 'Locked off because your browser sent a Global Privacy Control signal.',
  noTools: (label: string) => `No ${label} tool runs on this site today. If we add one, it stays off until you turn it on.`,
};

const ANON_SENTENCE =
  'Our own anonymous usage statistics set no cookie and keep no identifier, so they cannot identify you. They are on by default on every page, and you can turn them off in Your Privacy Choices.';

/** The note shown on a health-topic page, written from what the tool list can actually do there. */
export function sensitiveNote(trackers: readonly Tracker[]): string {
  const parts = ['This is a page about a health topic.'];
  if (showsAdsHealthSwitch(trackers)) {
    parts.push('Advertising tools run here only if you also allow advertising on health-topic pages.');
  }
  if (showsHealthSwitch(trackers)) parts.push('Other analytics runs here only if you also allow it on health-topic pages.');
  if (showsAnonymousRow(trackers)) {
    parts.push('Anonymous usage statistics, which set no cookie and keep no identifier, run here unless you turned them off.');
  }
  if (parts.length === 1) parts.push('No optional tool runs here unless you separately allow it.');
  return parts.join(' ');
}

/** The separate health-page analytics switch only means something when an analytics tool is subject to it. */
export function showsHealthSwitch(trackers: readonly Tracker[]): boolean {
  return trackers.some((t) => t.category === 'analytics' && !t.anonymous);
}

/** The separate health-page advertising switch only means something when an advertising tool exists. */
export function showsAdsHealthSwitch(trackers: readonly Tracker[]): boolean {
  return trackers.some((t) => t.category === 'advertising');
}

/** The "Anonymous usage statistics" row is shown only when such a tool exists. */
export function showsAnonymousRow(trackers: readonly Tracker[]): boolean {
  return trackers.some((t) => t.category === 'analytics' && t.anonymous === true);
}

/** The banner text, built from the tool list so it cannot promise what the code does not do. */
export function bannerCopy(trackers: readonly Tracker[]): string {
  if (trackers.length === 0) return '';
  const hasAnonymous = showsAnonymousRow(trackers);
  // Anonymous tools run by default with notice and an opt-out; the question is about the others.
  const asked = trackers.filter((t) => t.anonymous !== true);
  if (asked.length === 0) return hasAnonymous ? ANON_SENTENCE : '';
  const analytics = asked.filter((t) => t.category === 'analytics');
  const advertising = asked.filter((t) => t.category === 'advertising');
  const purposes = [
    analytics.length ? 'understand how our site is used' : '',
    advertising.length ? 'measure our ads' : '',
  ].filter(Boolean);
  const names = say(asked.map((t) => t.name));
  const parts = [
    `We would like to use ${names} to ${purposes.join(' and to ')}.`,
    'They stay off unless you say yes. Essential cookies always run.',
  ];
  if (analytics.length) parts.push('Analytics runs on pages about health topics only if you separately allow it.');
  if (advertising.length) {
    parts.push('Advertising runs on pages about health topics only if you separately allow that too; "Accept all" does not include it.');
  }
  if (hasAnonymous) parts.push(ANON_SENTENCE);
  return parts.join(' ');
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function say(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** What is actually running on this page, by name. A switch that is on with no tool behind it adds nothing. */
export function summarize(snap: GateSnapshot, trackers: readonly Tracker[]): string {
  const names = snap.loaded
    .map((id) => trackers.find((t) => t.id === id)?.name)
    .filter((n): n is string => Boolean(n));
  if (names.length === 0) return 'Right now on this page: essential tools only.';
  return `Right now on this page: ${say(['essential tools', ...names])}.`;
}

export function savedLine(snap: GateSnapshot): string {
  const s = snap.state;
  if (snap.storageBlocked) return COPY.storageBlocked;
  if (s.source === 'default' || s.source === 'gpc' || s.source === 'withdraw') {
    return 'No choice is saved yet. Optional tools stay off.';
  }
  return `Your choice is saved in this browser until ${formatDate(s.ts + CONSENT_MAX_AGE_DAYS * 86400000)}.`;
}

export function statusAfter(action: ConsentAction, snap: GateSnapshot): string {
  const s = snap.state;
  if (snap.storageBlocked) return COPY.storageBlocked;
  const state = (label: string, v: boolean) => `${label} is ${v ? 'on' : 'off'}`;
  switch (action.type) {
    case 'acceptAll':
      return s.gpc && !s.gpcOverride
        ? 'Saved in this browser. Analytics is on. Advertising stays off because your browser sent a Global Privacy Control signal.'
        : 'Saved in this browser. Analytics and advertising are on. Pages about health topics are included only if you separately allow them.';
    case 'rejectAll':
      return 'Saved in this browser. Analytics and advertising are off.';
    case 'withdrawAll':
      return 'All optional tools are off and your saved choice was deleted from this browser.';
    case 'set': {
      const health = (on: boolean, included: boolean) => (on ? `, health-topic pages ${included ? 'included' : 'not included'}` : '');
      const anon = 'anonymous' in action.changes ? ` Anonymous usage statistics are ${s.anonOptOut ? 'off' : 'on'}.` : '';
      return `Saved in this browser. ${state('Analytics', s.analytics)}${health(s.analytics, s.analyticsSensitive)}. ${state('Advertising', s.advertising)}${health(s.advertising, s.advertisingSensitive)}.${anon}`;
    }
    case 'gpcAllowAnyway':
      return 'Saved in this browser. Advertising is on, as you asked.';
    case 'gpcKeepOff':
      return 'Saved in this browser. Advertising stays off.';
    default:
      return 'Saved in this browser.';
  }
}

export interface UiOptions {
  gate: PrivacyGate;
  trackers: readonly Tracker[];
}

export function initPrivacyUI({ gate, trackers }: UiOptions): void {
  const dialog = document.querySelector<HTMLDialogElement>('[data-privacy-dialog]');
  const banner = document.querySelector<HTMLElement>('[data-privacy-banner]');
  let lastFocus: HTMLElement | null = null;
  let lastStatus = '';

  // ----------------------------------------------------------------- render
  function renderTools(center: HTMLElement, snap: GateSnapshot): void {
    // Anonymous tools are listed under their own row, the others under their category.
    const groups = {
      anonymous: trackers.filter((t) => t.category === 'analytics' && t.anonymous === true),
      analytics: trackers.filter((t) => t.category === 'analytics' && t.anonymous !== true),
      advertising: trackers.filter((t) => t.category === 'advertising'),
    };
    for (const category of ['anonymous', 'analytics', 'advertising'] as const) {
      const box = center.querySelector<HTMLElement>(`[data-pc-tools="${category}"]`);
      if (!box) continue;
      const list = groups[category];
      const rows = list.map((t) => {
        const running = snap.loaded.includes(t.id);
        const mayHere = allowed(snap.state, t.category, snap.path, t.anonymous === true);
        return { t, label: running ? 'Running now' : mayHere ? 'Starting' : 'Off', running };
      });
      // Rebuild only when the list or a status changed, so screen readers are not re-announced for nothing.
      const sig = rows.map((r) => `${r.t.id}:${r.label}`).join('|') || 'none';
      if (box.dataset.sig === sig) continue;
      box.dataset.sig = sig;
      box.replaceChildren();
      if (list.length === 0) {
        const p = document.createElement('p');
        p.textContent = COPY.noTools(category === 'analytics' && groups.anonymous.length ? 'other analytics' : category);
        box.append(p);
        continue;
      }
      const ul = document.createElement('ul');
      for (const { t, label, running } of rows) {
        const li = document.createElement('li');
        const name = document.createElement('strong');
        name.textContent = t.name;
        const detail = document.createElement('span');
        detail.textContent = ` (${t.vendor}). ${t.description}`;
        const chip = document.createElement('span');
        chip.className = 'pc-chip';
        chip.textContent = label;
        chip.dataset.state = running ? 'on' : 'off';
        li.append(name, detail, ' ', chip);
        ul.append(li);
      }
      box.append(ul);
    }
  }

  function render(snap: GateSnapshot): void {
    const s = snap.state;
    const locked = advertisingLockedByGpc(s);
    const sensitive = isSensitivePath(snap.path);

    for (const center of $$('[data-privacy-center]')) {
      const set = (sel: string, fn: (el: HTMLInputElement) => void) =>
        center.querySelectorAll<HTMLInputElement>(sel).forEach(fn);
      set('[data-pc-toggle="analytics"]', (el) => (el.checked = s.analytics));
      set('[data-pc-toggle="analyticsSensitive"]', (el) => {
        el.checked = s.analyticsSensitive;
        el.disabled = !s.analytics;
      });
      set('[data-pc-toggle="advertising"]', (el) => {
        el.checked = s.advertising && !locked;
        el.disabled = locked;
      });
      set('[data-pc-toggle="advertisingSensitive"]', (el) => {
        el.checked = s.advertisingSensitive;
        el.disabled = !s.advertising || locked;
      });
      set('[data-pc-toggle="anonymous"]', (el) => (el.checked = !s.anonOptOut));

      // Write only what changed: rewriting a live region with the same text makes screen readers repeat it.
      const text = (sel: string, value: string, alwaysShown = false) => {
        const el = center.querySelector<HTMLElement>(sel);
        if (!el) return;
        if (el.textContent !== value) el.textContent = value;
        const hide = !alwaysShown && value === '';
        if (el.hidden !== hide) el.hidden = hide;
      };
      text('[data-pc-summary]', summarize(snap, trackers));
      text('[data-pc-saved]', savedLine(snap));
      // The status region stays in the page so the first message is announced.
      text('[data-pc-status]', lastStatus, true);
      text('[data-pc-lock="advertising"]', locked ? COPY.advertisingLockedByGpc : '');
      text('[data-pc-sensitive-note]', sensitive ? sensitiveNote(trackers) : '');
      text('[data-pc-storage-blocked]', snap.storageBlocked ? COPY.storageBlocked : '');

      // Show a part only when a tool is subject to it; write only when it changes.
      const show = (sel: string, shown: boolean) => {
        const el = center.querySelector<HTMLElement>(sel);
        if (el && el.hidden === shown) el.hidden = !shown;
      };
      show('[data-pc-health-switch]', showsHealthSwitch(trackers));
      show('[data-pc-ads-health-switch]', showsAdsHealthSwitch(trackers));
      show('[data-pc-row="anonymous"]', showsAnonymousRow(trackers));

      // Global Privacy Control message and its two buttons.
      const gpcBox = center.querySelector<HTMLElement>('[data-pc-gpc]');
      if (gpcBox) {
        gpcBox.hidden = !s.gpc;
        const msg = gpcBox.querySelector<HTMLElement>('[data-pc-gpc-text]');
        const gpcText = s.gpcConflict ? COPY.gpcConflict : s.gpcOverride ? COPY.gpcOverride : COPY.gpcDetected;
        if (msg && msg.textContent !== gpcText) msg.textContent = gpcText;
        const allow = gpcBox.querySelector<HTMLElement>('[data-pc-action="gpcAllowAnyway"]');
        const keep = gpcBox.querySelector<HTMLElement>('[data-pc-action="gpcKeepOff"]');
        if (allow) allow.hidden = !s.gpcConflict && !(s.gpc && !s.gpcOverride);
        if (keep) keep.hidden = !s.gpcOverride && !s.gpcConflict;
      }
      renderTools(center, snap);
    }

    if (banner) {
      const hide = !(gate.hasNonEssential() && snap.promptReason !== null);
      if (hide && !banner.hidden && banner.contains(document.activeElement)) {
        // The banner is going away under the keyboard focus: put focus somewhere sensible.
        const main = document.getElementById('main');
        if (main) {
          main.setAttribute('tabindex', '-1');
          main.focus({ preventScroll: true });
        }
      }
      if (banner.hidden !== hide) banner.hidden = hide;
    }

    window.dispatchEvent(new CustomEvent('wp:privacy-change', { detail: snap }));
  }

  // ------------------------------------------------------------------ dialog
  function openDialog(trigger?: HTMLElement | null): void {
    if (!dialog || typeof dialog.showModal !== 'function') return;
    lastFocus = trigger ?? (document.activeElement as HTMLElement | null);
    if (!dialog.open) dialog.showModal();
    dialog.querySelector<HTMLElement>('[data-pc-close]')?.focus();
  }

  dialog?.addEventListener('close', () => lastFocus?.focus());
  dialog?.addEventListener('click', (e) => {
    // A click on the backdrop (the dialog element itself) closes it.
    if (e.target === dialog) dialog.close();
  });

  // ------------------------------------------------------------ interactions
  function dispatch(action: ConsentAction): void {
    gate.dispatch(action);
    lastStatus = statusAfter(action, gate.snapshot());
    render(gate.snapshot());
  }

  document.addEventListener('change', (e) => {
    const el = e.target as HTMLElement | null;
    if (!(el instanceof HTMLInputElement)) return;
    const key = el.dataset.pcToggle as keyof ConsentChanges | undefined;
    if (!key || !TOGGLE_KEYS.includes(key)) return;
    dispatch({ type: 'set', changes: { [key]: el.checked }, via: 'center' });
  });

  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    const open = target.closest<HTMLElement>('[data-privacy-open]');
    if (open) {
      const modified = (e as MouseEvent).metaKey || (e as MouseEvent).ctrlKey || (e as MouseEvent).shiftKey;
      const onPage = document.querySelector('[data-privacy-center][data-variant="page"]');
      if (onPage) {
        // Already on the full page: show it instead of stacking a panel on top.
        if (!modified) {
          e.preventDefault();
          onPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
      }
      if (!modified && dialog && typeof dialog.showModal === 'function') {
        e.preventDefault();
        openDialog(open);
      }
      return;
    }

    if (target.closest('[data-pc-close]')) {
      dialog?.close();
      return;
    }

    const act = target.closest<HTMLElement>('[data-pc-action]');
    if (act) {
      const type = act.dataset.pcAction as ConsentAction['type'];
      const via = act.closest('[data-privacy-banner]') ? 'banner' : 'center';
      if (type === 'acceptAll' || type === 'rejectAll') dispatch({ type, via });
      else if (type === 'withdrawAll' || type === 'gpcAllowAnyway' || type === 'gpcKeepOff') dispatch({ type });
      return;
    }

    if (target.closest('[data-privacy-choose]')) {
      openDialog(target.closest<HTMLElement>('[data-privacy-choose]'));
    }
  });

  // The banner text comes from the tool list, so it says what the code will actually do.
  const bannerText = banner?.querySelector<HTMLElement>('[data-pc-banner-text]');
  if (bannerText) bannerText.textContent = bannerCopy(trackers);

  // (Another tab changing the choice is handled by the gate's resync, wired in browser.ts.)
  gate.subscribe((snap) => render(snap));
  render(gate.snapshot());

  // If the banner is showing because a choice expired or the notice changed, log that once per session.
  try {
    if (banner && !banner.hidden && !sessionStorage.getItem('wp_reprompt_logged')) {
      gate.recordPrompt();
      sessionStorage.setItem('wp_reprompt_logged', '1');
    }
  } catch {
    /* storage may be blocked */
  }

  if (import.meta.env.DEV) {
    (window as Window & { wpPrivacy?: unknown }).wpPrivacy = { gate, open: () => openDialog() };
  }
}
