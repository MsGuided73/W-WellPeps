/**
 * Dev-only Tweak panel: pick an element on the page, change its wording, colours,
 * size, spacing or visibility, see the result live, then copy a change list that
 * names the source file and line for each change.
 *
 * Preview only. Nothing is written to the site's files or sent anywhere; changes
 * are inline styles on this page (kept in this browser so a reload keeps them).
 * Loaded by TweakPanel.astro under `astro dev` and never in a production build.
 * Toggle with Alt+T. All the logic that can be tested without a browser is in
 * tweaks.ts; scripts/tweak-panel-check.mjs drives this file in a real browser.
 */
import {
  FIELDS,
  HIDE_PROP,
  colorToHex,
  formatChangeList,
  isEmptyChange,
  labelFor,
  newChange,
  parseStored,
  pxNumber,
  selectorCandidates,
  serializeChanges,
  sourceLabel,
  storageKey,
  withProp,
  withText,
  type ElementChange,
  type FieldDef,
  type PathNode,
} from './tweaks';
import { TWEAK_CSS } from './tweak-panel-css';

const HOST_TAG = 'wp-tweak-panel';

interface Tracked {
  el: Element;
  change: ElementChange;
  styleBefore: string | null;
  htmlBefore: string;
  textBefore: string;
  hadMarkup: boolean;
}

/** Computed property to read for the field's starting value, where it differs from the property written. */
const READ_AS: Readonly<Record<string, string>> = { gap: 'column-gap' };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

function init() {
  if (document.querySelector(HOST_TAG)) return;

  const tracked = new Map<Element, Tracked>();
  let selected: Element | null = null;
  let hovered: Element | null = null;
  let picking = false;
  let open = false;
  let overlayQueued = false;

  const host = document.createElement(HOST_TAG);
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <style>${TWEAK_CSS}</style>
    <button class="pill" data-pill aria-label="Open the Tweak panel (Alt+T)">&#9998; Tweak <span class="badge" data-badge hidden>0</span></button>
    <div class="panel" data-panel hidden role="dialog" aria-label="Tweak panel">
      <header>
        <strong>Tweak</strong>
        <button data-pick title="Click an element on the page to select it (Esc stops)">Pick</button>
        <button data-move title="Move to the other side">&#8644;</button>
        <button data-close title="Close (Alt+T)">&ndash;</button>
      </header>
      <div class="body">
        <p class="hint" data-hint></p>
        <section data-selected></section>
        <section data-changes></section>
        <section>
          <div class="row">
            <button class="primary" data-copy>Copy change list</button>
            <button data-reset-all>Reset all</button>
          </div>
          <p class="hint" data-copied aria-live="polite"></p>
          <details><summary>Preview the list</summary><textarea readonly data-out></textarea></details>
        </section>
      </div>
    </div>
    <div class="box hover" data-hover hidden><span></span></div>
    <div class="box sel" data-sel hidden><span></span></div>`;
  document.body.appendChild(host);

  const q = <T extends HTMLElement>(s: string) => root.querySelector<T>(s) as T;
  const pill = q('[data-pill]');
  const badge = q('[data-badge]');
  const panel = q('[data-panel]');
  const pickBtn = q('[data-pick]');
  const hint = q('[data-hint]');
  const selectedSec = q('[data-selected]');
  const changesSec = q('[data-changes]');
  const out = q<HTMLTextAreaElement>('[data-out]');
  const copied = q('[data-copied]');
  const hoverBox = q('[data-hover]');
  const selBox = q('[data-sel]');

  // ---- describing an element ----------------------------------------------

  function toPathNode(el: Element): PathNode {
    const parent = el.parentElement;
    const same = parent ? Array.from(parent.children).filter((c) => c.tagName === el.tagName) : [el];
    return {
      tag: el.tagName,
      id: el.id,
      classes: Array.from(el.classList),
      nth: same.indexOf(el) + 1,
      ofType: same.length,
      parent: parent && parent !== document.documentElement ? toPathNode(parent) : null,
    };
  }

  function selectorFor(el: Element): string {
    const list = selectorCandidates(toPathNode(el));
    for (const s of list) {
      try {
        if (document.querySelectorAll(s).length === 1) return s;
      } catch {
        /* a selector the browser rejects is skipped */
      }
    }
    return list[list.length - 1] ?? el.tagName.toLowerCase();
  }

  function describe(el: Element) {
    const stamped = el.closest('[data-astro-source-file]');
    const base = stamped ? sourceLabel(stamped.getAttribute('data-astro-source-file'), stamped.getAttribute('data-astro-source-loc')) : null;
    const source = base && stamped !== el ? `${base} (nearest component)` : base;
    return { label: labelFor(el.tagName, el.textContent ?? ''), selector: selectorFor(el), source };
  }

  // ---- tracking changes ----------------------------------------------------

  function track(el: Element): Tracked {
    const found = tracked.get(el);
    if (found) return found;
    const info = describe(el);
    const t: Tracked = {
      el,
      change: newChange(info.selector, info.source, info.label),
      styleBefore: el.getAttribute('style'),
      htmlBefore: el.innerHTML,
      textBefore: el.textContent ?? '',
      hadMarkup: el.children.length > 0,
    };
    tracked.set(el, t);
    return t;
  }

  function putBack(t: Tracked) {
    if (t.styleBefore === null) t.el.removeAttribute('style');
    else t.el.setAttribute('style', t.styleBefore);
    if (t.change.text) t.el.innerHTML = t.htmlBefore;
    t.el.removeAttribute('contenteditable');
  }

  const changed = () => Array.from(tracked.values()).filter((t) => !isEmptyChange(t.change));

  function save() {
    try {
      localStorage.setItem(storageKey(location.pathname), serializeChanges(changed().map((t) => t.change)));
    } catch {
      /* storage blocked: the preview still works, it just will not survive a reload */
    }
  }

  function afterChange(el: Element) {
    const t = tracked.get(el);
    if (t && isEmptyChange(t.change)) {
      putBack(t);
      tracked.delete(el);
    }
    save();
    renderChanges();
    syncRevertButtons();
    scheduleOverlay();
  }

  function setProp(el: Element, prop: string, value: string) {
    const t = track(el);
    const before = getComputedStyle(el).getPropertyValue(READ_AS[prop] ?? prop);
    if (value === '') (el as HTMLElement).style.removeProperty(prop);
    else (el as HTMLElement).style.setProperty(prop, value, 'important');
    tracked.set(el, { ...t, change: withProp(t.change, prop, before, value) });
    afterChange(el);
  }

  function setText(el: Element, value: string) {
    const t = track(el);
    if (!(el as HTMLElement).isContentEditable) el.textContent = value;
    tracked.set(el, { ...t, change: withText(t.change, t.textBefore, value, t.hadMarkup) });
    afterChange(el);
  }

  // ---- the selected element's form -----------------------------------------

  function fieldValue(el: Element, f: FieldDef): string {
    const raw = getComputedStyle(el).getPropertyValue(READ_AS[f.prop] ?? f.prop);
    if (f.kind === 'color') return colorToHex(raw) || '#ffffff';
    if (f.kind === 'px') {
      const n = pxNumber(raw);
      return n === null ? '' : String(Math.round(n * 100) / 100);
    }
    return raw.trim();
  }

  function fieldHtml(el: Element, f: FieldDef): string {
    const v = fieldValue(el, f);
    let control: string;
    if (f.kind === 'color') control = `<input type="color" data-f="${f.prop}" value="${esc(v)}">`;
    else if (f.kind === 'select') {
      const opts = f.options ?? [];
      const list = opts.includes(v) || v === '' ? opts : [v, ...opts];
      control = `<select data-f="${f.prop}">${list.map((o) => `<option value="${esc(o)}"${o === v ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    } else {
      const step = f.step ?? 1;
      control = `<input type="number" data-f="${f.prop}" value="${esc(v)}" step="${step}" min="${f.min ?? ''}" max="${f.max ?? ''}" placeholder="${f.kind === 'px' ? 'px' : ''}">`;
    }
    return `<label class="fld"><span>${esc(f.label)}</span>${control}<button class="rv" data-rv="${f.prop}" title="Put this one back" hidden>&#8634;</button></label>`;
  }

  function renderSelected() {
    const el = selected;
    if (!el || !el.isConnected) {
      selectedSec.innerHTML = '<p class="hint">Nothing selected yet. Press <b>Pick</b>, then click an element on the page.</p>';
      return;
    }
    const info = describe(el);
    const textOnly = el.children.length === 0 && (el.textContent ?? '').trim() !== '';
    const t = tracked.get(el);
    const current = t?.change.text?.after ?? el.textContent ?? '';
    const groups = (['Text', 'Box', 'Layout'] as const)
      .map((g) => `<h4>${g}</h4>${FIELDS.filter((f) => f.group === g).map((f) => fieldHtml(el, f)).join('')}`)
      .join('');
    const hidden = t?.change.props[HIDE_PROP]?.after === 'none';
    selectedSec.innerHTML = `
      <div class="card"><div class="lbl">${esc(info.label)}</div><code>${esc(info.selector)}</code><div class="src">${esc(info.source ?? 'no source stamp on this element')}</div></div>
      <div class="row" style="margin-top:6px"><button data-parent title="Select the element around this one"${el.parentElement && el.parentElement !== document.body ? '' : ' disabled'}>&uarr; Select parent</button></div>
      <h4>Wording</h4>
      ${textOnly ? `<textarea data-text aria-label="Text">${esc(current)}</textarea>` : '<p class="hint">This element holds other elements. Edit its words directly on the page.</p>'}
      <div class="row" style="margin-top:6px"><button data-edit>Edit on the page</button></div>
      ${groups}
      <h4>Visibility</h4>
      <label class="check"><input type="checkbox" data-hide ${hidden ? 'checked' : ''}> Hide this element</label>
      <div class="row" style="margin-top:8px"><button data-undo>Undo this element</button></div>`;
    syncRevertButtons();
  }

  /** Shows the small "put back" arrow only on fields that have been changed. */
  function syncRevertButtons() {
    const t = selected ? tracked.get(selected) : undefined;
    selectedSec.querySelectorAll<HTMLElement>('[data-rv]').forEach((b) => {
      b.hidden = !t?.change.props[b.dataset.rv ?? ''];
    });
  }

  function renderChanges() {
    const list = changed();
    badge.hidden = list.length === 0;
    badge.textContent = String(list.length);
    changesSec.innerHTML = list.length
      ? `<h4>Changed on this page (${list.length})</h4><div class="list">${list
          .map((t, i) => `<button class="item${t.el === selected ? ' cur' : ''}" data-goto="${i}"><span>${esc(t.change.label)}</span><span class="n">${Object.keys(t.change.props).length + (t.change.text ? 1 : 0)} change${Object.keys(t.change.props).length + (t.change.text ? 1 : 0) === 1 ? '' : 's'}</span></button>`)
          .join('')}</div>`
      : '';
    out.value = formatChangeList({ page: location.pathname, viewport: window.innerWidth, changes: list.map((t) => t.change) });
  }

  // ---- overlays -------------------------------------------------------------

  function place(box: HTMLElement, el: Element | null, label: string) {
    if (!el || !el.isConnected) {
      box.hidden = true;
      return;
    }
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    Object.assign(box.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    const chip = box.querySelector('span');
    if (chip) {
      chip.textContent = label;
      chip.style.top = r.top < 24 ? '2px' : '-22px';
    }
  }

  function tag(el: Element, r = el.getBoundingClientRect()) {
    const cls = typeof el.className === 'string' && el.className ? `.${el.className.split(/\s+/)[0]}` : '';
    return `${el.tagName.toLowerCase()}${cls} · ${Math.round(r.width)}×${Math.round(r.height)}`;
  }

  function overlay() {
    overlayQueued = false;
    place(hoverBox, picking && hovered !== selected ? hovered : null, hovered ? tag(hovered) : '');
    place(selBox, open ? selected : null, selected ? tag(selected) : '');
  }
  function scheduleOverlay() {
    if (overlayQueued) return;
    overlayQueued = true;
    requestAnimationFrame(overlay);
  }

  // ---- picking --------------------------------------------------------------

  const isPanelEvent = (e: Event) => e.composedPath().includes(host);
  const pageTarget = (e: Event): Element | null => {
    const t = e.target;
    if (!(t instanceof Element) || t === document.documentElement || t.closest('astro-dev-toolbar')) return null;
    return t;
  };

  function setPicking(on: boolean) {
    picking = on;
    pickBtn.classList.toggle('on', on);
    hint.textContent = on ? 'Click anything on the page to select it. Esc stops picking.' : '';
    if (!on) hovered = null;
    scheduleOverlay();
  }

  function select(el: Element) {
    selected = el;
    renderSelected();
    renderChanges();
    scheduleOverlay();
  }

  function onMove(e: MouseEvent) {
    if (!picking || isPanelEvent(e)) return;
    hovered = pageTarget(e);
    scheduleOverlay();
  }
  // While picking, a click selects instead of following a link or pressing a button.
  function swallow(e: Event) {
    if (!picking || isPanelEvent(e)) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'click') {
      const el = pageTarget(e);
      if (el) select(el);
    }
  }

  // ---- editing words on the page --------------------------------------------

  function startEdit(el: Element) {
    track(el);
    setPicking(false);
    const node = el as HTMLElement;
    node.setAttribute('contenteditable', 'true');
    node.focus();
    const range = document.createRange();
    range.selectNodeContents(node);
    const sel = getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    const finish = () => {
      node.removeEventListener('keydown', onKey);
      node.removeAttribute('contenteditable');
      setText(el, node.textContent ?? '');
      renderSelected();
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'Enter' && !e.shiftKey) || e.key === 'Escape') {
        e.preventDefault();
        node.blur();
      }
    };
    node.addEventListener('keydown', onKey);
    node.addEventListener('blur', finish, { once: true });
    node.addEventListener('input', () => {
      const t = tracked.get(el);
      if (t) tracked.set(el, { ...t, change: withText(t.change, t.textBefore, node.textContent ?? '', t.hadMarkup) });
    });
  }

  // ---- panel events ---------------------------------------------------------

  function onField(target: HTMLElement) {
    if (!selected) return;
    const prop = target.dataset.f;
    const f = FIELDS.find((x) => x.prop === prop);
    if (!f) return;
    const raw = (target as HTMLInputElement).value;
    setProp(selected, f.prop, f.kind === 'px' && raw !== '' ? `${raw}px` : raw);
  }

  selectedSec.addEventListener('input', (e) => {
    const t = e.target as HTMLElement;
    if (t.dataset.f) onField(t);
    else if (t.hasAttribute('data-text') && selected) setText(selected, (t as HTMLTextAreaElement).value);
  });
  selectedSec.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.hasAttribute('data-hide') && selected) setProp(selected, HIDE_PROP, t.checked ? 'none' : '');
    else if (t.dataset.f && t.tagName === 'SELECT') onField(t);
  });
  selectedSec.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button');
    if (!b || !selected) return;
    if (b.hasAttribute('data-edit')) startEdit(selected);
    else if (b.hasAttribute('data-parent')) {
      const p = selected.parentElement;
      if (p && p !== document.body) select(p);
    } else if (b.hasAttribute('data-undo')) {
      const t = tracked.get(selected);
      if (t) {
        putBack(t);
        tracked.delete(selected);
      }
      save();
      renderSelected();
      renderChanges();
      scheduleOverlay();
    } else if (b.dataset.rv) {
      setProp(selected, b.dataset.rv, '');
      renderSelected();
    }
  });
  changesSec.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-goto]');
    const t = b ? changed()[Number(b.dataset.goto)] : undefined;
    if (t) {
      select(t.el);
      t.el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  });

  async function copyList() {
    renderChanges();
    const text = out.value;
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      out.closest('details')?.setAttribute('open', '');
      out.select();
      ok = document.execCommand('copy');
    }
    copied.textContent = ok ? 'Copied. Paste it to whoever is applying the changes.' : 'Could not copy. Select the text under "Preview the list" and copy it.';
  }

  function resetAll() {
    tracked.forEach(putBack);
    tracked.clear();
    save();
    renderSelected();
    renderChanges();
    scheduleOverlay();
    copied.textContent = 'Everything on this page was put back.';
  }

  function setOpen(on: boolean) {
    open = on;
    panel.hidden = !on;
    pill.hidden = on;
    if (!on) setPicking(false);
    else {
      renderSelected();
      renderChanges();
    }
    scheduleOverlay();
  }

  pill.addEventListener('click', () => setOpen(true));
  q('[data-close]').addEventListener('click', () => setOpen(false));
  q('[data-move]').addEventListener('click', () => panel.classList.toggle('left'));
  pickBtn.addEventListener('click', () => setPicking(!picking));
  q('[data-copy]').addEventListener('click', copyList);
  q('[data-reset-all]').addEventListener('click', resetAll);

  document.addEventListener('mousemove', onMove, true);
  for (const type of ['click', 'mousedown', 'mouseup', 'pointerdown', 'auxclick']) document.addEventListener(type, swallow, true);
  document.addEventListener(
    'keydown',
    (e) => {
      if (e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        setOpen(!open);
      } else if (e.key === 'Escape' && picking) {
        setPicking(false);
      }
    },
    true,
  );
  window.addEventListener('scroll', scheduleOverlay, { capture: true, passive: true });
  window.addEventListener('resize', scheduleOverlay);

  // ---- bring back what was tweaked before a reload --------------------------

  function restore() {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(storageKey(location.pathname));
    } catch {
      return;
    }
    for (const change of parseStored(raw)) {
      let el: Element | null = null;
      try {
        el = document.querySelector(change.selector);
      } catch {
        el = null;
      }
      if (!el || tracked.has(el)) continue;
      const t: Tracked = { el, change, styleBefore: el.getAttribute('style'), htmlBefore: el.innerHTML, textBefore: change.text?.before ?? el.textContent ?? '', hadMarkup: change.text?.hadMarkup ?? el.children.length > 0 };
      for (const [prop, { after }] of Object.entries(change.props)) (el as HTMLElement).style.setProperty(prop, after, 'important');
      if (change.text) el.textContent = change.text.after;
      tracked.set(el, t);
    }
    renderChanges();
  }

  setOpen(false);
  restore();
}

if (typeof document !== 'undefined') {
  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init, { once: true });
}
