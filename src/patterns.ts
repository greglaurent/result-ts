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
 * Error type constraint ensures consistent error handling through the chain.
 *
 * @example
 * ```typescript
 * // Promise-like fluent chaining with structured errors
 * const userResult: Result<User, ApiError> = fetchUser(1);
 * const result = chain(userResult)
 *   .then(user => getProfile(user))          // Returns Result<Profile, ApiError>
 *   .then(profile => enrichProfile(profile)) // Returns Result<EnhancedProfile, ApiError>
 *   .then(enriched => resultOk({ user: enriched.user, profile: enriched }))
 *   .run();
 * // Type safety: all errors are ApiError with .status, .message, .endpoint
 *
 * // Database operations with consistent error types
 * const dbResult: Result<Record, DatabaseError> = fetchRecord(id);
 * const processed = chain(dbResult)
 *   .then(record => validateRecord(record))   // Returns Result<ValidRecord, DatabaseError>
 *   .then(valid => transformRecord(valid))    // Returns Result<TransformedRecord, DatabaseError>
 *   .run();
 * // Type safety ensures all errors have .code, .query, .table properties
 * ```
 *
 * @param initial - The initial Result to start the chain (with constrained error type)
 * @returns A chainable interface for Result operations
 * @throws TypeError if initial is not a valid Result object
 */
export function chain<T, E extends Record<string, unknown> | string | Error>(
  initial: Result<T, E>,
): Chain<T, E>;
export function chain<T, E>(initial: Result<T, E>): Chain<T, E>;
export function chain<T, E>(initial: Result<T, E>): Chain<T, E> {
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
}

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
 * Error type constraint ensures consistent error handling across all yielded Results.
 *
 * @example
 * ```typescript
 * // API workflow with consistent error types
 * const result = safe(function* () {
 *   const user = yield getUser(id);        // Result<User, ApiError>
 *   const profile = yield getProfile(user.id); // Result<Profile, ApiError>
 *   const posts = yield getPosts(profile.id);  // Result<Post[], ApiError>
 *   return { user, profile, posts };            // Only runs if all succeed
 * });
 * // Returns: Result<{user, profile, posts}, ApiError>
 * // Type safety: any error has .status, .message, .endpoint properties
 *
 * // Database transaction with structured error handling
 * const dbResult = safe(function* () {
 *   const conn = yield openConnection();      // Result<Connection, DbError>
 *   const user = yield insertUser(conn, data);   // Result<User, DbError>
 *   const profile = yield insertProfile(conn, user); // Result<Profile, DbError>
 *   yield commitTransaction(conn);           // Result<void, DbError>
 *   return { user, profile };
 * });
 * // Type safety ensures all errors have .code, .query, .table properties
 * ```
 *
 * @param generator - Generator function that yields Results and returns final value (with consistent error type)
 * @returns Result containing either the final value or the first error
 * @throws TypeError if generator is not a function
 */
export function safe<T, E extends Record<string, unknown> | string | Error>(
  generator: () => Generator<Result<any, E>, T, any>,
): Result<T, E>;
export function safe<T, E>(
  generator: () => Generator<Result<any, E>, T, any>,
): Result<T, E>;
export function safe<T, E>(
  generator: () => Generator<Result<any, E>, T, any>,
): Result<T, E> {
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
}

/**
 * Async version of safe() for generator functions that yield Promise<r>.
 * Error type constraint ensures consistent async error handling.
 *
 * @example
 * ```typescript
 * // Async API workflow with consistent error types
 * const result = await safeAsync(async function* () {
 *   const user = yield await fetchUser(id);         // Promise<Result<User, ApiError>>
 *   const profile = yield await fetchProfile(user.id); // Promise<Result<Profile, ApiError>>
 *   const settings = yield await fetchSettings(profile.id); // Promise<Result<Settings, ApiError>>
 *   return { user, profile, settings };
 * });
 * // Returns: Promise<Result<{user, profile, settings}, ApiError>>
 * // Type safety: any error has .status, .message, .endpoint, .retryAfter properties
 *
 * // File processing pipeline with structured errors
 * const fileResult = await safeAsync(async function* () {
 *   const content = yield await readFile(path);     // Promise<Result<string, FileError>>
 *   const parsed = yield await parseContent(content); // Promise<Result<Data, FileError>>
 *   const validated = yield await validateData(parsed); // Promise<Result<ValidData, FileError>>
 *   return validated;
 * });
 * // Type safety ensures all errors have .filename, .operation, .reason properties
 * ```
 *
 * @param generator - Async generator function that yields Results (with consistent error type)
 * @returns Promise of Result containing final value or first error
 * @throws TypeError if generator is not a function
 */
export function safeAsync<
  T,
  E extends Record<string, unknown> | string | Error,
>(
  generator: () => AsyncGenerator<Result<any, E>, T, any>,
): Promise<Result<T, E>>;
export function safeAsync<T, E>(
  generator: () => AsyncGenerator<Result<any, E>, T, any>,
): Promise<Result<T, E>>;
export async function safeAsync<T, E>(
  generator: () => AsyncGenerator<Result<any, E>, T, any>,
): Promise<Result<T, E>> {
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
}

/**
 * Helper function for yielding Results in safe() generators.
 * Makes generator syntax cleaner by avoiding explicit yield syntax.
 * Error type constraint ensures consistent error handling.
 *
 * @example
 * ```typescript
 * // Clean generator syntax with consistent error types
 * const result = safe(function* () {
 *   const user = yield yieldFn(getUser(id));      // Result<User, ApiError>
 *   const profile = yield yieldFn(getProfile(user.id)); // Result<Profile, ApiError>
 *   return { user, profile };
 * });
 * // Type safety ensures consistent ApiError structure throughout
 * ```
 *
 * @param result - Result to yield in generator context (with constrained error type)
 * @returns The same Result (for generator yielding)
 * @throws TypeError if result is not a valid Result object
 */
export function yieldFn<T, E extends Record<string, unknown> | string | Error>(
  result: Result<T, E>,
): Result<T, E>;
export function yieldFn<T, E>(result: Result<T, E>): Result<T, E>;
export function yieldFn<T, E>(result: Result<T, E>): Result<T, E> {
  validateResult(result, "yieldFn()");
  return result;
}

/**
 * Combines two Results into a tuple Result. Fails if either input fails.
 * Useful for operations that need both values to proceed.
 * Error type constraint ensures compatible error handling between both Results.
 *
 * @example
 * ```typescript
 * // User profile combining with consistent error types
 * const nameResult: Result<string, ValidationError> = validateName(userData.name);
 * const emailResult: Result<string, ValidationError> = validateEmail(userData.email);
 * const combined = zip(nameResult, emailResult);
 * // Returns: Result<[string, string], ValidationError> → Ok([name, email]) or first ValidationError
 * // Type safety: any error has .field, .message, .code properties
 *
 * const userProfile = match(combined, {
 *   Ok: ([name, email]) => ({ name, email, createdAt: Date.now() }),
 *   Err: (error) => {
 *     logValidationError(error.field, error.message);
 *     return null;
 *   }
 * });
 *
 * // API data combining with structured errors
 * const userResult: Result<User, ApiError> = fetchUser(id);
 * const settingsResult: Result<Settings, ApiError> = fetchSettings(id);
 * const userWithSettings = zip(userResult, settingsResult);
 * // Type safety ensures errors have .status, .endpoint, .message properties
 * ```
 *
 * @param resultA - First Result to combine (with constrained error type)
 * @param resultB - Second Result to combine (with compatible error type)
 * @returns Result containing tuple of both values or first error
 * @throws TypeError if either result is not a valid Result object
 */
export function zip<T, U, E extends Record<string, unknown> | string | Error>(
  resultA: Result<T, E>,
  resultB: Result<U, E>,
): Result<[T, U], E>;
export function zip<T, U, E>(
  resultA: Result<T, E>,
  resultB: Result<U, E>,
): Result<[T, U], E>;
export function zip<T, U, E>(
  resultA: Result<T, E>,
  resultB: Result<U, E>,
): Result<[T, U], E> {
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
}

/**
 * Applies a function wrapped in a Result to a value wrapped in a Result.
 * This is the applicative functor pattern for Results.
 * Error type constraint ensures compatible error handling between function and value Results.
 *
 * @example
 * ```typescript
 * // Form validation with consistent error types
 * const validateAndTransform = (userData: FormData) => {
 *   const transformFn: Result<(user: User) => EnhancedUser, ValidationError> =
 *     ok((user) => ({ ...user, verified: true, joinedAt: Date.now() }));
 *   const userResult: Result<User, ValidationError> = validateUser(userData);
 *
 *   return apply(transformFn, userResult);
 *   // Returns: Result<EnhancedUser, ValidationError>
 *   // Type safety: any error has .field, .message, .code properties
 * };
 *
 * // API data transformation with structured errors
 * const processApiData = (rawData: unknown) => {
 *   const parserFn: Result<(data: RawData) => ProcessedData, ApiError> =
 *     getDataParser(); // Returns function or ApiError
 *   const dataResult: Result<RawData, ApiError> = validateRawData(rawData);
 *
 *   return apply(parserFn, dataResult);
 *   // Type safety ensures errors have .status, .endpoint, .message properties
 * };
 *
 * // Mathematical operations with error propagation
 * const parseNumber = (s: string): Result<number, ParseError> =>
 *   isNaN(+s) ? err({type: "PARSE_ERROR", input: s}) : ok(+s);
 * const add = ok((x: number) => (y: number) => x + y);
 * const result = apply(
 *   apply(add, parseNumber("5")),
 *   parseNumber("3")
 * );
 * // Returns: Result<number, ParseError> → Ok(8) or structured ParseError
 * ```
 *
 * @param resultFn - Result containing a function (with constrained error type)
 * @param resultValue - Result containing a value to apply the function to (with compatible error type)
 * @returns Result containing the function application result or first error
 * @throws TypeError if either result is not a valid Result object or resultFn doesn't contain a function
 */
export function apply<T, U, E extends Record<string, unknown> | string | Error>(
  resultFn: Result<(value: T) => U, E>,
  resultValue: Result<T, E>,
): Result<U, E>;
export function apply<T, U, E>(
  resultFn: Result<(value: T) => U, E>,
  resultValue: Result<T, E>,
): Result<U, E>;
export function apply<T, U, E>(
  resultFn: Result<(value: T) => U, E>,
  resultValue: Result<T, E>,
): Result<U, E> {
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
}

/**
 * This entry point includes core essentials + advanced functional patterns.
 *
 * Use for: generator-based error handling, applicative patterns, advanced composition
 *
 * Key functions: safe(), safeAsync(), zip(), apply(), yieldFn()
 * Ergonomic helpers: resultOk(), resultErr(), chain()
 *
 * Generic constraints ensure type safety:
 * - Error types constrained to meaningful types (Record<string, unknown> | string | Error)
 * - Consistent error handling across combined/chained Results
 * - Better IntelliSense for error properties in complex workflows
 * - Overloaded signatures provide optimal type inference with backward compatibility
 *
 * Advanced features:
 * - safe() → Rust-style ? operator with generators and consistent error types
 * - zip() → combine multiple Results into tuples with compatible errors
 * - apply() → applicative functor patterns with structured error handling
 * - chain() → Promise-like fluent API with error type consistency
 * - resultOk/resultErr → generator typing helpers
 *
 * Other available layers:
 * - `result-ts` → core essentials only
 * - `result-ts/iter` → core + data transformation
 * - `result-ts/batch` → core + array processing
 * - `result-ts/utils` → core + debugging utilities
 * - `result-ts/schema` → core + validation with Zod
 */
