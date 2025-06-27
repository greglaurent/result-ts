// Internal core module - not exposed to users
// Contains the minimal essentials that every layer includes
// All layer files re-export from this for consistency

// Import types and constants from the shared foundation
import { OK, ERR, type Result, type Ok, type Err } from "./types";

// =============================================================================
// CORE ESSENTIALS (Individual Exports)
// =============================================================================

/**
 * Creates a successful Result containing the given value.
 *
 * @example
 * ```typescript
 * const result = ok("hello");
 * console.log(result); // { type: "Ok", value: "hello" }
 * ```
 *
 * @param value - The success value to wrap
 * @returns A successful Result containing the value
 */
export const ok = <T>(value: T): Ok<T> => ({
  type: OK,
  value,
});

/**
 * Creates an error Result containing the given error.
 *
 * @example
 * ```typescript
 * const result = err("Something went wrong");
 * console.log(result); // { type: "Err", error: "Something went wrong" }
 * ```
 *
 * @param error - The error value to wrap
 * @returns An error Result containing the error
 */
export const err = <E>(error: E): Err<E> => ({
  type: ERR,
  error,
});

/**
 * Type guard that checks if a Result is successful.
 *
 * @example
 * ```typescript
 * const result = ok(42);
 * if (isOk(result)) {
 *   console.log(result.value); // TypeScript knows this is number: 42
 * }
 * ```
 *
 * @param result - The Result to check
 * @returns True if the Result is Ok, false otherwise
 */
export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> =>
  result.type === OK;

/**
 * Type guard that checks if a Result is an error.
 *
 * @example
 * ```typescript
 * const result = err("failed");
 * if (isErr(result)) {
 *   console.log(result.error); // TypeScript knows this is the error: "failed"
 * }
 * ```
 *
 * @param result - The Result to check
 * @returns True if the Result is Err, false otherwise
 */
export const isErr = <T, E>(result: Result<T, E>): result is Err<E> =>
  result.type === ERR;

/**
 * Extracts the value from a successful Result or throws an error.
 * Preserves the original error type when possible.
 *
 * @example
 * ```typescript
 * const success = ok(42);
 * console.log(unwrap(success)); // 42
 *
 * const failure = err(new Error("failed"));
 * unwrap(failure); // Throws the original Error
 * ```
 *
 * @param result - The Result to unwrap
 * @returns The success value
 * @throws The original error if Result is Err
 */
export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (result.type === OK) return result.value;

  const error = result.error;

  if (error instanceof Error) {
    throw error;
  }

  if (typeof error === "string") {
    throw new Error(error);
  }

  throw new Error(`Unwrap failed: ${String(error)}`);
};

/**
 * Extracts the value from a Result or returns a default value.
 *
 * @example
 * ```typescript
 * const success = ok(42);
 * console.log(unwrapOr(success, 0)); // 42
 *
 * const failure = err("failed");
 * console.log(unwrapOr(failure, 0)); // 0
 * ```
 *
 * @param result - The Result to unwrap
 * @param defaultValue - The value to return if Result is Err
 * @returns The success value or the default value
 */
export const unwrapOr = <T, E>(result: Result<T, E>, defaultValue: T): T => {
  return result.type === OK ? result.value : defaultValue;
};

/**
 * Safely executes a function, catching any thrown errors and converting them to a Result.
 *
 * @example
 * ```typescript
 * const jsonString = '{"name": "John"}';
 * const result = handle(() => JSON.parse(jsonString));
 * // Returns: Ok(parsed object)
 *
 * const failed = handle(() => JSON.parse('invalid json'));
 * // Returns: Err("Unexpected token i in JSON at position 0")
 * ```
 *
 * @param fn - The function to execute safely
 * @returns A Result with the function result or error message
 */
export const handle = <T>(fn: () => T): Result<T, string> => {
  try {
    return { type: OK, value: fn() };
  } catch (error) {
    return {
      type: ERR,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Safely executes an async function, catching any thrown errors and converting them to a Result.
 *
 * @example
 * ```typescript
 * const result = await handleAsync(async () => {
 *   const response = await fetch('/api/users');
 *   return response.json();
 * });
 * // Returns: Ok(users) or Err("Network error")
 * ```
 *
 * @param fn - The async function to execute safely
 * @returns A Promise of Result with the function result or error message
 */
export const handleAsync = async <T>(fn: () => Promise<T>): Promise<Result<T, string>> => {
  try {
    const value = await fn();
    return { type: OK, value };
  } catch (error) {
    return {
      type: ERR,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Safely executes a function with custom error mapping.
 *
 * @example
 * ```typescript
 * const result = handleWith(
 *   () => riskyOperation(),
 *   (error) => ({ code: 500, message: String(error) })
 * );
 * // Returns: Ok(value) or Err with custom error object
 * ```
 *
 * @param fn - The function to execute safely
 * @param errorMapper - Function to transform caught errors
 * @returns A Result with the function result or mapped error
 */
export const handleWith = <T, E>(
  fn: () => T,
  errorMapper: (error: unknown) => E,
): Result<T, E> => {
  try {
    return { type: OK, value: fn() };
  } catch (error) {
    return { type: ERR, error: errorMapper(error) };
  }
};

/**
 * Safely executes an async function with custom error mapping.
 *
 * @example
 * ```typescript
 * const result = await handleWithAsync(
 *   async () => await apiCall(),
 *   (error) => new ApiError(error)
 * );
 * ```
 *
 * @param fn - The async function to execute safely
 * @param errorMapper - Function to transform caught errors
 * @returns A Promise of Result with the function result or mapped error
 */
export const handleWithAsync = async <T, E>(
  fn: () => Promise<T>,
  errorMapper: (error: unknown) => E,
): Promise<Result<T, E>> => {
  try {
    const value = await fn();
    return { type: OK, value };
  } catch (error) {
    return { type: ERR, error: errorMapper(error) };
  }
};

/**
 * Pattern matching for Results. Executes the appropriate handler based on Result type.
 *
 * @example
 * ```typescript
 * const message = match(result, {
 *   Ok: (value) => `Success: ${value}`,
 *   Err: (error) => `Failed: ${error}`
 * });
 *
 * const processed = match(apiResult, {
 *   Ok: (data) => data.users.length,
 *   Err: () => 0
 * });
 * ```
 *
 * @param result - The Result to match against
 * @param handlers - Object with Ok and Err handler functions
 * @returns The result of the appropriate handler
 */
export const match = <T, U, V, E>(
  result: Result<T, E>,
  handlers: {
    Ok: (value: T) => U;
    Err: (error: E) => V;
  },
): U | V => {
  return result.type === OK
    ? handlers.Ok(result.value)
    : handlers.Err(result.error);
};

// Re-export types for layer files that import from core
export type { Result, Ok, Err } from "./types";

/**
 * This module defines the core essentials (11 functions) included in every layer.
 * 
 * Layer files re-export from this module plus their specific functions:
 * - index.ts → just core (this file)
 * - iter.ts → core + iteration functions
 * - batch.ts → core + batch functions
 * - utils.ts → core + utility functions
 * - patterns.ts → core + advanced patterns
 * - schema.ts → core + validation functions
 * 
 * Benefits:
 * - Single source of truth for core functions
 * - Easy maintenance - update core in one place
 * - Still tree-shakable via individual function imports
 */
