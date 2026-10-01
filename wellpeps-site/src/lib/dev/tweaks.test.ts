import { describe, expect, it } from 'vitest';
import {
  colorToHex,
  cssEscape,
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
  type PathNode,
} from './tweaks';

const node = (tag: string, over: Partial<PathNode> = {}): PathNode => ({
  tag,
  id: '',
  classes: [],
  nth: 1,
  ofType: 1,
  parent: null,
  ...over,
});

describe('colorToHex', () => {
  it('converts rgb and rgba, ignoring a non-zero alpha', () => {
    expect(colorToHex('rgb(8, 43, 89)')).toBe('#082b59');
    expect(colorToHex('rgba(21, 118, 196, 0.5)')).toBe('#1576c4');
    expect(colorToHex('rgb(255 255 255 / 80%)')).toBe('#ffffff');
  });
  it('expands short hex and keeps long hex', () => {
    expect(colorToHex('#abc')).toBe('#aabbcc');
    expect(colorToHex('#082B59')).toBe('#082b59');
  });
  it('returns empty for transparent, fully transparent rgba and junk', () => {
    expect(colorToHex('transparent')).toBe('');
    expect(colorToHex('rgba(0, 0, 0, 0)')).toBe('');
    expect(colorToHex('color(srgb 1 0 0)')).toBe('');
    expect(colorToHex('')).toBe('');
  });
  it('clamps channels above 255 and rejects negative ones', () => {
    expect(colorToHex('rgb(300, 0, 0)')).toBe('#ff0000');
    expect(colorToHex('rgb(-5, 0, 0)')).toBe('');
  });
});

describe('pxNumber', () => {
  it('reads px values only', () => {
    expect(pxNumber('19px')).toBe(19);
    expect(pxNumber('-12.5px')).toBe(-12.5);
    expect(pxNumber('auto')).toBeNull();
    expect(pxNumber('50%')).toBeNull();
    expect(pxNumber('')).toBeNull();
  });
});

describe('sourceLabel', () => {
  it('trims the machine path to the project path and keeps the line', () => {
    expect(sourceLabel('C:/dev/W/wellpeps-site/src/components/NavBar.astro', '13:46')).toBe('src/components/NavBar.astro:13');
  });
  it('handles Windows separators and a missing location', () => {
    expect(sourceLabel('C:\\dev\\W\\wellpeps-site\\src\\pages\\index.astro', null)).toBe('src/pages/index.astro');
  });
  it('is null when the element has no stamp', () => {
    expect(sourceLabel(null, '1:1')).toBeNull();
  });
});

describe('cssEscape', () => {
  it('escapes punctuation and a leading digit', () => {
    expect(cssEscape('a:b.c')).toBe('a\\:b\\.c');
    expect(cssEscape('2col')).toBe('\\32 col');
  });
});

describe('selectorCandidates', () => {
  it('goes from the element alone to the full path', () => {
    const main = node('main');
    const section = node('section', { parent: main, classes: ['section'], nth: 2, ofType: 3 });
    const h2 = node('h2', { parent: section, classes: ['title'] });
    expect(selectorCandidates(h2)).toEqual([
      'h2.title',
      'section.section:nth-of-type(2) > h2.title',
      'main > section.section:nth-of-type(2) > h2.title',
    ]);
  });
  it('stops at an id', () => {
    const wrap = node('div', { id: 'includes', parent: node('main') });
    const card = node('article', { parent: wrap, classes: ['card'], nth: 4, ofType: 4 });
    const list = selectorCandidates(card);
    expect(list[list.length - 1]).toBe('div#includes > article.card:nth-of-type(4)');
  });
  it('leaves out state classes and caps the class count', () => {
    const el = node('a', { classes: ['is-scrolled', 'reveal', 'btn', 'btn--primary', 'extra'] });
    expect(selectorCandidates(el)[0]).toBe('a.btn.btn--primary');
  });
  it('skips body and html', () => {
    const el = node('p', { parent: node('body', { parent: node('html') }) });
    expect(selectorCandidates(el)).toEqual(['p']);
  });
});

describe('withProp', () => {
  const base = newChange('h1', 'src/a.astro:1', 'h1');
  it('records a change and keeps the very first value as the original', () => {
    const one = withProp(base, 'font-size', '40px', '44px');
    const two = withProp(one, 'font-size', '44px', '48px');
    expect(two.props['font-size']).toEqual({ before: '40px', after: '48px' });
  });
  it('does not mutate what it was given', () => {
    const before = JSON.stringify(base);
    withProp(base, 'color', '#000000', '#ffffff');
    expect(JSON.stringify(base)).toBe(before);
  });
  it('drops the entry when the value goes back to the original', () => {
    const one = withProp(base, 'color', 'rgb(8, 43, 89)', '#ffffff');
    const back = withProp(one, 'color', '#ffffff', '#082b59');
    expect(back.props.color).toBeUndefined();
    expect(isEmptyChange(back)).toBe(true);
  });
  it('drops the entry when the field is cleared', () => {
    const one = withProp(base, 'gap', '10px', '20px');
    expect(isEmptyChange(withProp(one, 'gap', '20px', ''))).toBe(true);
  });
});

describe('withText', () => {
  const base = newChange('h1', null, 'h1');
  it('keeps the original wording and the markup flag across edits', () => {
    const one = withText(base, 'Old', 'New', true);
    const two = withText(one, 'New', 'Newer', false);
    expect(two.text).toEqual({ before: 'Old', after: 'Newer', hadMarkup: true });
  });
  it('clears when the text is put back', () => {
    const one = withText(base, 'Old', 'New', false);
    expect(withText(one, 'New', 'Old', false).text).toBeNull();
  });
});

describe('saved copy', () => {
  const sample = (): ElementChange => withText(withProp(newChange('h1.title', 'src/a.astro:3', 'h1 "Hi"'), 'color', '#000000', '#ff0000'), 'Hi', 'Hello', false);

  it('round-trips', () => {
    const back = parseStored(serializeChanges([sample()]));
    expect(back).toEqual([sample()]);
  });
  it('leaves out elements with nothing changed', () => {
    expect(parseStored(serializeChanges([newChange('p', null, 'p')]))).toEqual([]);
  });
  it('ignores garbage, wrong shapes and null', () => {
    expect(parseStored(null)).toEqual([]);
    expect(parseStored('not json')).toEqual([]);
    expect(parseStored('{"a":1}')).toEqual([]);
    expect(parseStored('[1,"x",null,{}]')).toEqual([]);
  });
  it('drops properties the panel does not control and oversize values', () => {
    const raw = JSON.stringify([
      {
        selector: 'p',
        props: {
          color: { before: '#000000', after: '#111111' },
          'background-image': { before: '', after: 'url(javascript:alert(1))' },
          'font-size': { before: '19px', after: 'x'.repeat(400) },
        },
      },
    ]);
    const [c] = parseStored(raw);
    expect(Object.keys(c.props)).toEqual(['color']);
  });
  it('keys by page', () => {
    expect(storageKey('/weight-loss')).toBe('wp-tweaks:v1:/weight-loss');
  });
});

describe('labelFor', () => {
  it('shortens long text and collapses whitespace', () => {
    expect(labelFor('H1', '  Weight   loss  ')).toBe('h1 "Weight loss"');
    expect(labelFor('p', 'x'.repeat(60))).toBe(`p "${'x'.repeat(37)}..."`);
    expect(labelFor('div', '')).toBe('div');
  });
});

describe('formatChangeList', () => {
  const change = (): ElementChange => {
    let c = newChange('main > h1.hero', 'src/components/Hero.astro:12', 'h1 "Hello"');
    c = withProp(c, 'color', 'rgb(8, 43, 89)', '#123456');
    c = withProp(c, 'font-size', '40px', '44px');
    c = withText(c, 'Hello', 'Hi there', true);
    return c;
  };

  it('says when nothing changed', () => {
    expect(formatChangeList({ page: '/', viewport: 1440, changes: [] })).toContain('No changes yet.');
  });
  it('names the source, selector, each value and the window width', () => {
    const md = formatChangeList({ page: '/weight-loss', viewport: 1440, changes: [change()] });
    expect(md).toContain('# Site tweaks for /weight-loss');
    expect(md).toContain('1440px wide window');
    expect(md).toContain('## 1. h1 "Hello"');
    expect(md).toContain('- Source: src/components/Hero.astro:12');
    expect(md).toContain('- Selector: `main > h1.hero`');
    expect(md).toContain('- color: rgb(8, 43, 89) → #123456');
    expect(md).toContain('- font-size: 40px → 44px');
    expect(md).toContain('- Text: "Hello" → "Hi there"');
    expect(md).toContain('formatting inside it');
    expect(md).toContain('LegitScript claims scan');
  });
  it('warns when a font size goes below the 19px floor', () => {
    const c = withProp(newChange('p', null, 'p'), 'font-size', '19px', '16px');
    const md = formatChangeList({ page: '/', viewport: 1000, changes: [c] });
    expect(md).toContain('WARNING: below the site');
  });
  it('does not warn at or above the floor', () => {
    const c = withProp(newChange('p', null, 'p'), 'font-size', '19px', '20px');
    expect(formatChangeList({ page: '/', viewport: 1000, changes: [c] })).not.toContain('WARNING');
  });
  it('writes hiding as a plain statement and says when the source is unknown', () => {
    const c = withProp(newChange('div.badge', null, 'div'), 'display', 'flex', 'none');
    const md = formatChangeList({ page: '/', viewport: 1000, changes: [c] });
    expect(md).toContain('- Hidden: yes (display: none; it was flex)');
    expect(md).toContain('not known');
    expect(md).not.toContain('LegitScript');
  });
  it('skips elements with nothing left changed', () => {
    const md = formatChangeList({ page: '/', viewport: 1000, changes: [newChange('p', null, 'p'), change()] });
    expect(md).toContain('1 element changed');
    expect(md).not.toContain('## 2.');
  });
});
