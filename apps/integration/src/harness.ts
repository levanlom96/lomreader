import { createReader } from 'lomreader';
import './harness.css';

const app = document.querySelector('#app');

if (!app) {
  throw new Error('Missing #app element');
}

const reader = createReader();

app.innerHTML = `
  <main data-testid="reader-harness">
    <header>
      <h1>Lomreader Integration Harness</h1>
      <p>Test environment for e2e and integration scenarios.</p>
    </header>
    <section class="status">
      <p>
        Library version:
        <span data-testid="reader-version">${reader.version}</span>
      </p>
      <p>
        EPUB server:
        <a
          data-testid="epub-server-link"
          href="http://localhost:3001/epubs/"
          target="_blank"
          rel="noopener"
        >
          http://localhost:3001/epubs/
        </a>
      </p>
    </section>
  </main>
`;
