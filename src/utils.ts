// result-ts/utils - Core essentials + utility functions
// Provides debugging, side effects, and conversion utilities

// Re-export all core essentials from core module
export * from "./core";

// Import types and constants for utils implementations
import { OK, ERR, type Result } from "./types";

// =============================================================================
// UTILITY FUNCTIONS (Individual Exports)
// =============================================================================

/**
 * Inspects a Result by calling callbacks without changing the Result.
 * Useful for debugging or side effects without changing the Result.
 *
 * @example
 * ```typescript
 * const result = inspect(
 *   processData(),
 *   (value) => console.log("Success:", value),
 *   (error) => console.error("Failed:", error)
 * );
 * // Logs success or error, then returns original result unchanged
 * ```
 *
 * @param result - The Result to inspect
 * @param onOk - Optional callback for success values
 * @param onErr - Optional callback for error values
 * @returns The original Result unchanged
 */
export const inspect = <T, E>(
  result: Result<T, E>,
  onOk?: (value: T) => void,
  onErr?: (error: E) => void,
): Result<T, E> => {
  if (result.type === OK && onOk) {
    onOk(result.value);
  } else if (result.type === ERR && onErr) {
    onErr(result.error);
  }
  return result;
};

/**
 * Performs a side effect on success values without changing the Result.
 * Useful for logging, caching, or other side effects in a chain.
 *
 * @example
 * ```typescript
 * const result = pipe(
 *   fetchUser(id),
 *   user => tap(user, u => console.log("Loaded:", u.name)),
 *   user => processUser(user)
 * );
 * ```
 *
 * @param result - The Result to tap
 * @param fn - Function to call with success value
 * @returns The original Result unchanged
 */
export const tap = <T, E>(
  result: Result<T, E>,
  fn: (value: T) => void,
): Result<T, E> => {
  if (result.type === OK) {
    fn(result.value);
  }
  return result;
};

/**
 * Performs a side effect on error values without changing the Result.
 *
 * @example
 * ```typescript
 * const result = tapErr(
 *   apiCall(),
 *   error => console.error("API failed:", error)
 * );
 * ```
 *
 * @param result - The Result to tap
 * @param fn - Function to call with error value
 * @returns The original Result unchanged
 */
export const tapErr = <T, E>(
  result: Result<T, E>,
  fn: (error: E) => void,
): Result<T, E> => {
  if (result.type === ERR) {
    fn(result.error);
  }
  return result;
};

/**
 * Converts a nullable value to a Result.
 *
 * @example
 * ```typescript
 * const user = users.find(u => u.id === 1);
 * const result = fromNullable(user, "User not found");
 * // Returns: Ok(user) or Err("User not found")
 *
 * // With custom error:
 * const result2 = fromNullable(user, { code: 404, message: "Not found" });
 * ```
 *
 * @param value - The nullable value to convert
 * @param errorValue - Error to use if value is null/undefined
 * @returns Result with the value or the error
 */
export const fromNullable = <T>(
  value: T | null | undefined,
  errorValue: unknown = "Value is null or undefined",
): Result<T, unknown> => {
  return value != null ? { type: OK, value } : { type: ERR, error: errorValue };
};

/**
 * Converts a Result to a nullable value.
 *
 * @example
 * ```typescript
 * const result = getUser(1);
 * const user = toNullable(result);
 * // Returns: User object or null
 *
 * if (user) {
 *   console.log(user.name); // Safe to access
 * }
 * ```
 *
 * @param result - The Result to convert
 * @returns The success value or null
 */
export const toNullable = <T, E>(result: Result<T, E>): T | null => {
  return result.type === OK ? result.value : null;
};

/**
 * This entry point includes core essentials + utility functions.
 *
 * Use for: debugging, logging, side effects, nullable conversions
 *
 * Key functions: inspect(), tap(), tapErr(), fromNullable(), toNullable()
 *
 * Other available layers:
 * - `result-ts` → core essentials only
 * - `result-ts/iter` → core + data transformation
 * - `result-ts/batch` → core + array processing
 * - `result-ts/patterns` → core + advanced patterns
 * - `result-ts/schema` → core + validation with Zod
 */
