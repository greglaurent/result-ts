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
    metafile: true,
  });

  console.log('Bundle analysis:', result.metafile);
  return result.outputFiles[0].contents.length;
};

describe('Bundle Size Tests', () => {
  it('minimal imports should stay tiny', async () => {
    const importCode = `
      import { ok, err, isOk, isErr } from './dist/minimal.js';
      console.log(ok('test'), err('test'), isOk, isErr);
    `;

    const size = await bundleAndMeasure(importCode);
    expect(size).toBeLessThan(150);
    console.log(`Minimal imports: ${size} bytes`);
  });

  it('core + utilities imports', async () => {
    const importCode = `
      import { ok, err, handle, iter, batch } from './dist/index.js';
      console.log(ok, err, handle, iter, batch);
    `;

    const size = await bundleAndMeasure(importCode);
    expect(size).toBeLessThan(2500);
    console.log(`Core + utilities: ${size} bytes (${(size / 1024).toFixed(1)}KB)`);
  });

  it('just core functions stay small', async () => {
    const importCode = `
      import { ok, err, handle } from './dist/index.js';
      console.log(ok, err, handle);
    `;

    const size = await bundleAndMeasure(importCode);
    expect(size).toBeLessThan(250);
    console.log(`Just core functions: ${size} bytes`);
  });
});
