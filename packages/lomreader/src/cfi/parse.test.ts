import { describe, expect, it } from 'vitest';
import { formatCfi, parseCfi } from './parse';
import { CFI_EXAMPLE_POINT, CFI_EXAMPLE_RANGE } from '../../test/fixtures/cfi-example';

describe('parseCfi', () => {
  it('parses a standard point CFI from the spec example', () => {
    const parsed = parseCfi(CFI_EXAMPLE_POINT);

    expect(parsed.path?.steps).toEqual([
      { index: 6 },
      { index: 4, assertion: { id: 'chap01ref' } },
    ]);
    expect(parsed.path?.tail).toMatchObject({
      kind: 'path',
      path: {
        steps: [
          { index: 4, assertion: { id: 'body01' } },
          { index: 10, assertion: { id: 'para05' } },
          { index: 3 },
        ],
        tail: { type: 'character', offset: 10 },
      },
    });
  });

  it('parses a simple range CFI from the spec example', () => {
    const parsed = parseCfi(CFI_EXAMPLE_RANGE);

    expect(parsed.range?.parent.tail).toMatchObject({
      kind: 'path',
      path: {
        steps: [
          { index: 4, assertion: { id: 'body01' } },
          { index: 10, assertion: { id: 'para05' } },
        ],
      },
    });
    expect(parsed.range?.start).toEqual({
      steps: [{ index: 2 }, { index: 1 }],
      tail: { type: 'character', offset: 1 },
    });
    expect(parsed.range?.end).toEqual({
      steps: [{ index: 3 }],
      tail: { type: 'character', offset: 4 },
    });
  });

  it('round-trips parsed point CFIs', () => {
    const parsed = parseCfi(CFI_EXAMPLE_POINT);

    expect(formatCfi(parsed)).toBe(CFI_EXAMPLE_POINT);
  });

  it('unescapes circumflex characters in assertions', () => {
    const parsed = parseCfi('epubcfi(/6/4!/4/10/2/1:3[2^[1^]])');

    expect(parsed.path?.tail).toMatchObject({
      kind: 'path',
      path: {
        tail: {
          type: 'character',
          offset: 3,
          assertion: { textBefore: '2[1]' },
        },
      },
    });
  });
});
