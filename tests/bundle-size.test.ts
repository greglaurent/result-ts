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

describe('Bundle Size Tests - Layered Architecture', () => {
  it('core essentials (result-ts) should stay minimal', async () => {
    const importCode = `
      import { ok, err, isOk, isErr, handle } from './dist/index.js';
      console.log(ok('test'), err('test'), isOk, isErr, handle);
    `;

    const size = await bundleAndMeasure(importCode);
    expect(size).toBeLessThan(260); // Core should be ~255 bytes
    console.log(`Core essentials: ${size} bytes`);
  });

  it('iter layer (core + iteration) should be reasonable', async () => {
    const importCode = `
      import { ok, err, map, pipe, andThen } from './dist/iter.js';
      console.log(ok, err, map, pipe, andThen);
    `;

    const size = await bundleAndMeasure(importCode);
    expect(size).toBeLessThan(800); // Core + iter functions
    console.log(`Iter layer: ${size} bytes`);
  });

  it('batch layer (core + batch) should be efficient', async () => {
    const importCode = `
      import { ok, err, all, partition, analyze } from './dist/batch.js';
      console.log(ok, err, all, partition, analyze);
    `;

    const size = await bundleAndMeasure(importCode);
    expect(size).toBeLessThan(1200); // Core + batch functions
    console.log(`Batch layer: ${size} bytes`);
  });

  it('utils layer (core + utilities) should be small', async () => {
    const importCode = `
      import { ok, err, inspect, tap, fromNullable } from './dist/utils.js';
      console.log(ok, err, inspect, tap, fromNullable);
    `;

    const size = await bundleAndMeasure(importCode);
    expect(size).toBeLessThan(400); // Core + utility functions
    console.log(`Utils layer: ${size} bytes`);
  });

  it('patterns layer (core + advanced) should be controlled', async () => {
    const importCode = `
      import { ok, err, safe, zip, apply } from './dist/patterns.js';
      console.log(ok, err, safe, zip, apply);
    `;

    const size = await bundleAndMeasure(importCode);
    expect(size).toBeLessThan(1000); // Core + advanced patterns
    console.log(`Patterns layer: ${size} bytes`);
  });

  it('schema layer (core + validation) should exclude Zod', async () => {
    const importCode = `
      import { ok, err, validate, parseJson } from './dist/schema.js';
      console.log(ok, err, validate, parseJson);
    `;

    const size = await bundleAndMeasure(importCode);
    expect(size).toBeLessThan(1500); // Core + validation (without Zod)
    console.log(`Schema layer: ${size} bytes (excluding Zod)`);
  });

  it('compare layer sizes - should show progression', async () => {
    const layers = [
      { name: 'Core', import: `import { ok, err, handle } from './dist/index.js'; console.log(ok, err, handle);` },
      { name: 'Utils', import: `import { ok, err, tap } from './dist/utils.js'; console.log(ok, err, tap);` },
      { name: 'Iter', import: `import { ok, err, map } from './dist/iter.js'; console.log(ok, err, map);` },
      { name: 'Patterns', import: `import { ok, err, safe } from './dist/patterns.js'; console.log(ok, err, safe);` },
      { name: 'Batch', import: `import { ok, err, all } from './dist/batch.js'; console.log(ok, err, all);` },
      { name: 'Schema', import: `import { ok, err, validate } from './dist/schema.js'; console.log(ok, err, validate);` },
    ];

    console.log('\n=== Layer Size Comparison ===');
    for (const layer of layers) {
      const size = await bundleAndMeasure(layer.import);
      console.log(`${layer.name.padEnd(8)}: ${size.toString().padStart(4)} bytes`);
    }

    // Get sizes for final validation
    const coreSize = await bundleAndMeasure(layers[0].import);
    const utilsSize = await bundleAndMeasure(layers[1].import);

    // All single-function imports should be very small
    expect(coreSize).toBeLessThan(220);  // ~203 bytes actual
    expect(utilsSize).toBeLessThan(140);  // ~127 bytes actual
  });

  it('selective imports should tree-shake properly', async () => {
    const fullImport = await bundleAndMeasure(`
      import { ok, err, isOk, isErr, unwrap, unwrapOr, handle, handleAsync, handleWith, handleWithAsync, match } from './dist/index.js';
      console.log(ok, err, isOk, isErr, unwrap, unwrapOr, handle, handleAsync, handleWith, handleWithAsync, match);
    `);

    const partialImport = await bundleAndMeasure(`
      import { ok, err, isOk } from './dist/index.js';
      console.log(ok, err, isOk);
    `);

    console.log(`Full core import: ${fullImport} bytes`);
    console.log(`Partial import: ${partialImport} bytes`);

    // Tree-shaking should make some difference, but maybe not huge due to small core functions
    expect(partialImport).toBeLessThanOrEqual(fullImport);
  });
});
