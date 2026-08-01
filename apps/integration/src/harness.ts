import {
  createReader,
  createReaderHost,
  type Publication,
  type ReaderHost,
} from 'lomreader';
import './harness.css';

const EPUB_URL = 'http://localhost:3001/epubs/hypatia.epub';

declare global {
  interface Window {
    __LOMREADER_TEST__?: {
      publication: Publication;
      readerHost: ReaderHost;
      getChapter1Html: () => Promise<string>;
      resolveCssHref: () => string;
    };
  }
}

const root = document.querySelector('#app');

if (!root) {
  throw new Error('Missing #app element');
}

const app = root as HTMLElement;

let readerHost: ReaderHost | undefined;

function renderLoading(): void {
  app.innerHTML = `
    <main class="harness" data-testid="reader-harness">
      <p data-testid="reader-status">Loading EPUB…</p>
    </main>
  `;
}

function renderError(message: string): void {
  app.innerHTML = `
    <main class="harness" data-testid="reader-harness">
      <p data-testid="reader-status" class="error">${message}</p>
    </main>
  `;
}

function updateReaderPosition(): void {
  const position = document.querySelector('#reader-position');

  if (!position || !readerHost) {
    return;
  }

  position.textContent = `${readerHost.getCurrentLinearIndex() + 1} / ${readerHost.getLinearSpineCount()}`;
}

function renderPublication(summary: {
  url: string;
  identifier?: string;
  packageVersion?: string;
  manifestCount: number;
  linkedResourceCount: number;
  spineCount: number;
  contentCount: number;
  cssCount: number;
  firstSpineHref: string;
  chapter1Path: string;
}): void {
  app.innerHTML = `
    <main class="harness" data-testid="reader-harness">
      <header>
        <h1>Lomreader Integration Harness</h1>
        <p>Test environment for e2e and integration scenarios.</p>
      </header>
      <section class="status">
        <p>
          Library version:
          <span data-testid="reader-version">${createReader().version}</span>
        </p>
        <p>
          EPUB URL:
          <code data-testid="epub-url">${summary.url}</code>
        </p>
        <p>
          Identifier:
          <span data-testid="publication-identifier">${summary.identifier ?? '—'}</span>
        </p>
        <p>
          Package version:
          <span data-testid="package-version">${summary.packageVersion ?? '—'}</span>
        </p>
        <dl class="planes">
          <div>
            <dt>Manifest plane</dt>
            <dd>
              <span data-testid="manifest-count">${summary.manifestCount}</span>
              publication resources,
              <span data-testid="linked-resource-count">${summary.linkedResourceCount}</span>
              linked resources
            </dd>
          </div>
          <div>
            <dt>Spine plane</dt>
            <dd><span data-testid="spine-count">${summary.spineCount}</span> itemrefs</dd>
          </div>
          <div>
            <dt>Content plane</dt>
            <dd>
              <span data-testid="content-count">${summary.contentCount}</span> resources
              (<span data-testid="css-count">${summary.cssCount}</span> stylesheets)
            </dd>
          </div>
        </dl>
        <p>
          First spine item:
          <code data-testid="first-spine-href">${summary.firstSpineHref}</code>
        </p>
        <p>
          Chapter 1 path:
          <code data-testid="chapter-1-path">${summary.chapter1Path}</code>
        </p>
      </section>
      <section class="reader-toolbar" data-testid="reader-toolbar">
        <button type="button" id="prev-chapter" data-testid="reader-prev">Previous</button>
        <span id="reader-position" data-testid="reader-position">—</span>
        <button type="button" id="next-chapter" data-testid="reader-next">Next</button>
      </section>
      <section id="reader-container" class="reader-container" data-testid="reader-container"></section>
    </main>
  `;

  document.querySelector('#prev-chapter')?.addEventListener('click', () => {
    void readerHost?.prev().then(updateReaderPosition);
  });

  document.querySelector('#next-chapter')?.addEventListener('click', () => {
    void readerHost?.next().then(updateReaderPosition);
  });
}

async function boot(): Promise<void> {
  renderLoading();

  try {
    const reader = createReader();
    const publication = await reader.open(EPUB_URL);

    const chapter1 = publication.spine.itemrefs.find(
      (itemref) => itemref.idref === 'chapter-1.xhtml',
    );

    const cssCount = publication.content.resources.filter(
      (resource) => resource.item.mediaType === 'text/css',
    ).length;

    renderPublication({
      url: publication.url,
      identifier: publication.packageDocument.uniqueIdentifier,
      packageVersion: publication.packageDocument.version,
      manifestCount: publication.manifest.publicationResources.length,
      linkedResourceCount: publication.manifest.linkedResources.length,
      spineCount: publication.spine.itemrefs.length,
      contentCount: publication.content.resources.length,
      cssCount,
      firstSpineHref: publication.spine.itemrefs[0]?.item.href ?? '',
      chapter1Path: chapter1?.item.path ?? '',
    });

    const container = document.querySelector('#reader-container') as HTMLElement | null;

    if (!container) {
      throw new Error('Missing reader container');
    }

    readerHost = await createReaderHost(publication, { container });
    updateReaderPosition();

    window.__LOMREADER_TEST__ = {
      publication,
      readerHost,
      getChapter1Html: () => publication.getText('epub/text/chapter-1.xhtml'),
      resolveCssHref: () =>
        publication.resolveHref('../css/core.css', 'epub/text/chapter-1.xhtml'),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load EPUB publication';

    renderError(message);
  }
}

void boot();
