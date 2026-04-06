import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/tokens/index.ts',
    'src/utils/index.ts',
    'src/tailwind-preset.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  banner: {
    js: '"use client";',
  },
  treeshake: true,
  outDir: 'dist',
  target: 'es2022',
  external: ['react', 'react-dom', 'tailwindcss'],
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.mjs' : '.cjs',
    };
  },
});
