import { createReader } from 'lomreader';
import './harness.css';

const EPUB_URL = 'http://localhost:3001/epubs/hypatia.epub';

const root = document.querySelector('#app');

if (!root) {
  throw new Error('Missing #app element');
}

const app = root as HTMLElement;

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

function renderPublication(summary: {
  url: string;
  identifier?: string;
  manifestCount: number;
  linkedResourceCount: number;
  spineCount: number;
  contentCount: number;
  firstSpineHref: string;
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
            <dd><span data-testid="content-count">${summary.contentCount}</span> resources</dd>
          </div>
        </dl>
        <p>
          First spine item:
          <code data-testid="first-spine-href">${summary.firstSpineHref}</code>
        </p>
      </section>
    </main>
  `;
}

async function boot(): Promise<void> {
  renderLoading();

  try {
    const reader = createReader();
    const publication = await reader.open(EPUB_URL);

    renderPublication({
      url: publication.url,
      identifier: publication.packageDocument.uniqueIdentifier,
      manifestCount: publication.manifest.publicationResources.length,
      linkedResourceCount: publication.manifest.linkedResources.length,
      spineCount: publication.spine.itemrefs.length,
      contentCount: publication.content.resources.length,
      firstSpineHref: publication.spine.itemrefs[0]?.item.href ?? '',
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load EPUB publication';

    renderError(message);
  }
}

void boot();
