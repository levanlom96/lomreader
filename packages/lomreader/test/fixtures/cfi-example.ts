import { strToU8, zipSync } from 'fflate';

const PACKAGE_PATH = 'EPUB/content.opf';

const PACKAGE_XML = `<?xml version="1.0"?>
<package version="3.0" unique-identifier="bookid" xmlns="http://www.idpf.org/2007/opf">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">urn:uuid:cfi-example</dc:identifier>
    <dc:title>CFI Example</dc:title>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="chapter01" href="chapter01.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref id="titleref" idref="chapter01"/>
    <itemref id="chap01ref" idref="chapter01"/>
  </spine>
</package>`;

export const CFI_EXAMPLE_CHAPTER = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>Chapter</title>
  </head>
  <body id="body01">
    <p>one</p>
    <p>two</p>
    <p>three</p>
    <p>four</p>
    <p id="para05">xxx<em>yyy</em>0123456789</p>
    <p>six</p>
    <p>seven</p>
    <img id="svgimg" src="foo.svg" alt="cover art"/>
    <p>eight</p>
    <p>nine</p>
  </body>
</html>`;

export const CFI_EXAMPLE_POINT =
  'epubcfi(/6/4[chap01ref]!/4[body01]/10[para05]/3:10)';

export const CFI_EXAMPLE_RANGE =
  'epubcfi(/6/4[chap01ref]!/4[body01]/10[para05],/2/1:1,/3:4)';

export function buildCfiExampleEpub(): Uint8Array {
  return zipSync({
    mimetype: strToU8('application/epub+zip'),
    'META-INF/container.xml': strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="${PACKAGE_PATH}" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`),
    [PACKAGE_PATH]: strToU8(PACKAGE_XML),
    'EPUB/chapter01.xhtml': strToU8(CFI_EXAMPLE_CHAPTER),
  });
}
