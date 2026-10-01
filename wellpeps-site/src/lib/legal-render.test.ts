import { describe, expect, test } from 'vitest';
import { escapeHtml, outline, renderBlocks, renderInline, sectionCopy, slugify, smartQuotes, tokenKind, type Block } from './legal-render';

describe('smartQuotes', () => {
  test('turns straight quotes into typographic ones', () => {
    expect(smartQuotes('She said "hello" and it\'s fine')).toBe('She said “hello” and it’s fine');
    expect(smartQuotes("'quoted' word")).toBe('‘quoted’ word');
  });
});

describe('tokenKind', () => {
  test('lawyer, web team or company', () => {
    expect(tokenKind('VERIFY: state law')).toBe('legal');
    expect(tokenKind('PENDING COUNSEL, H1: role')).toBe('legal');
    expect(tokenKind('MEDICAL DIRECTOR TO CONFIRM: dose')).toBe('legal');
    expect(tokenKind('ACTIVATION BLOCK N-A1: x')).toBe('legal');
    expect(tokenKind('BUILD: consent log')).toBe('web');
    expect(tokenKind('typed by the person')).toBe('web');
    expect(tokenKind('SUPPORT EMAIL')).toBe('you');
    expect(tokenKind('BUSINESS ADDRESS')).toBe('you');
  });
});

describe('renderInline', () => {
  test('escapes HTML before adding any markup', () => {
    const html = renderInline('<script>alert(1)</script> & "x"');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&amp;');
  });
  test('bold, italic and tokens', () => {
    expect(renderInline('a **bold** and *italic* word')).toBe('a <strong>bold</strong> and <em>italic</em> word');
    expect(renderInline('Email [SUPPORT EMAIL].')).toBe('Email <mark class="ph ph--you">[SUPPORT EMAIL]</mark>.');
    expect(renderInline('[VERIFY: x]')).toContain('ph--legal');
  });
  test('a token inside bold is still highlighted', () => {
    const html = renderInline('**[ACTIVATION BLOCK A: x]**');
    expect(html).toBe('<strong><mark class="ph ph--legal">[ACTIVATION BLOCK A: x]</mark></strong>');
  });
  test('markup characters inside tokens or words are not misread', () => {
    expect(renderInline('2 * 3 = 6')).toBe('2 * 3 = 6');
    expect(renderInline('a_b *c')).toBe('a_b *c');
  });
  test('token text is escaped', () => {
    expect(renderInline('[<b>x</b>]')).toContain('&lt;b&gt;');
  });
});

describe('blank lines', () => {
  test('a run of underscores inside text becomes a blank, not an unbreakable word', () => {
    expect(renderInline('Name: ________')).toBe('Name: <span class="ld-blank"></span>');
    expect(renderInline('snake_case and a__b')).toBe('snake_case and a__b');
  });
  test('a paragraph that is only underscores becomes a rule', () => {
    expect(renderBlocks([{ t: 'p', text: '____________________' }])).toBe('<div class="ld-rule" role="presentation"></div>');
  });
});

describe('slugify and outline', () => {
  test('ids are readable and unique', () => {
    const used = new Set<string>();
    expect(slugify('1. Acceptance of Terms', used)).toBe('1-acceptance-of-terms');
    expect(slugify('1. Acceptance of Terms', used)).toBe('1-acceptance-of-terms-2');
    expect(slugify('Q&A **bold**', used)).toBe('q-and-a-bold');
    expect(slugify('', used)).toBe('section');
  });
  test('outline lists only top-level headings with the ids the renderer writes', () => {
    const blocks: Block[] = [
      { t: 'h1', text: '1. Intro' },
      { t: 'h2', text: 'Sub' },
      { t: 'h1', text: '1. Intro' },
    ];
    expect(outline(blocks)).toEqual([
      { id: '1-intro', text: '1. Intro' },
      { id: '1-intro-2', text: '1. Intro' },
    ]);
    const html = renderBlocks(blocks);
    expect(html).toContain('id="1-intro"');
    expect(html).toContain('id="1-intro-2"');
  });
});

describe('renderBlocks', () => {
  test('headings are demoted a level and get ids', () => {
    const html = renderBlocks([{ t: 'h1', text: 'A' }, { t: 'h2', text: 'B' }, { t: 'h3', text: 'C' }]);
    expect(html).toContain('<h2 id="a">A</h2>');
    expect(html).toContain('<h3 id="b">B</h3>');
    expect(html).toContain('<h4 id="c">C</h4>');
  });
  test('consecutive bullets become one list, with levels', () => {
    const html = renderBlocks([{ t: 'li', text: 'one' }, { t: 'li', text: 'two', level: 1 }, { t: 'p', text: 'after' }, { t: 'li', text: 'next' }]);
    expect(html.match(/<ul/g)).toHaveLength(2);
    expect(html).toContain('<li class="lv1">two</li>');
  });
  test('clauses, callouts, checks and signature lines', () => {
    const html = renderBlocks([
      { t: 'clause', number: '1.1', heading: 'Eligibility.', text: 'You must be 18.' },
      { t: 'callout', text: 'line one\nline two', kind: 'warning' },
      { t: 'check', text: 'I agree' },
      { t: 'sign', labels: ['Patient signature', 'Date'] },
    ]);
    expect(html).toContain('<span class="ld-clause__no">1.1</span>');
    expect(html).toContain('<strong>Eligibility.</strong> You must be 18.');
    expect(html).toContain('ld-callout--warning');
    expect(html.match(/<p>line/g)).toHaveLength(2);
    expect(html).toContain('ld-check');
    expect(html).toContain('Patient signature:');
  });
  test('tables keep the header row, widths and multi-line cells', () => {
    const html = renderBlocks([{ t: 'table', rows: [['A', 'B'], ['one\ntwo', 'x']], widths: [1, 3], header: true, shade: true }]);
    expect(html).toContain('<thead><tr><th><p>A</p></th><th><p>B</p></th></tr></thead>');
    expect(html).toContain('width:25.0%');
    expect(html).toContain('<td class="shade"><p>one</p><p>two</p></td>');
  });
  test('an empty table and page breaks produce nothing', () => {
    expect(renderBlocks([{ t: 'table', rows: [] }, { t: 'pagebreak' }])).toBe('');
  });
  test('nothing escapes the escaping', () => {
    const html = renderBlocks([
      { t: 'p', text: '<img src=x onerror=alert(1)>' },
      { t: 'clause', number: '<b>', heading: '<i>', text: '<u>' },
      { t: 'table', rows: [['<a>']] },
    ]);
    expect(html).not.toMatch(/<img|<b>|<i>|<u>|<a>/);
  });
});

describe('escapeHtml', () => {
  test('covers the five characters', () => {
    expect(escapeHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;');
  });
});

describe('sectionCopy', () => {
  const blocks: Block[] = [
    { t: 'h1', text: 'Block 6. Other' },
    { t: 'p', text: 'not this' },
    { t: 'h1', text: 'Block 7. About and Contact legal block' },
    { t: 'h3', text: 'Copy' },
    { t: 'callout', text: 'the public text' },
    { t: 'h3', text: 'Notes' },
    { t: 'li', text: 'internal note' },
    { t: 'h3', text: 'Copy: footnotes under the table' },
    { t: 'p', text: 'footnote' },
    { t: 'h3', text: 'How to complete the table' },
    { t: 'li', text: 'internal how-to' },
    { t: 'h1', text: 'Block 8. Next' },
    { t: 'p', text: 'nor this' },
  ];
  test('keeps the copy, drops labels and internal notes, stops at the next block', () => {
    expect(sectionCopy(blocks, /^Block 7\./)).toEqual([
      { t: 'callout', text: 'the public text' },
      { t: 'p', text: 'footnote' },
    ]);
  });
  test('an unknown block gives nothing', () => {
    expect(sectionCopy(blocks, /^Block 99/)).toEqual([]);
  });
});
