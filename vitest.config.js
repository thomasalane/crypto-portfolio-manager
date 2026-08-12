import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // Node by default; component files opt into jsdom with a docblock.
    environment: 'node',
    include: ['tests/**/*.test.{js,jsx}'],
  },
});
