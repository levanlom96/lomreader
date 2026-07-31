import { createReader } from 'lomreader';
import './style.css';

const reader = createReader();

document.querySelector('#app').innerHTML = `
  <main class="playground">
    <header>
      <h1>Lomreader Playground</h1>
      <p>Local development environment for the lomreader library.</p>
    </header>
    <section class="status">
      <p>Library version: <code>${reader.version}</code></p>
      <p>
        EPUB server:
        <a href="http://localhost:3001/epubs/" target="_blank" rel="noopener">
          http://localhost:3001/epubs/
        </a>
      </p>
    </section>
  </main>
`;
