/**
 * The consent gate — the one place that decides whether a non-essential tool
 * may run, and the one place that starts and stops them.
 *
 * Everything the gate needs from the outside world is passed in (cookies, the
 * GPC signal, the page path, the tool list, the log), so the whole thing is
 * tested without a browser. See browser.ts for the real wiring.
 *
 * Guarantees (each has a test in gate.test.ts):
 *  - Nothing optional runs before a stored, current choice says so.
 *  - GPC is applied BEFORE any tool loads.
 *  - If anything throws, no optional tool runs (fail safe).
 *  - If the browser blocks storage, every choice is treated as "off".
 *  - Turning a tool off stops it in the same session and removes its cookies.
 *  - A choice made or withdrawn in another tab is picked up before the next
 *    change and whenever the tab is shown again (resync), so a stale tab can
 *    never undo a withdrawal.
 *  - A tool whose code fails to load is stopped, cleaned up and not retried
 *    until its category is switched off and on again.
 */
import {
  allowed,
  defaultState,
  parse,
  promptReason,
  reduce,
  serialize,
  CONSENT_MAX_AGE_DAYS,
  type ConsentAction,
  type ConsentState,
  type PromptReason,
} from './consent';
import { buildLogEvent, type ConsentLogAction, type ConsentLogEvent } from './log';
import { hasNonEssential, type Tracker } from './registry';

export interface GateDeps {
  now(): number;
  uuid(): string;
  userAgent?: string;
  cookies: {
    read(): string | null;
    write(value: string, maxAgeDays: number): void;
    /** Delete the visitor's saved choice (Withdraw all). */
    removeConsent(): void;
    /** Delete one named cookie set by a tool. */
    remove(name: string): void;
    /** False when the browser reports that cookies are disabled. */
    available?(): boolean;
  };
  removeStorage?(key: string): void;
  readGpc(): boolean;
  path(): string;
  trackers: readonly Tracker[];
  log(event: ConsentLogEvent): void;
}

export interface GateSnapshot {
  state: ConsentState;
  /** Ids of tools running right now. */
  loaded: string[];
  storageBlocked: boolean;
  promptReason: PromptReason | null;
  /** Advertising is off because of GPC and the visitor has not overridden it. */
  advertisingLockedByGpc: boolean;
  path: string;
}

export interface PrivacyGate {
  init(): void;
  getState(): ConsentState;
  snapshot(): GateSnapshot;
  loaded(): string[];
  storageBlocked(): boolean;
  promptReason(): PromptReason | null;
  hasNonEssential(): boolean;
  dispatch(action: ConsentAction): void;
  /** Re-read the saved choice (another tab may have changed or withdrawn it) and apply it. */
  resync(): void;
  navigate(path: string): void;
  /** Log that the banner was shown again because a choice expired or the notice changed. */
  recordPrompt(): void;
  subscribe(fn: (s: GateSnapshot) => void): () => void;
}

const LOG_FOR: Partial<Record<ConsentAction['type'], ConsentLogAction>> = {
  acceptAll: 'accept_all',
  rejectAll: 'reject_all',
  set: 'custom',
  withdrawAll: 'withdraw',
  gpcAllowAnyway: 'gpc_conflict_allow',
  gpcKeepOff: 'gpc_conflict_keep_off',
};

export function createGate(deps: GateDeps): PrivacyGate {
  const trackers = deps.trackers;
  const running = new Set<string>();
  /** Tools whose load() threw; not retried until their category is switched off. */
  const failed = new Set<string>();
  const listeners = new Set<(s: GateSnapshot) => void>();

  let currentPath = '/';
  let state: ConsentState = defaultState(deps.now(), deps.uuid());
  let prompt: PromptReason | null = 'first';
  let blocked = false;

  const makeLog = (s: ConsentState, action: ConsentLogAction) =>
    buildLogEvent(s, action, {
      now: deps.now(),
      uuid: deps.uuid,
      path: currentPath,
      userAgent: deps.userAgent ?? '',
    });

  const emit = (s: ConsentState, action: ConsentLogAction) => {
    try {
      deps.log(makeLog(s, action));
    } catch {
      /* logging must never break the page */
    }
  };

  /** Is this category switched on at all (ignoring which page we are on)? */
  const categoryOn = (category: 'analytics' | 'advertising'): boolean =>
    category === 'analytics' ? state.analytics : state.advertising && !(state.gpc && !state.gpcOverride);

  /**
   * Remove what a tool left behind when its category is OFF. This catches a
   * withdrawal made in another tab and anything stored before a choice existed.
   * A category that is on keeps its cookies on a health-topic page even though
   * the tool does not run there, so analytics is not reset page to page.
   */
  function sweepOff(): void {
    for (const t of trackers) {
      if (categoryOn(t.category)) continue;
      for (const c of t.cookies) safely(() => deps.cookies.remove(c));
      for (const k of t.storageKeys) safely(() => deps.removeStorage?.(k));
    }
  }

  const removeLeftovers = (t: Tracker) => {
    for (const c of t.cookies) safely(() => deps.cookies.remove(c));
    for (const k of t.storageKeys) safely(() => deps.removeStorage?.(k));
  };

  /** Make the running tools match the current choice for the current page. */
  function apply(): void {
    sweepOff();
    for (const t of trackers) {
      const may = !blocked && allowed(state, t.category, currentPath, t.anonymous === true);
      const isRunning = running.has(t.id);
      if (!may) failed.delete(t.id);
      if (may && !isRunning && !failed.has(t.id)) {
        try {
          t.load();
          running.add(t.id);
        } catch {
          // A vendor script failing must not stop the others, and must not be retried on every
          // later change. Stop it, remove whatever it left, and leave it off.
          failed.add(t.id);
          safely(() => t.unload());
          removeLeftovers(t);
        }
      } else if (!may && isRunning) {
        try {
          t.unload();
        } catch {
          /* still remove what it stored */
        } finally {
          running.delete(t.id);
          removeLeftovers(t);
        }
      }
    }
  }

  function snapshot(): GateSnapshot {
    return {
      state,
      loaded: [...running],
      storageBlocked: blocked,
      promptReason: currentPrompt(),
      advertisingLockedByGpc: state.gpc && !state.gpcOverride,
      path: currentPath,
    };
  }

  function currentPrompt(): PromptReason | null {
    if (!hasNonEssential(trackers)) return null;
    // A state made only by a GPC signal is not a choice the visitor made.
    if (prompt === null && state.source === 'gpc') return 'first';
    return prompt;
  }

  function notify(): void {
    const snap = snapshot();
    for (const fn of listeners) safely(() => fn(snap));
  }

  /** Write the choice and confirm the browser really kept this exact value (not an older one). */
  function persist(next: ConsentState): boolean {
    try {
      const wanted = serialize(next);
      deps.cookies.write(wanted, CONSENT_MAX_AGE_DAYS);
      const back = parse(deps.cookies.read(), deps.now());
      return back !== null && serialize(back) === wanted;
    } catch {
      return false;
    }
  }

  /**
   * Read the saved choice. Returns the state and the prompt that go with it:
   * nothing saved, expired or from an older notice means no consent.
   */
  function readSaved(): { state: ConsentState; prompt: PromptReason | null } {
    const stored = parse(deps.cookies.read(), deps.now());
    const reason = promptReason(stored, deps.now());
    if (stored && reason === null) return { state: stored, prompt: null };
    // Keep the same random id if there was one.
    return { state: defaultState(deps.now(), stored?.cid ?? state.cid), prompt: reason ?? 'first' };
  }

  /** Pick up a change made in another tab. Never writes and never logs. */
  function syncFromStorage(): void {
    if (blocked) return;
    const saved = readSaved();
    state = saved.state;
    prompt = saved.prompt;
    if (deps.readGpc()) state = reduce(state, { type: 'gpcDetected' }, state.ts);
  }

  function failSafe(): void {
    state = defaultState(deps.now(), state.cid);
    prompt = 'first';
    for (const t of trackers) {
      if (running.has(t.id)) {
        safely(() => t.unload());
        running.delete(t.id);
      }
    }
  }

  return {
    init() {
      try {
        currentPath = deps.path();
        if (deps.cookies.available && !deps.cookies.available()) blocked = true;

        const saved = readSaved();
        state = saved.state;
        prompt = saved.prompt;

        const gpc = deps.readGpc();
        if (gpc && !state.gpc) {
          state = reduce(state, { type: 'gpcDetected' }, deps.now());
          if (!blocked) blocked = !persist(state);
          if (!blocked) emit(state, 'gpc_auto_optout');
        } else if (gpc && state.gpc) {
          // Already recorded: re-apply the rule in case the stored value is stale; no new log row.
          state = reduce(state, { type: 'gpcDetected' }, state.ts);
        } else if (!gpc && state.gpc) {
          state = reduce(state, { type: 'gpcAbsent' }, deps.now());
          if (!blocked) blocked = !persist(state);
        }
      } catch {
        failSafe();
      }
      try {
        apply();
      } catch {
        failSafe();
      }
      notify();
    },

    getState: () => state,
    snapshot,
    loaded: () => [...running],
    storageBlocked: () => blocked,
    promptReason: currentPrompt,
    hasNonEssential: () => hasNonEssential(trackers),

    dispatch(action) {
      try {
        syncFromStorage();
        const next = reduce(state, action, deps.now());
        if (action.type === 'withdrawAll') {
          deps.cookies.removeConsent();
          // A new random id, so the withdrawal cannot be linked to what the visitor chooses next.
          state = { ...next, cid: deps.uuid() };
          prompt = 'first';
        } else {
          const ok = persist(next);
          if (!ok) {
            blocked = true;
            state = defaultState(deps.now(), state.cid);
          } else {
            blocked = false;
            state = next;
            prompt = null;
          }
        }
        const logAction = LOG_FOR[action.type];
        if (logAction && !blocked) emit(state, logAction);
      } catch {
        failSafe();
      }
      try {
        apply();
      } catch {
        failSafe();
      }
      notify();
    },

    resync() {
      try {
        syncFromStorage();
      } catch {
        failSafe();
      }
      try {
        apply();
      } catch {
        failSafe();
      }
      notify();
    },

    navigate(path) {
      currentPath = path;
      try {
        apply();
      } catch {
        failSafe();
      }
      notify();
    },

    recordPrompt() {
      const reason = currentPrompt();
      if (reason === 'expiry') emit(state, 'reprompt_after_expiry');
      else if (reason === 'version') emit(state, 'reprompt_after_version_change');
    },

    subscribe(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
  };
}

function safely(fn: () => void): void {
  try {
    fn();
  } catch {
    /* ignore */
  }
}
