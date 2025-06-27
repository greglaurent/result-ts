// result-ts/patterns - Core essentials + advanced functional patterns
// Provides generator-based error handling and applicative patterns

// Re-export all core essentials from core module
export * from "./core";

// Import types and constants for patterns implementations
import { OK, ERR, type Result } from "./types";

// =============================================================================
// ADVANCED PATTERNS (Individual Exports)
// =============================================================================

/**
 * Safely executes a generator function that yields Result values.
 * Provides early exit on first error and automatic cleanup on failure.
 * Similar to Rust's `?` operator for chaining fallible operations.
 *
 * @example
 * ```typescript
 * const result = safe(function* () {
 *   const user = yield getUser(id);        // If this fails, stops here
 *   const profile = yield getProfile(user.id); // Only runs if user succeeds
 *   const posts = yield getPosts(profile.id);  // Only runs if profile succeeds
 *   return { user, profile, posts };            // Only runs if all succeed
 * });
 * ```
 *
 * @param generator - Generator function that yields Results and returns final value
 * @returns Result containing either the final value or the first error
 */
export const safe = <T, E>(
  generator: () => Generator<Result<unknown, E>, T, unknown>,
): Result<T, E> => {
  const gen = generator();
  try {
    let current = gen.next();
    while (!current.done) {
      const result = current.value as Result<unknown, E>;
      if (result.type === ERR) {
        try {
          gen.return(undefined as T);
        } catch {
          // Just ignore cleanup errors
        }
        return { type: ERR, error: result.error };
      }
      current = gen.next(result.value);
    }
    return { type: OK, value: current.value };
  } catch (error) {
    try {
      gen.return(undefined as T);
    } catch {
      // intentionally ignore errors
    }
    throw error;
  }
};

/**
 * Async version of safe() for generator functions that yield Promise<r>.
 *
 * @example
 * ```typescript
 * const result = await safeAsync(async function* () {
 *   const user = yield await fetchUser(id);
 *   const profile = yield await fetchProfile(user.id);
 *   return { user, profile };
 * });
 * ```
 *
 * @param generator - Async generator function that yields Results
 * @returns Promise of Result containing final value or first error
 */
export const safeAsync = async <T, E>(
  generator: () => AsyncGenerator<Result<unknown, E>, T, unknown>,
): Promise<Result<T, E>> => {
  const gen = generator();
  try {
    let current = await gen.next();
    while (!current.done) {
      const result = current.value as Result<unknown, E>;
      if (result.type === ERR) {
        try {
          await gen.return(undefined as T);
        } catch {
          // Just ignore cleanup errors
        }
        return { type: ERR, error: result.error };
      }
      current = await gen.next(result.value);
    }
    return { type: OK, value: current.value };
  } catch (error) {
    try {
      await gen.return(undefined as T);
    } catch {
      // Just ignore cleanup errors
    }
    throw error;
  }
};

/**
 * Helper function for yielding Results in safe() generators.
 * Makes generator syntax cleaner by avoiding explicit yield syntax.
 *
 * @example
 * ```typescript
 * const result = safe(function* () {
 *   const user = yield* yieldFn(getUser(id));
 *   return user;
 * });
 * ```
 *
 * @param result - Result to yield in generator context
 * @returns The same Result (for generator yielding)
 */
export const yieldFn = <T, E>(result: Result<T, E>) => result;

/**
 * Combines two Results into a tuple Result. Fails if either input fails.
 * Useful for operations that need both values to proceed.
 *
 * @example
 * ```typescript
 * const nameResult = getUserName(id);
 * const emailResult = getUserEmail(id);
 * const combined = zip(nameResult, emailResult);
 * // Returns: Ok([name, email]) or first Err encountered
 *
 * const user = match(combined, {
 *   Ok: ([name, email]) => ({ name, email }),
 *   Err: (error) => null
 * });
 * ```
 *
 * @param resultA - First Result to combine
 * @param resultB - Second Result to combine
 * @returns Result containing tuple of both values or first error
 */
export const zip = <T, U, E>(
  resultA: Result<T, E>,
  resultB: Result<U, E>,
): Result<[T, U], E> => {
  if (resultA.type === OK && resultB.type === OK) {
    return { type: OK, value: [resultA.value, resultB.value] };
  }

  if (resultA.type === ERR) {
    return { type: ERR, error: resultA.error };
  }

  if (resultB.type === ERR) {
    return { type: ERR, error: resultB.error };
  }

  throw new Error("Unreachable: both results cannot be Ok here");
};

/**
 * Applies a function wrapped in a Result to a value wrapped in a Result.
 * This is the applicative functor pattern for Results.
 *
 * @example
 * ```typescript
 * const addFn = ok((x: number) => (y: number) => x + y);
 * const value = ok(5);
 * const result = apply(addFn, value);
 * // Returns: Ok(function that adds 5)
 *
 * // More practical example:
 * const parseNumber = (s: string) => isNaN(+s) ? err("Not a number") : ok(+s);
 * const add = ok((x: number) => (y: number) => x + y);
 * const result = apply(
 *   apply(add, parseNumber("5")),
 *   parseNumber("3")
 * );
 * // Returns: Ok(8)
 * ```
 *
 * @param resultFn - Result containing a function
 * @param resultValue - Result containing a value to apply the function to
 * @returns Result containing the function application result or first error
 */
export const apply = <T, U, E>(
  resultFn: Result<(value: T) => U, E>,
  resultValue: Result<T, E>,
): Result<U, E> => {
  if (resultFn.type === OK && resultValue.type === OK) {
    return { type: OK, value: resultFn.value(resultValue.value) };
  }

  if (resultFn.type === ERR) {
    return { type: ERR, error: resultFn.error };
  }

  // resultValue must be ERR due to discriminated union
  return resultValue as never;
};

/**
 * This entry point includes core essentials + advanced functional patterns.
 *
 * Use for: generator-based error handling, applicative patterns, advanced composition
 *
 * Key functions: safe(), safeAsync(), zip(), apply(), yieldFn()
 *
 * Advanced features:
 * - safe() → Rust-style ? operator with generators
 * - zip() → combine multiple Results into tuples
 * - apply() → applicative functor patterns
 *
 * Other available layers:
 * - `result-ts` → core essentials only
 * - `result-ts/iter` → core + data transformation
 * - `result-ts/batch` → core + array processing
 * - `result-ts/utils` → core + debugging utilities
 * - `result-ts/schema` → core + validation with Zod
 */
