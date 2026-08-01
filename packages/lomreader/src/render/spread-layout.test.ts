import { describe, expect, it } from 'vitest';
import {
  getSpreadLinearIndices,
  getSpreadStartLinearIndex,
  getSpreadStep,
} from './spread-layout';

describe('spread-layout helpers', () => {
  it('aligns spread start to even linear indices in 2-up', () => {
    expect(getSpreadStartLinearIndex(0, '2-up')).toBe(0);
    expect(getSpreadStartLinearIndex(1, '2-up')).toBe(0);
    expect(getSpreadStartLinearIndex(2, '2-up')).toBe(2);
    expect(getSpreadStartLinearIndex(3, '2-up')).toBe(2);
  });

  it('returns one or two linear indices per spread', () => {
    expect(getSpreadLinearIndices(0, '2-up', 3)).toEqual([0, 1]);
    expect(getSpreadLinearIndices(2, '2-up', 3)).toEqual([2]);
    expect(getSpreadLinearIndices(1, '1-up', 3)).toEqual([1]);
  });

  it('steps by two spreads in 2-up navigation', () => {
    expect(getSpreadStep('2-up')).toBe(2);
    expect(getSpreadStep('1-up')).toBe(1);
  });
});
