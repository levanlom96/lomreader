/** EPUB 3.3 core media types (sec. 3.2). */
export const CORE_MEDIA_TYPES = new Set([
  'application/xhtml+xml',
  'application/svg+xml',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'image/webp',
  'text/css',
  'font/otf',
  'font/sfnt',
  'font/ttf',
  'font/woff',
  'font/woff2',
  'application/vnd.ms-opentype',
  'application/font-sfnt',
  'application/font-woff',
  'audio/mpeg',
  'audio/mp4',
  'video/mp4',
  'video/webm',
  'application/javascript',
  'text/javascript',
]);

/** Media types for EPUB content documents (sec. 3.1.2). */
export const EPUB_CONTENT_DOCUMENT_MEDIA_TYPES = new Set([
  'application/xhtml+xml',
  'image/svg+xml',
]);

export const CONTAINER_PATH = 'META-INF/container.xml';

export const OCF_CONTAINER_NS =
  'urn:oasis:names:tc:opendocument:xmlns:container';

export const OPF_NS = 'http://www.idpf.org/2007/opf';

export const DC_NS = 'http://purl.org/dc/elements/1.1/';
