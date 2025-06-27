import { bench, describe } from "vitest";
import { ok, err, isOk, isErr } from "../dist/core.js";
import {
  all,
  oks,
  errs,
  partition,
  partitionWith,
  analyze,
  findFirst,
  reduce,
  first,
} from "../dist/batch.js";
import type { Result } from "../dist/types.js";

// Test data generators
const createMixedResults = (
  size: number,
  errorRate = 0.3,
): Result<number, string>[] => {
  const results: Result<number, string>[] = [];
  for (let i = 0; i < size; i++) {
    if (Math.random() < errorRate) {
      results.push(err(`Error ${i}`));
    } else {
      results.push(ok(i));
    }
  }
  return results;
};

const createAllSuccessResults = (size: number): Result<number, string>[] => {
  const results: Result<number, string>[] = [];
  for (let i = 0; i < size; i++) {
    results.push(ok(i));
  }
  return results;
};

const createEarlyFailureResults = (size: number): Result<number, string>[] => {
  const results: Result<number, string>[] = [];
  results.push(err("Early failure"));
  for (let i = 1; i < size; i++) {
    results.push(ok(i));
  }
  return results;
};

// Test datasets
const smallResults = createMixedResults(100);
const mediumResults = createMixedResults(1000);
const largeResults = createMixedResults(10000);
const allSuccessResults = createAllSuccessResults(1000);
const earlyFailureResults = createEarlyFailureResults(1000);

describe("Single-Pass vs Multiple-Pass Operations", () => {
  bench("✅ batch.analyze() - single pass", () => {
    analyze(largeResults);
  });

  bench("❌ naive multiple passes", () => {
    const total = largeResults.length;
    const okCount = largeResults.filter(isOk).length;
    const errorCount = largeResults.filter(isErr).length;
    const hasErrors = errorCount > 0;
    const isEmpty = total === 0;
  });

  bench("✅ batch.partition() - single pass", () => {
    partition(largeResults);
  });

  bench("❌ naive filter twice", () => {
    const oks = largeResults.filter(isOk).map((r) => r.value);
    const errors = largeResults.filter(isErr).map((r) => r.error);
  });

  bench("✅ batch.partitionWith() - everything in one pass", () => {
    partitionWith(largeResults);
  });

  bench("❌ functional equivalent to partitionWith", () => {
    const okResults = largeResults.filter(isOk);
    const errResults = largeResults.filter(isErr);
    const oks = okResults.map((r) => r.value);
    const errors = errResults.map((r) => r.error);
    const okCount = oks.length;
    const errorCount = errors.length;
    const total = largeResults.length;
  });

  bench("❌ naive partition + length calculations", () => {
    const okResults = largeResults.filter(isOk);
    const errResults = largeResults.filter(isErr);
    const oks = okResults.map((r) => r.value);
    const errors = errResults.map((r) => r.error);
    const okCount = oks.length;
    const errorCount = errors.length;
    const total = largeResults.length;
  });
});

describe("Zero-Allocation Loops vs Functional Chains", () => {
  bench("✅ batch.oks() - manual loop", () => {
    oks(mediumResults);
  });

  bench("❌ filter + map chain", () => {
    mediumResults.filter(isOk).map((r) => r.value);
  });

  bench("✅ batch.errs() - manual loop", () => {
    errs(mediumResults);
  });

  bench("❌ filter + map errors", () => {
    mediumResults.filter(isErr).map((r) => r.error);
  });

  bench("✅ both oks + errs together", () => {
    oks(mediumResults);
    errs(mediumResults);
  });

  bench("❌ functional style both", () => {
    mediumResults.filter(isOk).map((r) => r.value);
    mediumResults.filter(isErr).map((r) => r.error);
  });
});

describe("Early-Exit Optimizations", () => {
  bench("✅ batch.findFirst() - early exit", () => {
    findFirst(largeResults);
  });

  bench("❌ naive separate finds", () => {
    const firstOk = largeResults.find(isOk);
    const firstError = largeResults.find(isErr);
    const okIndex = largeResults.findIndex(isOk);
    const errorIndex = largeResults.findIndex(isErr);
  });

  bench("✅ batch.all() - early failure exit", () => {
    all(earlyFailureResults);
  });

  bench("❌ naive early failure check", () => {
    const values: number[] = [];
    for (const result of earlyFailureResults) {
      if (isErr(result)) {
        break;
      }
      values.push(result.value);
    }
  });
});

describe("Array Conversion Performance", () => {
  bench("✅ batch.all() - all success", () => {
    all(allSuccessResults);
  });

  bench("❌ naive all success check", () => {
    const values: number[] = [];
    for (const result of allSuccessResults) {
      if (isErr(result)) {
        break;
      }
      values.push(result.value);
    }
  });

  bench("✅ batch.all() - mixed results", () => {
    all(mediumResults);
  });

  bench("❌ naive mixed results check", () => {
    const values: number[] = [];
    for (const result of mediumResults) {
      if (isErr(result)) {
        break;
      }
      values.push(result.value);
    }
  });
});

describe("Custom Processing Patterns", () => {
  bench("✅ batch.reduce() - custom sum", () => {
    reduce(
      mediumResults,
      {
        onOk: (acc, value) => acc + value,
        onErr: (acc) => acc,
      },
      0,
    );
  });

  bench("❌ manual custom processing", () => {
    let sum = 0;
    for (let i = 0; i < mediumResults.length; i++) {
      const result = mediumResults[i];
      if (isOk(result)) {
        sum += result.value;
      }
    }
  });

  bench("✅ batch.first() - find first success", () => {
    first(mediumResults);
  });

  bench("❌ naive first success or all errors", () => {
    const firstOk = mediumResults.find(isOk);
    if (!firstOk) {
      const allErrors = mediumResults.filter(isErr).map((r) => r.error);
    }
  });
});

describe("Memory Allocation Comparison", () => {
  bench("✅ batch.partitionWith() - single pass", () => {
    partitionWith(largeResults);
  });

  bench("❌ equivalent functional approach", () => {
    const okResults = largeResults.filter(isOk);
    const errResults = largeResults.filter(isErr);
    const oks = okResults.map((r) => r.value);
    const errors = errResults.map((r) => r.error);
    const okCount = oks.length;
    const errorCount = errors.length;
    const total = largeResults.length;
  });

  bench("✅ batch.analyze() - minimal allocation stats", () => {
    analyze(largeResults);
  });

  bench("❌ functional chains - many allocations", () => {
    const okResults = largeResults.filter(isOk);
    const errResults = largeResults.filter(isErr);
    const okCount = okResults.length;
    const errorCount = errResults.length;
    const total = largeResults.length;
    const hasErrors = errorCount > 0;
    const isEmpty = total === 0;
  });
});

describe("Scaling Performance", () => {
  bench("batch.analyze - 100 items", () => {
    analyze(smallResults);
  });

  bench("batch.analyze - 1,000 items", () => {
    analyze(mediumResults);
  });

  bench("batch.analyze - 10,000 items", () => {
    analyze(largeResults);
  });

  bench("batch.partition - 100 items", () => {
    partition(smallResults);
  });

  bench("batch.partition - 1,000 items", () => {
    partition(mediumResults);
  });

  bench("batch.partition - 10,000 items", () => {
    partition(largeResults);
  });

  bench("batch.oks - 100 items", () => {
    oks(smallResults);
  });

  bench("batch.oks - 1,000 items", () => {
    oks(mediumResults);
  });

  bench("batch.oks - 10,000 items", () => {
    oks(largeResults);
  });

  bench("batch.partitionWith - 100 items", () => {
    partitionWith(smallResults);
  });

  bench("batch.partitionWith - 1,000 items", () => {
    partitionWith(mediumResults);
  });

  bench("batch.partitionWith - 10,000 items", () => {
    partitionWith(largeResults);
  });
});
