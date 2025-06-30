// result-ts/iter - Core essentials + iteration operations
// Provides data transformation and chaining capabilities

// Re-export all core essentials from core module
export * from "@/core";

// Import types and constants for iteration implementations
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
): void => {
  if (!result || typeof result !== "object") {
    throw new TypeError(
      `${functionName}: First argument must be a Result object, got ${typeof result}`,
    );
  }
  const resultObj = result as any;
  if (!("type" in resultObj)) {
    throw new TypeError(
      `${functionName}: Result must have a 'type' property (Ok or Err)`,
    );
  }
  if (resultObj.type !== OK && resultObj.type !== ERR) {
    throw new TypeError(
      `${functionName}: Invalid Result type '${resultObj.type}', expected '${OK}' or '${ERR}'`,
    );
  }
  if (resultObj.type === OK && !("value" in resultObj)) {
    throw new TypeError(
      `${functionName}: Ok Result must have a 'value' property`,
    );
  }
  if (resultObj.type === ERR && !("error" in resultObj)) {
    throw new TypeError(
      `${functionName}: Err Result must have an 'error' property`,
    );
  }
};

/**
 * Validates that a mapper parameter is a function.
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

/**
 * Validates that a promise parameter is actually a Promise.
 */
const validatePromise = (promise: unknown, functionName: string): void => {
  if (!promise || typeof promise !== "object" || !("then" in promise)) {
    throw new TypeError(
      `${functionName}: First argument must be a Promise<Result>, got ${typeof promise}`,
    );
  }
  if (typeof (promise as any).then !== "function") {
    throw new TypeError(
      `${functionName}: First argument must be a Promise (missing 'then' method)`,
    );
  }
};

// =============================================================================
// ITERATION OPERATIONS (Individual Exports)
// =============================================================================

/**
 * Transforms the success value of a Result using the provided function.
 *
 * @example
 * ```typescript
 * const result = ok(5);
 * const doubled = map(result, x => x * 2);
 * // Returns: Result<number, never> → Ok(10)
 *
 * const error = err("failed");
 * const mapped = map(error, x => x * 2);
 * // Returns: Result<never, string> → Err("failed") - unchanged
 * ```
 *
 * @param result - The Result to transform
 * @param mapper - Function to transform the success value
 * @returns A new Result with the transformed value or original error
 * @throws TypeError if result is not a valid Result object or mapper is not a function
 * @see {@link mapAsync} for async transformations
 * @see {@link mapErr} for error transformations
 * @see {@link andThen} for chaining operations that return Results
 */
export const map = <T, U, E>(
  result: Result<T, E>,
  mapper: (value: T) => U,
): Result<U, E> => {
  validateResult(result, "map()");
  validateMapper(mapper, "map()");
  return result.type === OK
    ? { type: OK, value: mapper(result.value) }
    : result;
};

/**
 * Transforms the success value of a Promise<Result> using an async function.
 *
 * @example
 * ```typescript
 * const userPromise = fetchUser(1);
 * const enhanced = await mapAsync(userPromise, async (user) => {
 *   const profile = await fetchProfile(user.id);
 *   return { ...user, profile };
 * });
 * // Returns: Promise<Result<EnhancedUser, Error>>
 * ```
 *
 * @param promise - Promise of Result to transform
 * @param mapper - Async function to transform the success value
 * @returns Promise of Result with transformed value or original error
 * @throws TypeError if promise is not a Promise or mapper is not a function
 * @see {@link map} for sync transformations
 * @see {@link andThenAsync} for async chaining
 */
export const mapAsync = async <T, U, E>(
  promise: Promise<Result<T, E>>,
  mapper: (value: T) => U | Promise<U>,
): Promise<Result<U, E>> => {
  validatePromise(promise, "mapAsync()");
  validateMapper(mapper, "mapAsync()");

  const result = await promise;
  validateResult(result, "mapAsync()");

  if (result.type === OK) {
    const mapped = await mapper(result.value);
    return { type: OK, value: mapped };
  }
  return result;
};

/**
 * Transforms the error value of a Result using the provided function.
 *
 * @example
 * ```typescript
 * const result = err("not found");
 * const enhanced = mapErr(result, error => ({
 *   code: 404,
 *   message: error,
 *   timestamp: Date.now()
 * }));
 * // Returns: Result<never, ErrorObject> → Err with enhanced error object
 * ```
 *
 * @param result - The Result to transform
 * @param mapper - Function to transform the error value
 * @returns A new Result with original value or transformed error
 * @throws TypeError if result is not a valid Result object or mapper is not a function
 * @see {@link mapErrAsync} for async error transformations
 * @see {@link map} for value transformations
 */
export const mapErr = <T, E, F>(
  result: Result<T, E>,
  mapper: (error: E) => F,
): Result<T, F> => {
  validateResult(result, "mapErr()");
  validateMapper(mapper, "mapErr()");
  return result.type === ERR
    ? { type: ERR, error: mapper(result.error) }
    : result;
};

/**
 * Transforms the error value of a Promise<Result> using an async function.
 *
 * @example
 * ```typescript
 * const result = await mapErrAsync(apiCall(), async (error) => {
 *   await logError(error);
 *   return `Logged error: ${error}`;
 * });
 * // Returns: Promise<Result<T, string>>
 * ```
 *
 * @param promise - Promise of Result to transform
 * @param mapper - Async function to transform the error value
 * @returns Promise of Result with original value or transformed error
 * @throws TypeError if promise is not a Promise or mapper is not a function
 * @see {@link mapErr} for sync error transformations
 * @see {@link mapAsync} for value transformations
 */
export const mapErrAsync = async <T, E, F>(
  promise: Promise<Result<T, E>>,
  mapper: (error: E) => F | Promise<F>,
): Promise<Result<T, F>> => {
  validatePromise(promise, "mapErrAsync()");
  validateMapper(mapper, "mapErrAsync()");

  const result = await promise;
  validateResult(result, "mapErrAsync()");

  if (result.type === ERR) {
    const mapped = await mapper(result.error);
    return { type: ERR, error: mapped };
  }
  return result;
};

/**
 * Chains Results together, passing the success value to the next operation.
 * Also known as flatMap or bind in functional programming.
 *
 * @example
 * ```typescript
 * const result = andThen(getUser(1), user =>
 *   andThen(getProfile(user.id), profile =>
 *     ok({ user, profile })
 *   )
 * );
 * // Returns: Result<{user: User, profile: Profile}, Error>
 *
 * // For complex chains, consider using chain() from result-ts/patterns:
 * import { chain } from 'result-ts/patterns';
 * const result = chain(getUser(1))
 *   .then(user => getProfile(user.id))
 *   .then(profile => getSettings(profile.id))
 *   .then(settings => buildUserContext(profile, settings))
 *   .run();
 * ```
 *
 * @param result - The Result to chain from
 * @param mapper - Function that returns a new Result
 * @returns The new Result or original error
 * @throws TypeError if result is not a valid Result object or mapper is not a function
 * @see {@link andThenAsync} for async chaining
 * @see {@link map} for simple transformations
 */
export const andThen = <T, U, E>(
  result: Result<T, E>,
  mapper: (value: T) => Result<U, E>,
): Result<U, E> => {
  validateResult(result, "andThen()");
  validateMapper(mapper, "andThen()");
  return result.type === OK ? mapper(result.value) : result;
};

/**
 * Chains Promise<Result> together using an async function.
 *
 * @example
 * ```typescript
 * const result = await andThenAsync(
 *   fetchUser(1),
 *   async (user) => await fetchProfile(user.id)
 * );
 * // Returns: Promise<Result<Profile, Error>>
 * ```
 *
 * @param promise - Promise of Result to chain from
 * @param mapper - Async function that returns a Promise<Result>
 * @returns Promise of the new Result or original error
 * @throws TypeError if promise is not a Promise or mapper is not a function
 * @see {@link andThen} for sync chaining
 * @see {@link mapAsync} for simple async transformations
 */
export const andThenAsync = async <T, U, E>(
  promise: Promise<Result<T, E>>,
  mapper: (value: T) => Promise<Result<U, E>>,
): Promise<Result<U, E>> => {
  validatePromise(promise, "andThenAsync()");
  validateMapper(mapper, "andThenAsync()");

  const result = await promise;
  validateResult(result, "andThenAsync()");

  return result.type === OK ? await mapper(result.value) : result;
};

/**
 * This entry point includes core essentials + iteration operations.
 *
 * Use for: data transformation, chaining, functional composition
 *
 * Key functions: map(), andThen(), mapAsync(), mapErr()
 *
 * For complex operation chaining, consider:
 * - `chain()` from result-ts/patterns → Promise-like fluent API with unlimited operations
 * - `safe()` from result-ts/patterns → Generator-based Rust-style ? operator
 *
 * Other available layers:
 * - `result-ts` → core essentials only
 * - `result-ts/batch` → core + array processing
 * - `result-ts/utils` → core + debugging utilities
 * - `result-ts/patterns` → core + advanced patterns (chain, safe, zip, apply)
 * - `result-ts/schema` → core + validation with Zod
 */
