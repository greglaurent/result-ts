// result-ts/patterns - Core essentials + advanced functional patterns
// Provides generator-based error handling and applicative patterns

// Re-export all core essentials from core module
export * from "@/core";

// Import types and constants for patterns implementations
import { OK, ERR, type Result } from "@/types";

// =============================================================================
// RUNTIME VALIDATION HELPERS
// =============================================================================

/**
 * Validates that a parameter is a proper Result object.
 * Provides helpful error messages for common mistakes.
 */
const validateResult = <T, E>(
  result: Result<T, E>,
  functionName: string,
  parameterName: string = "result",
): void => {
  if (!result || typeof result !== "object") {
    throw new TypeError(
      `${functionName}: ${parameterName} must be a Result object, got ${typeof result}`,
    );
  }
  const resultObj = result as any;
  if (!("type" in resultObj)) {
    throw new TypeError(
      `${functionName}: ${parameterName} must have a 'type' property (Ok or Err)`,
    );
  }
  if (resultObj.type !== OK && resultObj.type !== ERR) {
    throw new TypeError(
      `${functionName}: Invalid ${parameterName} type '${resultObj.type}', expected '${OK}' or '${ERR}'`,
    );
  }
  if (resultObj.type === OK && !("value" in resultObj)) {
    throw new TypeError(
      `${functionName}: Ok ${parameterName} must have a 'value' property`,
    );
  }
  if (resultObj.type === ERR && !("error" in resultObj)) {
    throw new TypeError(
      `${functionName}: Err ${parameterName} must have an 'error' property`,
    );
  }
};

/**
 * Validates that a generator function parameter is actually a function.
 */
const validateGeneratorFunction = (
  generatorFn: unknown,
  functionName: string,
): void => {
  if (typeof generatorFn !== "function") {
    throw new TypeError(
      `${functionName}: First argument must be a generator function, got ${typeof generatorFn}`,
    );
  }
};

/**
 * Validates that a mapper function parameter is actually a function.
 */
const validateMapper = (
  mapper: unknown,
  functionName: string,
  parameterName: string = "mapper",
): void => {
  if (typeof mapper !== "function") {
    throw new TypeError(
      `${functionName}: ${parameterName} must be a function, got ${typeof mapper}`,
    );
  }
};

// =============================================================================
// ERGONOMIC HELPERS (Individual Exports)
// =============================================================================

/**
 * Creates a successful Result with proper type casting for generator functions.
 * Eliminates the need for manual `as Result<T, E>` casting in generator contexts.
 *
 * @example
 * ```typescript
 * // Helper for generators - no casting needed
 * const getUser = (id: number) => resultOk({ id, name: "John" });
 * const getProfile = (user: any) => resultOk({ userId: user.id, bio: "Developer" });
 *
 * const result = safe(function* () {
 *   const user = yield getUser(1);        // TypeScript infers correctly
 *   const profile = yield getProfile(user); // No manual casting needed
 *   return { user, profile };
 * });
 * ```
 *
 * @param value - The success value to wrap
 * @returns A properly typed Result for generator contexts
 */
export const resultOk = <T>(value: T): Result<T, never> => ({
  type: OK,
  value,
});

/**
 * Creates an error Result with proper type casting for generator functions.
 * Eliminates the need for manual `as Result<T, E>` casting in generator contexts.
 *
 * @example
 * ```typescript
 * const validateUser = (user: any) =>
 *   user.email ? resultOk(user) : resultErr("Email required");
 *
 * const result = safe(function* () {
 *   const user = yield validateUser(userData); // TypeScript infers correctly
 *   return user;
 * });
 * ```
 *
 * @param error - The error value to wrap
 * @returns A properly typed error Result for generator contexts
 */
export const resultErr = <E>(error: E): Result<never, E> => ({
  type: ERR,
  error,
});

/**
 * Fluent chain API for composing Result operations without generators.
 * Provides Promise-like method chaining for TypeScript developers who prefer
 * familiar fluent interfaces over generator syntax.
 *
 * @example
 * ```typescript
 * // Promise-like fluent chaining
 * const result = chain(getUser(1))
 *   .then(user => getProfile(user))
 *   .then(profile => enrichProfile(profile))
 *   .then(enriched => resultOk({ user: enriched.user, profile: enriched }))
 *   .run();
 *
 * // Equivalent to generators but more familiar to TS devs
 * ```
 *
 * @param initial - The initial Result to start the chain
 * @returns A chainable interface for Result operations
 * @throws TypeError if initial is not a valid Result object
 */
export const chain = <T, E>(initial: Result<T, E>): Chain<T, E> => {
  validateResult(initial, "chain()", "initial");

  return {
    then: <U>(fn: (value: T) => Result<U, E>): Chain<U, E> => {
      validateMapper(fn, "chain().then()", "fn");
      if (initial.type === ERR) {
        return chain({ type: ERR, error: initial.error });
      }
      return chain(fn(initial.value));
    },
    run: (): Result<T, E> => initial,
  };
};

interface Chain<T, E> {
  then<U>(fn: (value: T) => Result<U, E>): Chain<U, E>;
  run(): Result<T, E>;
}

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
 * @throws TypeError if generator is not a function
 */
export const safe = <T, E>(
  generator: () => Generator<Result<any, E>, T, any>,
): Result<T, E> => {
  validateGeneratorFunction(generator, "safe()");

  const gen = generator();
  try {
    let current = gen.next();
    while (!current.done) {
      const result = current.value as Result<any, E>;
      // Validate each yielded Result
      validateResult(result, "safe()", "yielded result");
      if (result.type === ERR) {
        try {
          gen.return(undefined as any);
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
      gen.return(undefined as any);
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
 * @throws TypeError if generator is not a function
 */
export const safeAsync = async <T, E>(
  generator: () => AsyncGenerator<Result<any, E>, T, any>,
): Promise<Result<T, E>> => {
  validateGeneratorFunction(generator, "safeAsync()");

  const gen = generator();
  try {
    let current = await gen.next();
    while (!current.done) {
      const result = current.value as Result<any, E>;
      // Validate each yielded Result
      validateResult(result, "safeAsync()", "yielded result");
      if (result.type === ERR) {
        try {
          await gen.return(undefined as any);
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
      await gen.return(undefined as any);
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
 *   const user = yield yieldFn(getUser(id));
 *   return user;
 * });
 * ```
 *
 * @param result - Result to yield in generator context
 * @returns The same Result (for generator yielding)
 * @throws TypeError if result is not a valid Result object
 */
export const yieldFn = <T, E>(result: Result<T, E>) => {
  validateResult(result, "yieldFn()");
  return result;
};

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
 * @throws TypeError if either result is not a valid Result object
 */
export const zip = <T, U, E>(
  resultA: Result<T, E>,
  resultB: Result<U, E>,
): Result<[T, U], E> => {
  validateResult(resultA, "zip()", "resultA");
  validateResult(resultB, "zip()", "resultB");

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
 * @throws TypeError if either result is not a valid Result object
 */
export const apply = <T, U, E>(
  resultFn: Result<(value: T) => U, E>,
  resultValue: Result<T, E>,
): Result<U, E> => {
  validateResult(resultFn, "apply()", "resultFn");
  validateResult(resultValue, "apply()", "resultValue");

  if (resultFn.type === ERR) {
    return { type: ERR, error: resultFn.error };
  }
  if (resultValue.type === ERR) {
    return { type: ERR, error: resultValue.error };
  }
  // Both are OK - additional validation that resultFn.value is actually a function
  if (typeof resultFn.value !== "function") {
    throw new TypeError(
      "apply(): resultFn must contain a function value, got " +
        typeof resultFn.value,
    );
  }
  return { type: OK, value: resultFn.value(resultValue.value) };
};

/**
 * This entry point includes core essentials + advanced functional patterns.
 *
 * Use for: generator-based error handling, applicative patterns, advanced composition
 *
 * Key functions: safe(), safeAsync(), zip(), apply(), yieldFn()
 * Ergonomic helpers: resultOk(), resultErr(), chain()
 *
 * Advanced features:
 * - safe() → Rust-style ? operator with generators
 * - zip() → combine multiple Results into tuples
 * - apply() → applicative functor patterns
 * - chain() → Promise-like fluent API
 * - resultOk/resultErr → generator typing helpers
 *
 * Other available layers:
 * - `result-ts` → core essentials only
 * - `result-ts/iter` → core + data transformation
 * - `result-ts/batch` → core + array processing
 * - `result-ts/utils` → core + debugging utilities
 * - `result-ts/schema` → core + validation with Zod
 */
