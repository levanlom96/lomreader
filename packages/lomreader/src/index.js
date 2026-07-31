/**
 * Lomreader — EPUB 3.0 reader library
 *
 * @module lomreader
 */

export const VERSION = '0.0.1';

/**
 * Creates a lomreader instance.
 * @returns {object}
 */
export function createReader() {
  return {
    version: VERSION,
  };
}
