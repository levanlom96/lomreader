import { describe, expect, it } from 'vitest';
import { parseEpubBytes } from '../../test/helpers';
import { buildMinimalEpub } from '../../test/fixtures/build-epub';
import {
  buildContentPlane,
  buildManifestPlaneSummary,
  buildSpinePlaneSummary,
} from './planes';

describe('planes', () => {
  it('builds the content plane from spine content documents', async () => {
    const { archive, packageDocument } = await parseEpubBytes(buildMinimalEpub());
    const content = buildContentPlane(archive, packageDocument);

    const paths = content.resources.map((resource) => resource.item.path);

    expect(paths).toContain('EPUB/styles/main.css');
    expect(paths).toContain('EPUB/images/cover.png');
    expect(paths).toContain('EPUB/scripts/app.js');
  });

  it('records which content documents use each resource', async () => {
    const { archive, packageDocument } = await parseEpubBytes(buildMinimalEpub());
    const content = buildContentPlane(archive, packageDocument);

    const css = content.resources.find(
      (resource) => resource.item.path === 'EPUB/styles/main.css',
    );

    expect(css?.usedBy).toContain('EPUB/text/chapter.xhtml');
    expect(css?.classification).toBe('core-media-type');
  });

  it('includes nav documents in content plane discovery', async () => {
    const { archive, packageDocument } = await parseEpubBytes(
      buildMinimalEpub({ includeNav: true }),
    );
    const content = buildContentPlane(archive, packageDocument);

    expect(content.resources.length).toBeGreaterThan(0);
  });

  it('provides plane summaries for diagnostics', async () => {
    const { packageDocument } = await parseEpubBytes(buildMinimalEpub());

    expect(buildManifestPlaneSummary(packageDocument.manifest)).toEqual({
      publicationResourceCount: 4,
      linkedResourceCount: 0,
    });
    expect(buildSpinePlaneSummary(packageDocument.spine)).toEqual({
      itemrefCount: 1,
      linearCount: 1,
    });
  });
});
