import { describe, expect, it } from 'vitest';
import { parseXml } from '../epub/xml';
import { resolveLocalPath } from './dom';
import { CFI_EXAMPLE_CHAPTER, CFI_EXAMPLE_POINT } from '../../test/fixtures/cfi-example';
import { parseCfi } from './parse';
import { openEpubFromBytes } from '../../test/helpers';
import { buildCfiExampleEpub, CFI_EXAMPLE_RANGE } from '../../test/fixtures/cfi-example';
import { generateCfi, resolveCfi } from './index';
import type { CfiRedirect, CfiResolvedPoint, CfiResolvedTarget } from './types';

function isResolvedPoint(target: CfiResolvedTarget): target is CfiResolvedPoint {
  return !('end' in target);
}

function isRedirect(tail: unknown): tail is Extract<CfiRedirect, { kind: 'path' }> {
  return (
    typeof tail === 'object' &&
    tail !== null &&
    'kind' in tail &&
    (tail as CfiRedirect).kind === 'path'
  );
}

describe('CFI resolve/generate', () => {
  it('resolves the spec example point to the character after "9"', async () => {
    const publication = await openEpubFromBytes(buildCfiExampleEpub());
    const resolved = await resolveCfi(publication, CFI_EXAMPLE_POINT);

    expect(resolved.documentPath).toBe('EPUB/chapter01.xhtml');
    expect(resolved.spineIndex).toBe(1);
    expect(isResolvedPoint(resolved)).toBe(true);

    if (isResolvedPoint(resolved)) {
      expect(resolved.node.nodeValue).toBe('0123456789');
      expect(resolved.offset).toBe(10);
    }
  });

  it('resolves intra-content paths against a parsed XHTML document', () => {
    const root = parseXml(CFI_EXAMPLE_CHAPTER).documentElement!;
    const parsed = parseCfi(CFI_EXAMPLE_POINT);
    const contentPath = parsed.path!.tail!;
    const localPath = isRedirect(contentPath)
      ? contentPath.path
      : (() => {
          throw new Error('Expected redirected content path');
        })();

    const point = resolveLocalPath(root as never, localPath);

    expect(point.node.nodeValue).toBe('0123456789');
    expect(point.offset).toBe(10);
  });

  it('generates a CFI for a text offset and resolves back to the same point', async () => {
    const publication = await openEpubFromBytes(buildCfiExampleEpub());
    const root = parseXml(CFI_EXAMPLE_CHAPTER).documentElement!;
    const textNode = root.getElementsByTagName('p')[4]!.childNodes[2] as never;

    const generated = await generateCfi(publication, 1, {
      start: { node: textNode, offset: 10 },
    });

    const resolved = await resolveCfi(publication, generated);

    expect(isResolvedPoint(resolved)).toBe(true);

    if (isResolvedPoint(resolved)) {
      expect(resolved.node.nodeValue).toBe('0123456789');
      expect(resolved.offset).toBe(10);
    }
  });

  it('resolves a simple range within para05', async () => {
    const publication = await openEpubFromBytes(buildCfiExampleEpub());
    const resolved = await resolveCfi(publication, CFI_EXAMPLE_RANGE);

    expect(resolved).toMatchObject({
      documentPath: 'EPUB/chapter01.xhtml',
      start: { offset: 1 },
      end: { offset: 4 },
    });
  });
});
