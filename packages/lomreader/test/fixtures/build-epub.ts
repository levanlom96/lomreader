import { strToU8, zipSync } from 'fflate';

export interface MinimalEpubOptions {
  packagePath?: string;
  identifier?: string;
  title?: string;
  includeNav?: boolean;
  includeLinkedResource?: boolean;
  includeFallback?: boolean;
  spineIdrefs?: string[];
  chapterBody?: string;
  cssBody?: string;
}

const DEFAULT_MIMETYPE = 'application/epub+zip';

function containerXml(packagePath: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="${packagePath}" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
}

function buildOpf(options: Required<MinimalEpubOptions>): string {
  const manifestItems = [
    `<item id="chapter" href="text/chapter.xhtml" media-type="application/xhtml+xml"/>`,
    `<item id="css" href="styles/main.css" media-type="text/css"/>`,
    `<item id="cover" href="images/cover.png" media-type="image/png"/>`,
    `<item id="app-js" href="scripts/app.js" media-type="text/javascript"/>`,
  ];

  if (options.spineIdrefs.includes('chapter2')) {
    manifestItems.push(
      `<item id="chapter2" href="text/chapter-2.xhtml" media-type="application/xhtml+xml"/>`,
    );
  }

  const spineItems = options.spineIdrefs.map(
    (idref) => `<itemref idref="${idref}"/>`,
  );

  if (options.includeNav) {
    manifestItems.push(
      `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
    );
  }

  if (options.includeFallback) {
    manifestItems.push(
      `<item id="foreign" href="media/clip.mp4" media-type="video/mp4" fallback="chapter"/>`,
    );
    spineItems.push('<itemref idref="foreign"/>');
  }

  const linkedResource = options.includeLinkedResource
    ? `<link rel="record" href="https://example.com/metadata.xml"/>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" unique-identifier="pub-id" xmlns="http://www.idpf.org/2007/opf">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="pub-id">${options.identifier}</dc:identifier>
    <dc:title>${options.title}</dc:title>
    <dc:language>en</dc:language>
    ${linkedResource}
  </metadata>
  <manifest>
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine>
    ${spineItems.join('\n    ')}
  </spine>
</package>`;
}

function defaultChapterHtml(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Chapter</title>
  <link rel="stylesheet" href="../styles/main.css"/>
  <script src="../scripts/app.js"></script>
</head>
<body>${body}</body>
</html>`;
}

function defaultCss(body: string): string {
  return `@import url("extra.css");
body { background-image: url("../images/cover.png"); }
${body}`;
}

export function buildMinimalEpub(options: MinimalEpubOptions = {}): Uint8Array {
  const packagePath = options.packagePath ?? 'EPUB/content.opf';
  const resolved: Required<MinimalEpubOptions> = {
    packagePath,
    identifier: options.identifier ?? 'urn:uuid:test-publication',
    title: options.title ?? 'Test Publication',
    includeNav: options.includeNav ?? false,
    includeLinkedResource: options.includeLinkedResource ?? false,
    includeFallback: options.includeFallback ?? false,
    spineIdrefs: options.spineIdrefs ?? ['chapter'],
    chapterBody: options.chapterBody ?? '<p>Hello EPUB</p>',
    cssBody: options.cssBody ?? '',
  };

  const packageDir = packagePath.includes('/')
    ? packagePath.slice(0, packagePath.lastIndexOf('/') + 1)
    : '';

  const files: Record<string, Uint8Array> = {
    mimetype: strToU8(DEFAULT_MIMETYPE),
    'META-INF/container.xml': strToU8(containerXml(packagePath)),
    [packagePath]: strToU8(buildOpf(resolved)),
    [`${packageDir}text/chapter.xhtml`]: strToU8(defaultChapterHtml(resolved.chapterBody)),
    [`${packageDir}styles/main.css`]: strToU8(defaultCss(resolved.cssBody)),
    [`${packageDir}styles/extra.css`]: strToU8('/* extra stylesheet */'),
    [`${packageDir}images/cover.png`]: strToU8('fake-png'),
    [`${packageDir}scripts/app.js`]: strToU8('console.log("epub");'),
  };

  if (resolved.includeNav) {
    files[`${packageDir}nav.xhtml`] = strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Navigation</title></head>
<body><nav epub:type="toc"><ol><li><a href="text/chapter.xhtml">Chapter</a></li></ol></nav></body>
</html>`);
  }

  if (resolved.includeFallback) {
    files[`${packageDir}media/clip.mp4`] = strToU8('fake-video');
  }

  if (resolved.spineIdrefs.includes('chapter2')) {
    files[`${packageDir}text/chapter-2.xhtml`] = strToU8(
      defaultChapterHtml('<p>Second chapter</p>'),
    );
  }

  return zipSync(files);
}

export function buildInvalidContainerEpub(): Uint8Array {
  return zipSync({
    mimetype: strToU8(DEFAULT_MIMETYPE),
    'META-INF/container.xml': strToU8('<container></container>'),
  });
}

export function buildMissingPackageEpub(): Uint8Array {
  return zipSync({
    mimetype: strToU8(DEFAULT_MIMETYPE),
    'META-INF/container.xml': strToU8(containerXml('EPUB/missing.opf')),
  });
}
