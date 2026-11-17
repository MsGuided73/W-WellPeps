import { describe, expect, it } from 'vitest';
import { middleSectionStart, sectionEnd, splitBody } from './article-body';
import { splitAtMiddleSection } from './guide-flow';

const body =
  '<p>Intro</p>' +
  '<h2 id="what">What</h2><p>a</p>' +
  '<h2 id="how">How</h2><p>b</p>' +
  '<h2 id="why">Why</h2><p>c</p>' +
  '<h2 id="who">Who</h2><p>d</p>';

describe('sectionEnd', () => {
  it('ends a section where the next heading starts', () => {
    expect(body.slice(sectionEnd(body, 'how'))).toMatch(/^<h2 id="why">/);
  });

  it('ends the last section at the end of the body', () => {
    expect(sectionEnd(body, 'who')).toBe(body.length);
  });

  it('returns undefined for a heading that does not exist', () => {
    expect(sectionEnd(body, 'missing')).toBeUndefined();
  });
});

describe('middleSectionStart', () => {
  it('matches the guide offer split already used on articles', () => {
    const at = middleSectionStart(body);
    expect([body.slice(0, at), body.slice(at)]).toEqual(splitAtMiddleSection(body));
  });

  it('is undefined for a body with fewer than two sections', () => {
    expect(middleSectionStart('<p>x</p><h2>Only</h2>')).toBeUndefined();
  });
});

describe('splitBody', () => {
  it('cuts in order and tags each piece with what follows it, losing nothing', () => {
    const segments = splitBody(body, [
      { at: middleSectionStart(body)!, insert: 'guide' },
      { at: sectionEnd(body, 'what')!, insert: 'diagram' },
    ]);
    expect(segments.map((s) => s.after)).toEqual(['diagram', 'guide', undefined]);
    expect(segments.map((s) => s.html).join('')).toBe(body);
  });

  it('puts the diagram before the guide offer when both fall at the same place', () => {
    const at = sectionEnd(body, 'how')!;
    const segments = splitBody(body, [{ at, insert: 'guide' }, { at, insert: 'diagram' }]);
    expect(segments.map((s) => s.after)).toEqual(['diagram', 'guide', undefined]);
    expect(segments[1].html).toBe('');
  });

  it('returns the whole body as one piece when there is nothing to insert', () => {
    expect(splitBody(body, [])).toEqual([{ html: body }]);
  });
});
