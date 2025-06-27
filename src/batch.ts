// result-ts/batch - Core essentials + batch operations
// Provides array processing and bulk Result operations

// Re-export all core essentials from core module
export * from "./core";

// Import types and constants for batch implementations
import { OK, ERR, type Result } from "./types";

// =============================================================================
// BATCH OPERATIONS (Individual Exports)
// =============================================================================

/**
 * Converts an array of Results into a Result of array.
 * Fails fast on the first error encountered.
 *
 * @example
 * ```typescript
 * const results = [ok(1), ok(2), ok(3)];
 * const combined = all(results);
 * // Returns: Ok([1, 2, 3])
 *
 * const mixed = [ok(1), err("failed"), ok(3)];
 * const failed = all(mixed);
 * // Returns: Err("failed")
 * ```
 *
 * @param results - Array of Results to combine
 * @returns Result containing array of all success values or first error
 */
export const all = <T, E>(results: Array<Result<T, E>>): Result<T[], E> => {
  const values = [];
  for (const result of results) {
    if (result.type === ERR) {
      return result;
    }
    values.push(result.value);
  }
  return { type: OK, value: values };
};

/**
 * Waits for all Promise<r> to settle, then combines like all().
 *
 * @example
 * ```typescript
 * const promises = [fetchUser(1), fetchUser(2), fetchUser(3)];
 * const result = await allAsync(promises);
 * // Returns: Ok([user1, user2, user3]) or first Err
 * ```
 *
 * @param promises - Array of Promise<r> to await and combine
 * @returns Promise of Result containing all success values or first error
 */
export const allAsync = async <T, E>(
  promises: Array<Promise<Result<T, E>>>,
): Promise<Result<T[], E>> => {
  const results = await Promise.all(promises);
  const values = [];

  for (const result of results) {
    if (result.type === ERR) {
      return result;
    }
    values.push(result.value);
  }

  return { type: OK, value: values };
};

/**
 * Waits for all Promise<r> to settle and partitions successes from errors.
 * Unlike allAsync, this never fails and returns both successes and errors.
 *
 * @example
 * ```typescript
 * const promises = [fetchUser(1), fetchUser(2), fetchUser(3)];
 * const { oks, errors } = await allSettledAsync(promises);
 * console.log(`Loaded ${oks.length} users, ${errors.length} failed`);
 * ```
 *
 * @param promises - Array of Promise<r> to await and partition
 * @returns Promise of object with separated oks and errors arrays
 */
export const allSettledAsync = async <T, E>(
  promises: Array<Promise<Result<T, E>>>,
): Promise<{ oks: T[]; errors: E[] }> => {
  const results = await Promise.all(promises);
  const oks = [];
  const errors = [];

  for (const result of results) {
    if (result.type === OK) {
      oks.push(result.value);
    } else {
      errors.push(result.error);
    }
  }

  return { oks, errors };
};

/**
 * Extracts all success values from an array of Results.
 * Performance: ~2-3x faster than filter().map() chains.
 *
 * @example
 * ```typescript
 * const results = [ok(1), err("failed"), ok(3), err("error")];
 * const successes = oks(results);
 * // Returns: [1, 3]
 * ```
 *
 * @param results - Array of Results to extract successes from
 * @returns Array of success values (empty if none)
 */
export const oks = <T, E>(results: Array<Result<T, E>>) => {
  const values = [];
  for (const result of results) {
    if (result && result.type === OK) {
      values.push(result.value);
    }
  }
  return values;
};

/**
 * Extracts all error values from an array of Results.
 * Performance: ~2-3x faster than filter().map() chains.
 *
 * @example
 * ```typescript
 * const results = [ok(1), err("failed"), ok(3), err("error")];
 * const errors = errs(results);
 * // Returns: ["failed", "error"]
 * ```
 *
 * @param results - Array of Results to extract errors from
 * @returns Array of error values (empty if none)
 */
export const errs = <T, E>(results: Array<Result<T, E>>) => {
  const errors = [];
  for (const result of results) {
    if (result && result.type === ERR) {
      errors.push(result.error);
    }
  }
  return errors;
};

/**
 * Separates an array of Results into successes and errors.
 *
 * @example
 * ```typescript
 * const results = [ok(1), err("failed"), ok(3)];
 * const { oks, errors } = partition(results);
 * // oks: [1, 3], errors: ["failed"]
 * ```
 *
 * @param results - Array of Results to partition
 * @returns Object with oks and errors arrays
 */
export const partition = <T, E>(
  results: Array<Result<T, E>>,
): { oks: T[]; errors: E[] } => {
  const oks = [];
  const errors = [];

  for (const result of results) {
    if (result.type === OK) {
      oks.push(result.value);
    } else {
      errors.push(result.error);
    }
  }

  return { oks, errors };
};

/**
 * Enhanced partition that includes metadata in a single pass.
 * Performance: Much faster than calling partition() + length calculations separately.
 *
 * @example
 * ```typescript
 * const results = [ok(1), err("failed"), ok(3)];
 * const stats = partitionWith(results);
 * // stats.oks: [1, 3], stats.errors: ["failed"]
 * // stats.okCount: 2, stats.errorCount: 1, stats.total: 3
 * ```
 *
 * @param results - Array of Results to partition with stats
 * @returns Object with oks, errors, and count metadata
 */
export const partitionWith = <T, E>(
  results: Array<Result<T, E>>,
): {
  oks: T[];
  errors: E[];
  okCount: number;
  errorCount: number;
  total: number;
} => {
  const oks = [];
  const errors = [];

  for (const result of results) {
    if (result && result.type === OK) {
      oks.push(result.value);
    } else if (result && result.type === ERR) {
      errors.push(result.error);
    }
  }

  return {
    oks,
    errors,
    okCount: oks.length,
    errorCount: errors.length,
    total: results.length,
  };
};

/**
 * Analyzes an array of Results without extracting values for maximum performance.
 * Single-pass analysis that's much faster than multiple operations.
 *
 * @example
 * ```typescript
 * const results = [ok(1), err("failed"), ok(3)];
 * const stats = analyze(results);
 * // stats.okCount: 2, stats.errorCount: 1, stats.total: 3
 * // stats.hasErrors: true, stats.isEmpty: false
 *
 * console.log(`Success rate: ${stats.okCount}/${stats.total}`);
 * if (stats.hasErrors) console.log("Some operations failed");
 * ```
 *
 * @param results - Array of Results to analyze
 * @returns Statistics object with counts and boolean flags
 */
export const analyze = <T, E>(
  results: Array<Result<T, E>>,
): {
  okCount: number;
  errorCount: number;
  total: number;
  hasErrors: boolean;
  isEmpty: boolean;
} => {
  let okCount = 0;
  let errorCount = 0;

  for (const result of results) {
    if (result && result.type === OK) {
      okCount++;
    } else if (result && result.type === ERR) {
      errorCount++;
    }
  }

  return {
    okCount,
    errorCount,
    total: results.length,
    hasErrors: errorCount > 0,
    isEmpty: results.length === 0,
  };
};

/**
 * Finds the first success and first error with early-exit optimization.
 * Much more efficient than filtering when you only need the first of each type.
 *
 * @example
 * ```typescript
 * const results = [err("e1"), ok("success"), err("e2"), ok("ok2")];
 * const { firstOk, firstError, okIndex, errorIndex } = findFirst(results);
 * // firstOk: "success", firstError: "e1", okIndex: 1, errorIndex: 0
 * ```
 *
 * @param results - Array of Results to search
 * @returns Object with first values and their indices (-1 if not found)
 */
export const findFirst = <T, E>(
  results: Array<Result<T, E>>,
): {
  firstOk: T | undefined;
  firstError: E | undefined;
  okIndex: number;
  errorIndex: number;
} => {
  let firstOk: T | undefined;
  let firstError: E | undefined;
  let okIndex = -1;
  let errorIndex = -1;

  for (let i = 0; i < results.length; i++) {
    const result = results[i];

    if (result && result.type === OK && firstOk === undefined) {
      firstOk = result.value;
      okIndex = i;
    } else if (result && result.type === ERR && firstError === undefined) {
      firstError = result.error;
      errorIndex = i;
    }

    if (firstOk !== undefined && firstError !== undefined) {
      break;
    }
  }

  return { firstOk, firstError, okIndex, errorIndex };
};

/**
 * Reduces an array of Results to a single value with custom handling for successes and errors.
 *
 * @example
 * ```typescript
 * const results = [ok(5), err("failed"), ok(10)];
 * const sum = reduce(results, {
 *   onOk: (acc, value) => acc + value,
 *   onErr: (acc, error) => acc // ignore errors
 * }, 0);
 * // Returns: 15
 * ```
 *
 * @param results - Array of Results to reduce
 * @param reducer - Object with onOk and onErr handler functions
 * @param initialValue - Starting accumulator value
 * @returns Final accumulated value
 */
export const reduce = <T, E, Acc>(
  results: Array<Result<T, E>>,
  reducer: {
    onOk: (acc: Acc, value: T, index: number) => Acc;
    onErr: (acc: Acc, error: E, index: number) => Acc;
  },
  initialValue: Acc,
): Acc => {
  let acc = initialValue;

  for (let i = 0; i < results.length; i++) {
    const result = results[i];

    if (result && result.type === OK) {
      acc = reducer.onOk(acc, result.value, i);
    } else if (result && result.type === ERR) {
      acc = reducer.onErr(acc, result.error, i);
    }
  }

  return acc;
};

/**
 * Returns the first successful Result or a Result containing all errors.
 *
 * @example
 * ```typescript
 * const results = [err("e1"), err("e2"), ok("success")];
 * const first = first(results);
 * // Returns: Ok("success")
 *
 * const allFailed = [err("e1"), err("e2")];
 * const none = first(allFailed);
 * // Returns: Err(["e1", "e2"])
 * ```
 *
 * @param results - Array of Results to search
 * @returns First Ok Result or Err containing all error values
 */
export const first = <T, E>(results: Array<Result<T, E>>): Result<T, E[]> => {
  const errors = [];

  for (const result of results) {
    if (result.type === OK) {
      return result;
    }
    errors.push(result.error);
  }

  return { type: ERR, error: errors };
};

/**
 * This entry point includes core essentials + batch operations.
 *
 * Use for: processing arrays of Results, bulk operations, statistics
 *
 * Key functions: all(), partition(), analyze(), oks(), allAsync()
 *
 * Other available layers:
 * - `result-ts` → core essentials only
 * - `result-ts/iter` → core + data transformation
 * - `result-ts/utils` → core + debugging utilities
 * - `result-ts/patterns` → core + advanced patterns
 * - `result-ts/schema` → core + validation with Zod
 */
