import { describe, expect, it } from 'vitest';
import { VERSION, createReader } from './index';

describe('createReader', () => {
  it('returns a reader with the current library version', () => {
    const reader = createReader();

    expect(reader.version).toBe(VERSION);
    expect(reader.version).toBe('0.0.1');
  });
});
