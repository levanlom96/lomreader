import { createReader, createReaderHost, type ReaderHost, type SpreadLayout } from 'lomreader';
import './style.css';

const DEFAULT_EPUB_URL = 'http://localhost:3001/epubs/hypatia.epub';

const root = document.querySelector('#app');

if (!root) {
  throw new Error('Missing #app element');
}

const app = root as HTMLElement;

let readerHost: ReaderHost | undefined;

function renderShell(): void {
  app.innerHTML = `
    <main class="playground">
      <header>
        <h1>Lomreader Playground</h1>
        <p>Load an EPUB and read it with blob-backed iframe rendering.</p>
      </header>
      <section class="controls">
        <label class="url-field">
          EPUB URL
          <input
            id="epub-url"
            type="url"
            value="${DEFAULT_EPUB_URL}"
            data-testid="epub-url-input"
          />
        </label>
        <label class="layout-field">
          Layout
          <select id="spread-layout" data-testid="spread-layout">
            <option value="1-up">1 page</option>
            <option value="2-up">2 page spread</option>
          </select>
        </label>
        <button type="button" id="load-book" data-testid="load-book">Load book</button>
      </section>
      <p id="status" class="status" data-testid="reader-status">Enter a URL and load the book.</p>
      <section class="reader-toolbar" hidden data-testid="reader-toolbar">
        <button type="button" id="prev-chapter" data-testid="reader-prev">Previous</button>
        <span id="reader-position" data-testid="reader-position">—</span>
        <button type="button" id="next-chapter" data-testid="reader-next">Next</button>
      </section>
      <section
        id="reader-container"
        class="reader-container"
        data-testid="reader-container"
      ></section>
    </main>
  `;

  document.querySelector('#load-book')?.addEventListener('click', () => {
    void loadBook();
  });

  document.querySelector('#prev-chapter')?.addEventListener('click', () => {
    void readerHost?.prev().then(updatePosition);
  });

  document.querySelector('#next-chapter')?.addEventListener('click', () => {
    void readerHost?.next().then(updatePosition);
  });

  document.querySelector('#spread-layout')?.addEventListener('change', () => {
    void applyLayout();
  });
}

function setStatus(message: string, isError = false): void {
  const status = document.querySelector('#status');

  if (!status) {
    return;
  }

  status.textContent = message;
  status.classList.toggle('error', isError);
}

function getSelectedLayout(): SpreadLayout {
  const select = document.querySelector('#spread-layout') as HTMLSelectElement | null;

  return select?.value === '2-up' ? '2-up' : '1-up';
}

function updatePosition(): void {
  if (!readerHost) {
    return;
  }

  const position = document.querySelector('#reader-position');

  if (!position) {
    return;
  }

  const total = readerHost.getLinearSpineCount();
  const left = readerHost.getCurrentLinearIndex() + 1;
  const visibleCount = readerHost.getVisibleSpineIndices().length;
  const right = visibleCount > 1 ? left + 1 : undefined;

  position.textContent =
    right !== undefined ? `${left}–${right} / ${total}` : `${left} / ${total}`;
}

async function applyLayout(): Promise<void> {
  if (!readerHost) {
    return;
  }

  await readerHost.setLayout(getSelectedLayout());
  updatePosition();
}

async function loadBook(): Promise<void> {
  const urlInput = document.querySelector('#epub-url') as HTMLInputElement | null;
  const container = document.querySelector('#reader-container') as HTMLElement | null;
  const toolbar = document.querySelector('[data-testid="reader-toolbar"]') as HTMLElement | null;

  if (!urlInput || !container) {
    return;
  }

  readerHost?.destroy();
  readerHost = undefined;
  container.replaceChildren();

  setStatus('Loading EPUB…');

  try {
    const reader = createReader();
    const publication = await reader.open(urlInput.value.trim());
    readerHost = await createReaderHost(publication, {
      container,
      layout: getSelectedLayout(),
    });

    readerHost.on('chapterchange', () => updatePosition());
    readerHost.on('error', (event) => setStatus(event.detail.message, true));

    if (toolbar) {
      toolbar.hidden = false;
    }

    updatePosition();
    setStatus(`Loaded ${publication.spine.itemrefs.length} spine items.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load EPUB';

    setStatus(message, true);
  }
}

renderShell();
