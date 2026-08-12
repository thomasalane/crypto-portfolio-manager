import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createApp } from './routes.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Node reads .env natively; a missing file is fine — only the assistant needs it.
try {
  process.loadEnvFile(join(root, '.env'));
} catch {
  // no .env present
}

const PORT = Number(process.env.PORT) || 4173;
const dataFile = join(root, 'portfolio.json');
const dist = join(root, 'dist');

const app = createApp({ dataFile, apiKey: process.env.GEMINI_API_KEY ?? '' });

if (existsSync(dist)) {
  app.use(express.static(dist));
  // Anything not under /api falls back to the single page.
  app.get(/^(?!\/api\/).*/, (req, res) => res.sendFile(join(dist, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`Portfolio running at http://localhost:${PORT}`);
  if (!existsSync(dist)) {
    console.log('The interface has not been built yet. Run "npm run build".');
  }
  if (!process.env.GEMINI_API_KEY) {
    console.log('GEMINI_API_KEY is not set — the assistant will be unavailable.');
  }
});
