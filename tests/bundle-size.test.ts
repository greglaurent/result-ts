import { describe, it, expect } from 'vitest';
import { build } from 'esbuild';

const bundleAndMeasure = async (importCode: string): Promise<number> => {
  const result = await build({
    stdin: {
      contents: importCode,
      resolveDir: '.',
    },
    bundle: true,
    minify: true,
    write: false,
    format: 'esm',
    target: 'es2020',
    external: ['zod'],
    metafile: true, // Add this to see what's included
  });

  console.log('Bundle analysis:', result.metafile);
  return result.outputFiles[0].contents.length;
};
it('minimal imports should stay tiny', async () => {
  const importCode = `
    import { ok, err, isOk, isErr } from './dist/minimal.js';
    console.log(ok('test'), err('test'), isOk, isErr);
  `;

  const size = await bundleAndMeasure(importCode);
  expect(size).toBeLessThan(200); // This should pass
  console.log(`Minimal imports: ${size} bytes`);
});

it('core + utilities imports', async () => {
  const importCode = `
    import { ok, err, handle, iter, batch } from './dist/index.js';
    console.log(ok, err, handle, iter, batch);
  `;

  const size = await bundleAndMeasure(importCode);
  expect(size).toBeLessThan(3000); // Generous for iter + batch objects
  console.log(`Core + utilities: ${size} bytes (${(size / 1024).toFixed(1)}KB)`);
});

it('just core functions stay small', async () => {
  const importCode = `
    import { ok, err, handle } from './dist/index.js';
    console.log(ok, err, handle);
  `;

  const size = await bundleAndMeasure(importCode);
  expect(size).toBeLessThan(300); // Should be small like minimal
  console.log(`Just core functions: ${size} bytes`);
});
