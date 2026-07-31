import cors from 'cors';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

const app = express();

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'HEAD', 'OPTIONS'],
  })
);

app.use('/epubs', express.static(path.join(__dirname, 'public', 'epubs')));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`EPUB server running at http://localhost:${PORT}`);
  console.log(`EPUBs available at http://localhost:${PORT}/epubs/`);
});
