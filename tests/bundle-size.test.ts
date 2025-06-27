import { describe, it, expect } from "vitest";
import { build } from "esbuild";

const bundleAndMeasure = async (importCode: string): Promise<number> => {
  const result = await build({
    stdin: {
      contents: importCode,
      resolveDir: ".",
    },
    bundle: true,
    minify: true,
    write: false,
    format: "esm",
    target: "es2020",
    external: ["zod"],
  });

  return result.outputFiles[0].contents.length;
};

describe("Bundle Size Tests - Refactored Architecture", () => {
  it("core essentials (result-ts) with actual implementations", async () => {
    const importCode = `
      import { ok, err, isOk, isErr, handle } from './dist/index.js';
      console.log(ok('test'), err('test'), isOk, isErr, handle);
    `;

    const size = await bundleAndMeasure(importCode);
    expect(size).toBeLessThan(300); // Core with implementations should be ~259 bytes
    console.log(`Core essentials: ${size} bytes`);
  });

  it("iter layer (core + iteration) should be reasonable", async () => {
    const importCode = `
      import { ok, err, map, pipe, andThen } from './dist/iter.js';
      console.log(ok, err, map, pipe, andThen);
    `;

    const size = await bundleAndMeasure(importCode);
    expect(size).toBeLessThan(300); // Core + iter functions with implementations
    console.log(`Iter layer: ${size} bytes`);
  });

  it("batch layer (core + batch) should be efficient", async () => {
    const importCode = `
      import { ok, err, all, partition, analyze } from './dist/batch.js';
      console.log(ok, err, all, partition, analyze);
    `;

    const size = await bundleAndMeasure(importCode);
    expect(size).toBeLessThan(500); // Core + batch functions with implementations
    console.log(`Batch layer: ${size} bytes`);
  });

  it("utils layer (core + utilities) should be small", async () => {
    const importCode = `
      import { ok, err, inspect, tap, fromNullable } from './dist/utils.js';
      console.log(ok, err, inspect, tap, fromNullable);
    `;

    const size = await bundleAndMeasure(importCode);
    expect(size).toBeLessThan(350); // Core + utility functions with implementations
    console.log(`Utils layer: ${size} bytes`);
  });

  it("patterns layer (core + advanced) should be controlled", async () => {
    const importCode = `
      import { ok, err, safe, zip, apply } from './dist/patterns.js';
      console.log(ok, err, safe, zip, apply);
    `;

    const size = await bundleAndMeasure(importCode);
    expect(size).toBeLessThan(700); // Core + advanced patterns with implementations
    console.log(`Patterns layer: ${size} bytes`);
  });

  it("schema layer (core + validation) should exclude Zod", async () => {
    const importCode = `
      import { ok, err, validate, parseJson } from './dist/schema.js';
      console.log(ok, err, validate, parseJson);
    `;

    const size = await bundleAndMeasure(importCode);
    expect(size).toBeLessThan(450); // Core + validation with implementations (without Zod)
    console.log(`Schema layer: ${size} bytes (excluding Zod)`);
  });

  it("compare layer sizes - should show logical progression", async () => {
    const layers = [
      {
        name: "Core",
        import: `import { ok, err, handle } from './dist/index.js'; console.log(ok, err, handle);`,
      },
      {
        name: "Utils",
        import: `import { ok, err, tap } from './dist/utils.js'; console.log(ok, err, tap);`,
      },
      {
        name: "Iter",
        import: `import { ok, err, map } from './dist/iter.js'; console.log(ok, err, map);`,
      },
      {
        name: "Patterns",
        import: `import { ok, err, safe } from './dist/patterns.js'; console.log(ok, err, safe);`,
      },
      {
        name: "Batch",
        import: `import { ok, err, all } from './dist/batch.js'; console.log(ok, err, all);`,
      },
      {
        name: "Schema",
        import: `import { ok, err, validate } from './dist/schema.js'; console.log(ok, err, validate);`,
      },
    ];

    console.log("\n=== Layer Size Comparison (Post-Refactor) ===");
    const sizes: { name: string; size: number }[] = [];

    for (const layer of layers) {
      const size = await bundleAndMeasure(layer.import);
      sizes.push({ name: layer.name, size });
      console.log(
        `${layer.name.padEnd(8)}: ${size.toString().padStart(4)} bytes`,
      );
    }

    // Validate that sizes are reasonable
    const coreSize = sizes.find((s) => s.name === "Core")!.size;
    const utilsSize = sizes.find((s) => s.name === "Utils")!.size;
    const schemaSize = sizes.find((s) => s.name === "Schema")!.size;

    // Core should be reasonable for 11 implemented functions
    expect(coreSize).toBeLessThan(300);
    expect(coreSize).toBeGreaterThan(150); // Should be substantial with implementations

    // Utils should be slightly larger than core (core + 5 utilities)
    expect(utilsSize).toBeGreaterThan(100);
    expect(utilsSize).toBeLessThan(350);

    // Schema should be reasonable with validation logic
    expect(schemaSize).toBeGreaterThan(150);
    expect(schemaSize).toBeLessThan(450);
  });

  it("selective imports should tree-shake properly with new architecture", async () => {
    const fullCoreImport = await bundleAndMeasure(`
      import { ok, err, isOk, isErr, unwrap, unwrapOr, handle, handleAsync, handleWith, handleWithAsync, match } from './dist/index.js';
      console.log(ok, err, isOk, isErr, unwrap, unwrapOr, handle, handleAsync, handleWith, handleWithAsync, match);
    `);

    const partialCoreImport = await bundleAndMeasure(`
      import { ok, err, isOk } from './dist/index.js';
      console.log(ok, err, isOk);
    `);

    const singleFunctionImport = await bundleAndMeasure(`
      import { ok } from './dist/index.js';
      console.log(ok);
    `);

    console.log(`Full core import: ${fullCoreImport} bytes`);
    console.log(`Partial core import: ${partialCoreImport} bytes`);
    console.log(`Single function import: ${singleFunctionImport} bytes`);

    // Tree-shaking should work well with individual implementations
    expect(partialCoreImport).toBeLessThan(fullCoreImport);
    expect(singleFunctionImport).toBeLessThan(partialCoreImport);

    // Single function should be very small since we have individual exports
    expect(singleFunctionImport).toBeLessThan(100);
  });

  it("cross-layer imports should not duplicate core functions", async () => {
    const coreOnly = await bundleAndMeasure(`
      import { ok, err, handle } from './dist/index.js';
      console.log(ok, err, handle);
    `);

    const iterWithCore = await bundleAndMeasure(`
      import { ok, err, handle } from './dist/index.js';
      import { map } from './dist/iter.js';
      console.log(ok, err, handle, map);
    `);

    const iterDirectly = await bundleAndMeasure(`
      import { ok, err, handle, map } from './dist/iter.js';
      console.log(ok, err, handle, map);
    `);

    console.log(`Core only: ${coreOnly} bytes`);
    console.log(`Core + iter separate: ${iterWithCore} bytes`);
    console.log(`Iter directly: ${iterDirectly} bytes`);

    // Direct import from iter should be more efficient than mixing
    expect(iterDirectly).toBeLessThanOrEqual(iterWithCore);

    // The difference should be minimal due to shared implementations
    const difference = Math.abs(iterDirectly - iterWithCore);
    expect(difference).toBeLessThan(100); // Should be very close
  });

  it("types-only imports should have minimal impact", async () => {
    const functionsOnly = await bundleAndMeasure(`
      import { ok, err } from './dist/index.js';
      console.log(ok, err);
    `);

    const withUnusedImports = await bundleAndMeasure(`
      import { ok, err, isOk, unwrap } from './dist/index.js';
      console.log(ok, err);
    `);

    console.log(`Functions only: ${functionsOnly} bytes`);
    console.log(`With unused imports: ${withUnusedImports} bytes`);

    // Unused imports should be tree-shaken away
    expect(withUnusedImports).toBe(functionsOnly);
  });
});
