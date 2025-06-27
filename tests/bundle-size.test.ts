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

describe("Bundle Size Tests - README Claims Verification", () => {
  it("single function import - should match README claim (~55 bytes)", async () => {
    const importCode = `
      import { ok } from './dist/index.js';
      console.log(ok('test'));
    `;

    const size = await bundleAndMeasure(importCode);
    expect(size).toBeLessThan(100); // 55 bytes target + reasonable buffer
    console.log(`✅ Single function (ok): ${size} bytes (target: ~55 bytes)`);
  });

  it("basic usage - should match README claim (~107 bytes)", async () => {
    const importCode = `
      import { ok, err, isOk } from './dist/index.js';
      console.log(ok('test'), err('test'), isOk);
    `;

    const size = await bundleAndMeasure(importCode);
    expect(size).toBeLessThan(150); // 107 bytes target + buffer
    console.log(`✅ Basic usage: ${size} bytes (target: ~107 bytes)`);
  });

  it("safe execution - should match README claim (~207 bytes)", async () => {
    const importCode = `
      import { ok, err, handle } from './dist/index.js';
      console.log(ok, err, handle);
    `;

    const size = await bundleAndMeasure(importCode);
    expect(size).toBeLessThan(250); // 207 bytes target + buffer
    console.log(`✅ Safe execution: ${size} bytes (target: ~207 bytes)`);
  });

  it("iter module - should match README claim (~143 bytes)", async () => {
    const importCode = `
      import { iter } from './dist/iter.js';
      console.log(iter.map, iter.pipe);
    `;

    const size = await bundleAndMeasure(importCode);
    expect(size).toBeLessThan(200); // 143 bytes target + buffer
    console.log(`✅ Iter module: ${size} bytes (target: ~143 bytes)`);
  });

  it("batch module - should match README claim (~189 bytes)", async () => {
    const importCode = `
      import { batch } from './dist/batch.js';
      console.log(batch.all, batch.analyze);
    `;

    const size = await bundleAndMeasure(importCode);
    expect(size).toBeLessThan(250); // 189 bytes target + buffer
    console.log(`✅ Batch module: ${size} bytes (target: ~189 bytes)`);
  });

  it("patterns module - should match README claim (~325 bytes)", async () => {
    const importCode = `
      import { patterns } from './dist/patterns.js';
      console.log(patterns.safe, patterns.zip);
    `;

    const size = await bundleAndMeasure(importCode);
    expect(size).toBeLessThan(400); // 325 bytes target + buffer
    console.log(`✅ Patterns module: ${size} bytes (target: ~325 bytes)`);
  });

  it("schema module - should match README claim (~245 bytes excluding Zod)", async () => {
    const importCode = `
      import { validate } from './dist/schema.js';
      console.log(validate);
    `;

    const size = await bundleAndMeasure(importCode);
    expect(size).toBeLessThan(300); // 245 bytes target + buffer
    console.log(`✅ Schema module: ${size} bytes (target: ~245 bytes, excluding Zod)`);
  });
});

describe("Bundle Size Tests - Architecture Verification", () => {
  it("core essentials with full feature set", async () => {
    const importCode = `
      import { ok, err, isOk, isErr, handle, unwrap, unwrapOr, match } from './dist/index.js';
      console.log(ok, err, isOk, isErr, handle, unwrap, unwrapOr, match);
    `;

    const size = await bundleAndMeasure(importCode);
    expect(size).toBeLessThan(350);
    console.log(`Core essentials (full): ${size} bytes`);
  });

  it("modular imports should be efficient", async () => {
    const sizes: Array<{ name: string; size: number; target: number }> = [];

    const modules = [
      { name: "Single ok", import: `import { ok } from './dist/index.js'; console.log(ok);`, target: 55 },
      { name: "Basic usage", import: `import { ok, err, isOk } from './dist/index.js'; console.log(ok, err, isOk);`, target: 107 },
      { name: "Safe execution", import: `import { ok, err, handle } from './dist/index.js'; console.log(ok, err, handle);`, target: 207 },
      { name: "Data transform", import: `import { iter } from './dist/iter.js'; console.log(iter.map);`, target: 143 },
      { name: "Array processing", import: `import { batch } from './dist/batch.js'; console.log(batch.all);`, target: 189 },
      { name: "Advanced patterns", import: `import { patterns } from './dist/patterns.js'; console.log(patterns.safe);`, target: 325 },
      { name: "Validation", import: `import { validate } from './dist/schema.js'; console.log(validate);`, target: 245 },
    ];

    console.log("\n=== README Bundle Size Claims Verification ===");
    console.log("Name".padEnd(20) + "Actual".padEnd(10) + "Target".padEnd(10) + "Status");
    console.log("-".repeat(50));

    for (const module of modules) {
      const size = await bundleAndMeasure(module.import);
      sizes.push({ name: module.name, size, target: module.target });

      const status = size <= module.target * 1.5 ? "✅ PASS" : "❌ FAIL"; // 50% tolerance
      console.log(
        `${module.name.padEnd(20)}${size.toString().padEnd(10)}${module.target.toString().padEnd(10)}${status}`
      );
    }

    // Verify progressive size increases make sense
    const singleOk = sizes.find(s => s.name === "Single ok")!.size;
    const basicUsage = sizes.find(s => s.name === "Basic usage")!.size;
    const safeExecution = sizes.find(s => s.name === "Safe execution")!.size;

    expect(basicUsage).toBeGreaterThan(singleOk);
    expect(safeExecution).toBeGreaterThan(basicUsage);
  });

  it("tree-shaking effectiveness", async () => {
    const fullImport = await bundleAndMeasure(`
      import { ok, err, isOk, isErr, unwrap, unwrapOr, handle, handleAsync, handleWith, handleWithAsync, match } from './dist/index.js';
      console.log(ok, err, isOk, isErr, unwrap, unwrapOr, handle, handleAsync, handleWith, handleWithAsync, match);
    `);

    const partialImport = await bundleAndMeasure(`
      import { ok, err, isOk } from './dist/index.js';
      console.log(ok, err, isOk);
    `);

    const singleImport = await bundleAndMeasure(`
      import { ok } from './dist/index.js';
      console.log(ok);
    `);

    console.log(`\n=== Tree-Shaking Effectiveness ===`);
    console.log(`Full import:    ${fullImport} bytes`);
    console.log(`Partial import: ${partialImport} bytes`);
    console.log(`Single import:  ${singleImport} bytes`);

    // Tree-shaking should work progressively
    expect(partialImport).toBeLessThan(fullImport);
    expect(singleImport).toBeLessThan(partialImport);

    // Calculate efficiency
    const efficiency = ((fullImport - singleImport) / fullImport * 100).toFixed(1);
    console.log(`Tree-shaking efficiency: ${efficiency}% size reduction`);
    expect(Number(efficiency)).toBeGreaterThan(50); // Should remove at least 50% when going from full to single
  });

  it("cross-module imports should not duplicate code", async () => {
    const separateImports = await bundleAndMeasure(`
      import { ok, err } from './dist/index.js';
      import { iter } from './dist/iter.js';
      console.log(ok, err, iter.map);
    `);

    const directIterImport = await bundleAndMeasure(`
      import { ok, err, iter } from './dist/iter.js';
      console.log(ok, err, iter.map);
    `);

    console.log(`\n=== Cross-Module Import Optimization ===`);
    console.log(`Separate imports: ${separateImports} bytes`);
    console.log(`Direct iter import: ${directIterImport} bytes`);

    // Direct import should be same or better (no code duplication)
    expect(directIterImport).toBeLessThanOrEqual(separateImports);

    const difference = Math.abs(separateImports - directIterImport);
    expect(difference).toBeLessThan(50); // Should be very close, minimal duplication
  });

  it("unused imports are eliminated", async () => {
    const usedOnly = await bundleAndMeasure(`
      import { ok, err } from './dist/index.js';
      console.log(ok('test'), err('test'));
    `);

    const withUnused = await bundleAndMeasure(`
      import { ok, err, isOk, isErr, handle, unwrap, match } from './dist/index.js';
      console.log(ok('test'), err('test')); // Only using ok and err
    `);

    console.log(`\n=== Unused Import Elimination ===`);
    console.log(`Used only: ${usedOnly} bytes`);
    console.log(`With unused: ${withUnused} bytes`);

    // Should eliminate unused imports completely
    expect(withUnused).toBe(usedOnly);
  });
});

describe("Bundle Size Tests - Regression Prevention", () => {
  it("README claims should remain accurate", async () => {
    // This test will fail if bundle sizes exceed README claims by too much
    // Forcing developers to either optimize or update claims

    const claims = [
      { import: `import { ok } from './dist/index.js'; console.log(ok);`, maxSize: 75, name: "Single function" },
      { import: `import { ok, err, isOk } from './dist/index.js'; console.log(ok, err, isOk);`, maxSize: 130, name: "Basic usage" },
      { import: `import { ok, err, handle } from './dist/index.js'; console.log(ok, err, handle);`, maxSize: 250, name: "Safe execution" },
      { import: `import { iter } from './dist/iter.js'; console.log(iter.map);`, maxSize: 180, name: "Data transformation" },
      { import: `import { batch } from './dist/batch.js'; console.log(batch.all);`, maxSize: 230, name: "Array processing" },
      { import: `import { patterns } from './dist/patterns.js'; console.log(patterns.safe);`, maxSize: 400, name: "Advanced patterns" },
    ];

    console.log(`\n=== README Claims Regression Test ===`);
    for (const claim of claims) {
      const size = await bundleAndMeasure(claim.import);
      console.log(`${claim.name}: ${size} bytes (max: ${claim.maxSize})`);
      expect(size).toBeLessThan(claim.maxSize);
    }
  });
});
