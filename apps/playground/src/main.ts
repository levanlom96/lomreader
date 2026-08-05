import { createReader, createReaderHost, createLocalStoragePageMapCache, type ReaderHost, type SpreadLayout } from 'lomreader';
import './style.css';

const DEFAULT_EPUB_URL = 'http://localhost:3001/epubs/hypatia.epub';
const DEFAULT_BOOK_VERSION = '1';

const root = document.querySelector('#app');

if (!root) {
  throw new Error('Missing #app element');
}

const app = root as HTMLElement;

let readerHost: ReaderHost | undefined;
let activePaginationEnabled = false;

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
        <label class="checkbox-field">
          <input
            id="enable-pagination"
            type="checkbox"
            checked
            data-testid="enable-pagination"
          />
          Virtual pagination (measure pages on load)
        </label>
        <label class="version-field" data-testid="book-version-field">
          Book version
          <input
            id="book-version"
            type="text"
            value="${DEFAULT_BOOK_VERSION}"
            placeholder="Bump to invalidate page cache"
            data-testid="book-version-input"
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
      <section class="cfi-controls" hidden data-testid="cfi-controls">
        <label class="cfi-field">
          EPUB CFI
          <input id="cfi-input" type="text" placeholder="epubcfi(...)" data-testid="cfi-input" />
        </label>
        <button type="button" id="go-cfi" data-testid="go-cfi">Go to CFI</button>
        <button type="button" id="copy-selection-cfi" data-testid="copy-selection-cfi">
          Copy selection CFI
        </button>
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

  document.querySelector('#enable-pagination')?.addEventListener('change', () => {
    syncPaginationControls();
  });

  document.querySelector('#go-cfi')?.addEventListener('click', () => {
    void goToCfi();
  });

  document.querySelector('#copy-selection-cfi')?.addEventListener('click', () => {
    void copySelectionCfi();
  });

  syncPaginationControls();
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

function isPaginationSelected(): boolean {
  const checkbox = document.querySelector('#enable-pagination') as HTMLInputElement | null;

  return checkbox?.checked ?? false;
}

function syncPaginationControls(): void {
  const enabled = isPaginationSelected();
  const versionField = document.querySelector('[data-testid="book-version-field"]') as HTMLElement | null;
  const versionInput = document.querySelector('#book-version') as HTMLInputElement | null;

  if (versionField) {
    versionField.hidden = !enabled;
  }

  if (versionInput) {
    versionInput.disabled = !enabled;
  }
}

function getBookVersion(): string {
  const input = document.querySelector('#book-version') as HTMLInputElement | null;

  return input?.value.trim() || DEFAULT_BOOK_VERSION;
}

function updatePosition(): void {
  if (!readerHost) {
    return;
  }

  const position = document.querySelector('#reader-position');

  if (!position) {
    return;
  }

  if (activePaginationEnabled) {
    const total = readerHost.getTotalPages();
    const current = readerHost.getCurrentPageIndex() + 1;
    const layout = readerHost.getLayout();
    const right =
      layout === '2-up' && current + 1 <= total ? current + 1 : undefined;

    position.textContent =
      right !== undefined ? `${current}–${right} / ${total}` : `${current} / ${total}`;

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

  if (activePaginationEnabled) {
    setStatus('Re-measuring pages for new layout…');
  }

  await readerHost.setLayout(getSelectedLayout());
  updatePosition();

  if (activePaginationEnabled) {
    setStatus(`Layout updated — ${readerHost.getTotalPages()} pages.`);
    return;
  }

  setStatus(`Layout updated — spine item ${readerHost.getCurrentLinearIndex() + 1}.`);
}

async function copySelectionCfi(): Promise<void> {
  if (!readerHost) {
    return;
  }

  try {
    const cfi = await readerHost.getSelectionCfi();

    if (!cfi) {
      setStatus('Select text in the chapter first.');
      return;
    }

    const input = document.querySelector('#cfi-input') as HTMLInputElement | null;

    if (input) {
      input.value = cfi;
    }

    setStatus(`Selection CFI: ${cfi}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate CFI';

    setStatus(message, true);
  }
}

async function goToCfi(): Promise<void> {
  if (!readerHost) {
    return;
  }

  const input = document.querySelector('#cfi-input') as HTMLInputElement | null;

  if (!input?.value.trim()) {
    return;
  }

  try {
    await readerHost.goToCfi(input.value.trim());
    updatePosition();
    setStatus(`Navigated to ${input.value.trim()}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to resolve CFI';

    setStatus(message, true);
  }
}

async function loadBook(): Promise<void> {
  const urlInput = document.querySelector('#epub-url') as HTMLInputElement | null;
  const container = document.querySelector('#reader-container') as HTMLElement | null;
  const toolbar = document.querySelector('[data-testid="reader-toolbar"]') as HTMLElement | null;
  const cfiControls = document.querySelector('[data-testid="cfi-controls"]') as HTMLElement | null;
  const paginationEnabled = isPaginationSelected();
  activePaginationEnabled = paginationEnabled;

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
    const bookVersion = getBookVersion();

    if (paginationEnabled) {
      setStatus('Measuring pages…');
    }

    readerHost = await createReaderHost(publication, {
      container,
      layout: getSelectedLayout(),
      pagination: paginationEnabled,
      bookVersion: paginationEnabled ? bookVersion : undefined,
      pageMapCache: paginationEnabled ? createLocalStoragePageMapCache() : undefined,
      onPaginateProgress: paginationEnabled
        ? (detail) => {
            if (detail.fromCache) {
              setStatus('Loaded page map from cache…');
              return;
            }

            setStatus(
              `Measuring ${detail.measuredChapters}/${detail.totalChapters} chapters…`,
            );
          }
        : undefined,
      onPaginateReady: paginationEnabled
        ? (detail) => {
            const source = detail.fromCache ? 'cache' : 'layout';
            setStatus(
              `Ready — ${detail.totalPages} pages (from ${source}). Version: ${bookVersion}.`,
            );
          }
        : undefined,
    });

    readerHost.on('chapterchange', () => updatePosition());
    readerHost.on('error', (event) => setStatus(event.detail.message, true));

    if (toolbar) {
      toolbar.hidden = false;
    }

    if (cfiControls) {
      cfiControls.hidden = false;
    }

    updatePosition();

    if (!paginationEnabled) {
      setStatus(
        `Loaded ${publication.spine.itemrefs.length} spine items (spine navigation).`,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load EPUB';

    setStatus(message, true);
  }
}

renderShell();
