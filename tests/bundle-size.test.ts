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
      import { ok } from 'result-ts';
      console.log(ok('test'));
    `;

    const size = await bundleAndMeasure(importCode);
    expect(size).toBeLessThan(100); // 55 bytes target + reasonable buffer
    console.log(`✅ Single function (ok): ${size} bytes (target: ~55 bytes)`);
  });

  it("basic usage - should match README claim (~107 bytes)", async () => {
    const importCode = `
      import { ok, err, isOk } from 'result-ts';
      console.log(ok('test'), err('test'), isOk);
    `;

    const size = await bundleAndMeasure(importCode);
    expect(size).toBeLessThan(150); // 107 bytes target + buffer
    console.log(`✅ Basic usage: ${size} bytes (target: ~107 bytes)`);
  });

  it("safe execution - should match README claim (~207 bytes)", async () => {
    const importCode = `
      import { ok, err, handle } from 'result-ts';
      console.log(ok, err, handle);
    `;

    const size = await bundleAndMeasure(importCode);
    expect(size).toBeLessThan(250); // 207 bytes target + buffer
    console.log(`✅ Safe execution: ${size} bytes (target: ~207 bytes)`);
  });

  it("iter module - should match README claim (~143 bytes)", async () => {
    const importCode = `
      import { map, pipe } from 'result-ts/iter';
      console.log(map, pipe);
    `;

    const size = await bundleAndMeasure(importCode);
    expect(size).toBeLessThan(200); // 143 bytes target + buffer
    console.log(`✅ Iter module: ${size} bytes (target: ~143 bytes)`);
  });

  it("batch module - should match README claim (~291 bytes)", async () => {
    const importCode = `
      import { all, analyze } from 'result-ts/batch';
      console.log(all, analyze);
    `;

    const size = await bundleAndMeasure(importCode);
    expect(size).toBeLessThan(350); // 291 bytes actual + buffer
    console.log(`✅ Batch module: ${size} bytes (target: ~291 bytes)`);
  });

  it("patterns module - should match README claim (~500 bytes)", async () => {
    const importCode = `
      import { safe, zip } from 'result-ts/patterns';
      console.log(safe, zip);
    `;

    const size = await bundleAndMeasure(importCode);
    expect(size).toBeLessThan(600); // 500 bytes actual + buffer
    console.log(`✅ Patterns module: ${size} bytes (target: ~500 bytes)`);
  });

  it("schema module - should match README claim (~245 bytes excluding Zod)", async () => {
    const importCode = `
      import { validate } from 'result-ts/schema';
      console.log(validate);
    `;

    const size = await bundleAndMeasure(importCode);
    expect(size).toBeLessThan(300); // 245 bytes target + buffer
    console.log(
      `✅ Schema module: ${size} bytes (target: ~245 bytes, excluding Zod)`,
    );
  });
});

describe("Bundle Size Tests - Architecture Verification", () => {
  it("core essentials with full feature set", async () => {
    const importCode = `
      import { ok, err, isOk, isErr, handle, unwrap, unwrapOr, match } from 'result-ts';
      console.log(ok, err, isOk, isErr, handle, unwrap, unwrapOr, match);
    `;

    const size = await bundleAndMeasure(importCode);
    expect(size).toBeLessThan(550); // 478 bytes actual + buffer
    console.log(`Core essentials (full): ${size} bytes`);
  });

  it("modular imports should be efficient", async () => {
    const sizes: Array<{ name: string; size: number; target: number }> = [];

    const modules = [
      {
        name: "Single ok",
        import: `import { ok } from 'result-ts'; console.log(ok);`,
        target: 55,
      },
      {
        name: "Basic usage",
        import: `import { ok, err, isOk } from 'result-ts'; console.log(ok, err, isOk);`,
        target: 107,
      },
      {
        name: "Safe execution",
        import: `import { ok, err, handle } from 'result-ts'; console.log(ok, err, handle);`,
        target: 207,
      },
      {
        name: "Data transform",
        import: `import { map } from 'result-ts/iter'; console.log(map);`,
        target: 143,
      },
      {
        name: "Array processing",
        import: `import { all } from 'result-ts/batch'; console.log(all);`,
        target: 291,
      },
      {
        name: "Advanced patterns",
        import: `import { safe } from 'result-ts/patterns'; console.log(safe);`,
        target: 500,
      },
      {
        name: "Validation",
        import: `import { validate } from 'result-ts/schema'; console.log(validate);`,
        target: 245,
      },
    ];

    console.log("\n=== README Bundle Size Claims Verification ===");
    console.log(
      "Name".padEnd(20) + "Actual".padEnd(10) + "Target".padEnd(10) + "Status",
    );
    console.log("-".repeat(50));

    for (const module of modules) {
      const size = await bundleAndMeasure(module.import);
      sizes.push({ name: module.name, size, target: module.target });

      const status = size <= module.target * 1.5 ? "✅ PASS" : "❌ FAIL"; // 50% tolerance
      console.log(
        `${module.name.padEnd(20)}${size.toString().padEnd(10)}${module.target.toString().padEnd(10)}${status}`,
      );
    }

    // Verify progressive size increases make sense
    const singleOk = sizes.find((s) => s.name === "Single ok")!.size;
    const basicUsage = sizes.find((s) => s.name === "Basic usage")!.size;
    const safeExecution = sizes.find((s) => s.name === "Safe execution")!.size;

    expect(basicUsage).toBeGreaterThan(singleOk);
    expect(safeExecution).toBeGreaterThan(basicUsage);
  });

  it("tree-shaking effectiveness", async () => {
    const fullImport = await bundleAndMeasure(`
      import { ok, err, isOk, isErr, unwrap, unwrapOr, handle, handleAsync, handleWith, handleWithAsync, match } from 'result-ts';
      console.log(ok, err, isOk, isErr, unwrap, unwrapOr, handle, handleAsync, handleWith, handleWithAsync, match);
    `);

    const partialImport = await bundleAndMeasure(`
      import { ok, err, isOk } from 'result-ts';
      console.log(ok, err, isOk);
    `);

    const singleImport = await bundleAndMeasure(`
      import { ok } from 'result-ts';
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
    const efficiency = (
      ((fullImport - singleImport) / fullImport) *
      100
    ).toFixed(1);
    console.log(`Tree-shaking efficiency: ${efficiency}% size reduction`);
    expect(Number(efficiency)).toBeGreaterThan(50); // Should remove at least 50% when going from full to single
  });

  it("cross-module imports should not duplicate code", async () => {
    const separateImports = await bundleAndMeasure(`
      import { ok, err } from 'result-ts';
      import { map } from 'result-ts/iter';
      console.log(ok, err, map);
    `);

    const directIterImport = await bundleAndMeasure(`
      import { ok, err, map } from 'result-ts/iter';
      console.log(ok, err, map);
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
      import { ok, err } from 'result-ts';
      console.log(ok('test'), err('test'));
    `);

    const withUnused = await bundleAndMeasure(`
      import { ok, err, isOk, isErr, handle, unwrap, match } from 'result-ts';
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
      {
        import: `import { ok } from 'result-ts'; console.log(ok);`,
        maxSize: 75,
        name: "Single function",
      },
      {
        import: `import { ok, err, isOk } from 'result-ts'; console.log(ok, err, isOk);`,
        maxSize: 130,
        name: "Basic usage",
      },
      {
        import: `import { ok, err, handle } from 'result-ts'; console.log(ok, err, handle);`,
        maxSize: 250,
        name: "Safe execution",
      },
      {
        import: `import { map } from 'result-ts/iter'; console.log(map);`,
        maxSize: 180,
        name: "Data transformation",
      },
      {
        import: `import { all } from 'result-ts/batch'; console.log(all);`,
        maxSize: 350,
        name: "Array processing",
      },
      {
        import: `import { safe } from 'result-ts/patterns'; console.log(safe);`,
        maxSize: 600,
        name: "Advanced patterns",
      },
    ];

    console.log(`\n=== README Claims Regression Test ===`);
    for (const claim of claims) {
      const size = await bundleAndMeasure(claim.import);
      console.log(`${claim.name}: ${size} bytes (max: ${claim.maxSize})`);
      expect(size).toBeLessThan(claim.maxSize);
    }
  });
});
