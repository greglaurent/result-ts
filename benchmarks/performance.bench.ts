import { bench, describe } from 'vitest';
import { ok, err, isOk, isErr, handle, handleAsync, iter, batch } from '../src';

// Test data generators
const createResults = (size: number, errorRate = 0.3) =>
  Array.from({ length: size }, (_, i) =>
    Math.random() < errorRate ? err(`Error ${i}`) : ok(i)
  );

const createLargeResults = () => createResults(10000);
const createMediumResults = () => createResults(1000);

describe('Performance: Single-pass vs Multiple-pass Operations', () => {
  const results = createLargeResults();

  bench('✅ result-ts: batch.analyze (single-pass)', () => {
    return batch.analyze(results);
  });

  bench('❌ naive: multiple separate passes', () => {
    const okCount = results.filter(r => r.type === 'Ok').length;
    const errorCount = results.filter(r => r.type === 'Err').length;
    const hasErrors = errorCount > 0;
    const total = results.length;
    const successRate = okCount / total;
    return { okCount, errorCount, hasErrors, total, successRate };
  });

  bench('✅ result-ts: batch.partition (single-pass)', () => {
    return batch.partition(results);
  });

  bench('❌ naive: filter twice', () => {
    const oks = results.filter(isOk).map(r => r.value);
    const errs = results.filter(isErr).map(r => r.error);
    return { oks, errs };
  });
});

describe('Performance: Zero-allocation Loops', () => {
  const results = createLargeResults();

  bench('✅ result-ts: batch.oks (manual loop)', () => {
    return batch.oks(results);
  });

  bench('❌ functional: filter + map (allocates functions)', () => {
    return results.filter(r => r.type === 'Ok').map(r => r.value);
  });

  bench('✅ result-ts: batch.errs (manual loop)', () => {
    return batch.errs(results);
  });

  bench('❌ functional: filter + map errors (allocates functions)', () => {
    return results.filter(r => r.type === 'Err').map(r => r.error);
  });

  bench('✅ result-ts: batch.findFirst (early exit)', () => {
    return batch.findFirst(results);
  });

  bench('❌ naive: find without early exit optimization', () => {
    const firstOk = results.find(isOk);
    const firstError = results.find(isErr);
    return { firstOk, firstError };
  });
});

describe('Performance: Error Handling Overhead', () => {
  const validJson = '{"name": "John", "age": 30}';
  const invalidJson = '{"name": "John", "age":}';

  bench('✅ result-ts: handle with valid input', () => {
    return handle(() => JSON.parse(validJson));
  });

  bench('⚡ raw: try-catch with valid input', () => {
    try {
      return { type: 'Ok', value: JSON.parse(validJson) };
    } catch (error) {
      return { type: 'Err', error };
    }
  });

  bench('✅ result-ts: handle with invalid input', () => {
    return handle(() => JSON.parse(invalidJson));
  });

  bench('⚡ raw: try-catch with invalid input', () => {
    try {
      return { type: 'Ok', value: JSON.parse(invalidJson) };
    } catch (error) {
      return { type: 'Err', error };
    }
  });

  bench('✅ result-ts: handle repeated operations', () => {
    const results = [];
    for (let i = 0; i < 100; i++) {
      results.push(handle(() => JSON.parse(i % 2 === 0 ? validJson : invalidJson)));
    }
    return results;
  });

  bench('⚡ raw: try-catch repeated operations', () => {
    const results = [];
    for (let i = 0; i < 100; i++) {
      try {
        results.push({ type: 'Ok', value: JSON.parse(i % 2 === 0 ? validJson : invalidJson) });
      } catch (error) {
        results.push({ type: 'Err', error });
      }
    }
    return results;
  });
});

describe('Performance: Result Chaining Patterns', () => {
  const add1 = (x: number) => ok(x + 1);
  const multiply2 = (x: number) => ok(x * 2);
  const subtract3 = (x: number) => ok(x - 3);
  const maybeError = (x: number) => x > 50 ? err('too big') : ok(x);

  bench('✅ result-ts: iter.pipe (optimized)', () => {
    return iter.pipe(ok(10), add1, multiply2, subtract3, maybeError);
  });

  bench('❌ manual: verbose chaining', () => {
    const step1 = add1(10);
    if (step1.type === 'Err') return step1;

    const step2 = multiply2(step1.value);
    if (step2.type === 'Err') return step2;

    const step3 = subtract3(step2.value);
    if (step3.type === 'Err') return step3;

    return maybeError(step3.value);
  });

  bench('🔄 functional: nested andThen calls', () => {
    return iter.andThen(
      iter.andThen(
        iter.andThen(
          iter.andThen(ok(10), add1),
          multiply2
        ),
        subtract3
      ),
      maybeError
    );
  });
});

describe('Performance: Array Processing at Scale', () => {
  const largeResults = createResults(50000);
  const mediumResults = createMediumResults();

  bench('✅ result-ts: batch.all on medium array', () => {
    return batch.all(mediumResults);
  });

  bench('❌ manual: reduce for all pattern', () => {
    return mediumResults.reduce((acc, result) => {
      if (acc.type === 'Err') return acc;
      if (result.type === 'Err') return result;
      acc.value.push(result.value);
      return acc;
    }, ok([] as any[]));
  });

  bench('✅ result-ts: comprehensive analysis on large array', () => {
    return batch.analyze(largeResults);
  });

  bench('❌ naive: separate analysis passes', () => {
    const total = largeResults.length;
    const okCount = largeResults.filter(isOk).length;
    const errorCount = largeResults.filter(isErr).length;
    const hasErrors = errorCount > 0;
    const isEmpty = total === 0;
    const successRate = total > 0 ? okCount / total : 0;
    const firstOk = largeResults.find(isOk);
    const firstError = largeResults.find(isErr);
    return { total, okCount, errorCount, hasErrors, isEmpty, successRate, firstOk, firstError };
  });
});

describe('Performance: Memory Allocation Patterns', () => {
  const results = createMediumResults();

  bench('✅ result-ts: memory-efficient extraction', () => {
    // Single allocation for results array
    const values = batch.oks(results);
    const errors = batch.errs(results);
    return { values, errors };
  });

  bench('❌ functional: multiple allocations', () => {
    // Multiple intermediate arrays created
    const values = results
      .filter(r => r.type === 'Ok')  // allocation 1
      .map(r => r.value);            // allocation 2

    const errors = results
      .filter(r => r.type === 'Err') // allocation 3
      .map(r => r.error);            // allocation 4

    return { values, errors };
  });

  bench('✅ result-ts: streaming analysis', () => {
    // Processes results without intermediate storage
    return batch.analyze(results);
  });

  bench('❌ step-by-step: intermediate collections', () => {
    const oks = results.filter(isOk);     // intermediate array 1
    const errs = results.filter(isErr);   // intermediate array 2
    const values = oks.map(r => r.value); // intermediate array 3
    const errors = errs.map(r => r.error); // intermediate array 4

    return {
      total: results.length,
      okCount: oks.length,
      errorCount: errs.length,
      hasErrors: errs.length > 0,
      values,
      errors
    };
  });
});

describe('Performance: Async Operations', () => {
  const mockAsyncSuccess = async () => "success";
  const mockAsyncFailure = async () => { throw new Error("failure"); };
  const mockAsyncMixed = async (shouldFail: boolean) => {
    if (shouldFail) throw new Error("failure");
    return "success";
  };

  bench('✅ result-ts: handleAsync with success', async () => {
    const result = await handleAsync(mockAsyncSuccess);
    return result;
  });

  bench('⚡ raw: try-catch async with success', async () => {
    try {
      const value = await mockAsyncSuccess();
      return { type: 'Ok', value };
    } catch (error) {
      return { type: 'Err', error };
    }
  });

  bench('✅ result-ts: handleAsync with failure', async () => {
    const result = await handleAsync(mockAsyncFailure);
    return result;
  });

  bench('⚡ raw: try-catch async with failure', async () => {
    try {
      const value = await mockAsyncFailure();
      return { type: 'Ok', value };
    } catch (error) {
      return { type: 'Err', error };
    }
  });

  bench('✅ result-ts: mixed async operations', async () => {
    const results = await Promise.all([
      handleAsync(() => mockAsyncMixed(false)),
      handleAsync(() => mockAsyncMixed(true)),
      handleAsync(() => mockAsyncMixed(false)),
      handleAsync(() => mockAsyncMixed(true)),
    ]);
    const analysis = batch.analyze(results);
    return analysis;
  });
});
