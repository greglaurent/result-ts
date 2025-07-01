// Internal core module - not exposed to users

import { ERR, type Err, OK, type Ok, type Result } from "./types";

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
 * // Returns: Result<string, never>
 * ```
 *
 * @param value - The success value to wrap
 * @returns A successful Result containing the value
 * @see {@link err} for creating error Results
 * @see {@link isOk} for checking if a Result is successful
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
 * // Returns: Result<never, string>
 *
 * const errorResult = err(new Error("Network failure"));
 * // Returns: Result<never, Error>
 * ```
 *
 * @param error - The error value to wrap
 * @returns An error Result containing the error
 * @see {@link ok} for creating successful Results
 * @see {@link isErr} for checking if a Result is an error
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
 * // Returns: boolean (true for Ok Results)
 * ```
 *
 * @param result - The Result to check
 * @returns True if the Result is Ok, false otherwise
 * @see {@link isErr} for checking error Results
 * @see {@link match} for pattern matching on Results
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
 * // Returns: boolean (true for Err Results)
 * ```
 *
 * @param result - The Result to check
 * @returns True if the Result is Err, false otherwise
 * @see {@link isOk} for checking successful Results
 * @see {@link match} for pattern matching on Results
 */
export const isErr = <T, E>(result: Result<T, E>): result is Err<E> =>
	result.type === ERR;

/**
 * Extracts the value from a successful Result or throws an error.
 * Preserves the original error type when possible, with proper cause chaining.
 * Includes runtime validation for better developer experience.
 * Provides overloaded signatures for optimal type inference when error types are constrained.
 *
 * @example
 * ```typescript
 * const success = ok(42);
 * console.log(unwrap(success)); // 42
 *
 * const failure = err(new Error("failed"));
 * unwrap(failure); // Throws the original Error
 *
 * const customFailure = err({ code: 404, message: "Not found" });
 * unwrap(customFailure); // Throws Error with original in .cause
 *
 * // Error type constraint ensures meaningful error handling
 * const apiResult: Result<Data, ApiError> = callAPI();
 * const data = unwrap(apiResult); // Throws ApiError with proper structure
 * ```
 *
 * @param result - The Result to unwrap (with constrained error type for better error handling)
 * @returns The success value
 * @throws The original error if Result is Err, or wrapped error with cause
 * @throws TypeError if argument is not a valid Result object
 * @see {@link unwrapOr} for safe unwrapping with defaults
 * @see {@link match} for non-throwing Result handling
 */
export function unwrap<T, E extends Record<string, unknown> | string | Error>(
	result: Result<T, E>,
): T;
export function unwrap<T, E>(result: Result<T, E>): T;
export function unwrap<T, E>(result: Result<T, E>): T {
	if (!result || typeof result !== "object") {
		throw new TypeError("Argument must be a Result object");
	}

	const resultObj = result as unknown;
	if (
		typeof resultObj !== "object" ||
		resultObj === null ||
		!("type" in resultObj) ||
		((resultObj as Record<string, unknown>).type !== OK &&
			(resultObj as Record<string, unknown>).type !== ERR)
	) {
		throw new TypeError(
			`Invalid Result: expected object with type '${OK}' or '${ERR}'`,
		);
	}

	if (result.type === OK) return result.value;

	const error = result.error;

	// Most common case with default E = Error
	if (error instanceof Error) {
		throw error;
	}

	// Handle string errors
	if (typeof error === "string") {
		throw new Error(error);
	}

	// Handle all other error types - preserve original in cause
	throw new Error(`Unwrap failed: ${String(error)}`, { cause: error });
}

/**
 * Extracts the value from a Result or returns a default value.
 * Includes runtime validation for better developer experience.
 * Provides overloaded signatures for optimal type inference when error types are constrained.
 *
 * @example
 * ```typescript
 * const success = ok(42);
 * console.log(unwrapOr(success, 0)); // 42
 *
 * const failure = err("failed");
 * console.log(unwrapOr(failure, 0)); // 0
 * // Returns: T (the success value or default)
 *
 * // Error type constraint ensures meaningful error handling
 * const apiResult: Result<Data, ApiError> = callAPI();
 * const data = unwrapOr(apiResult, defaultData); // Safe fallback with structured errors
 * ```
 *
 * @param result - The Result to unwrap (with constrained error type for better error handling)
 * @param defaultValue - The value to return if Result is Err
 * @returns The success value or the default value
 * @throws TypeError if first argument is not a valid Result object
 * @see {@link unwrap} for throwing unwrap behavior
 * @see {@link match} for custom handling of both cases
 */
export function unwrapOr<T, E extends Record<string, unknown> | string | Error>(
	result: Result<T, E>,
	defaultValue: T,
): T;
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T;
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
	if (!result || typeof result !== "object") {
		throw new TypeError("First argument must be a Result object");
	}
	const resultObj = result as unknown;
	if (
		typeof resultObj !== "object" ||
		resultObj === null ||
		!("type" in resultObj) ||
		((resultObj as Record<string, unknown>).type !== OK &&
			(resultObj as Record<string, unknown>).type !== ERR)
	) {
		throw new TypeError(
			`Invalid Result: expected object with type '${OK}' or '${ERR}'`,
		);
	}
	return result.type === OK ? result.value : defaultValue;
}

/**
 * Safely executes a function, catching any thrown errors and converting them to a Result.
 * Uses proper Error.cause chaining to preserve original thrown values.
 *
 * @example
 * ```typescript
 * const jsonString = '{"name": "John"}';
 * const result = handle(() => JSON.parse(jsonString));
 * // Returns: Result<ParsedObject, Error>
 *
 * const failed = handle(() => JSON.parse('invalid json'));
 * // Returns: Result<never, Error>
 *
 * const weirdError = handle(() => { throw 42; });
 * // Returns: Result<never, Error> with .cause = 42
 * ```
 *
 * @param fn - The function to execute safely
 * @returns A Result with the function result or Error object
 * @see {@link handleAsync} for async version
 * @see {@link handleWith} for custom error mapping
 */
export const handle = <T>(fn: () => T): Result<T, Error> => {
	try {
		return { type: OK, value: fn() };
	} catch (thrown) {
		if (thrown instanceof Error) {
			return { type: ERR, error: thrown };
		}

		if (typeof thrown === "string") {
			return { type: ERR, error: new Error(thrown) };
		}

		// For non-Error, non-string throws, wrap and preserve original
		const error = new Error(`Caught non-Error value: ${String(thrown)}`, {
			cause: thrown,
		});
		return { type: ERR, error };
	}
};

/**
 * Safely executes an async function, catching any thrown errors and converting them to a Result.
 * Uses proper Error.cause chaining to preserve original thrown values.
 *
 * @example
 * ```typescript
 * const result = await handleAsync(async () => {
 *   const response = await fetch('/api/users');
 *   return response.json();
 * });
 * // Returns: Promise<Result<Users[], Error>>
 *
 * const apiResult = await handleAsync(async () => {
 *   const response = await fetch('/api/data');
 *   if (!response.ok) throw new Error(`HTTP ${response.status}`);
 *   return response.json();
 * });
 * ```
 *
 * @param fn - The async function to execute safely
 * @returns A Promise of Result with the function result or Error object
 * @see {@link handle} for synchronous version
 * @see {@link handleWithAsync} for custom error mapping
 */
export const handleAsync = async <T>(
	fn: () => Promise<T>,
): Promise<Result<T, Error>> => {
	try {
		const value = await fn();
		return { type: OK, value };
	} catch (thrown) {
		if (thrown instanceof Error) {
			return { type: ERR, error: thrown };
		}

		if (typeof thrown === "string") {
			return { type: ERR, error: new Error(thrown) };
		}

		// For non-Error, non-string throws, wrap and preserve original
		const error = new Error(`Caught non-Error value: ${String(thrown)}`, {
			cause: thrown,
		});
		return { type: ERR, error };
	}
};

/**
 * Safely executes a function with custom error mapping.
 * Uses proper Error.cause chaining before applying custom mapping.
 *
 * @example
 * ```typescript
 * const result = handleWith(
 *   () => riskyOperation(),
 *   (error) => ({
 *     code: 500,
 *     message: error.message,
 *     timestamp: Date.now()
 *   })
 * );
 * // Returns: Result<T, CustomError>
 *
 * const apiResult = handleWith(
 *   () => JSON.parse(invalidJson),
 *   (error) => new ValidationError(error.message)
 * );
 * ```
 *
 * @param fn - The function to execute safely
 * @param errorMapper - Function to transform caught errors/Error objects
 * @returns A Result with the function result or mapped error
 * @see {@link handle} for standard Error handling
 * @see {@link handleWithAsync} for async version
 */
export const handleWith = <
	T,
	E extends Record<string, unknown> | string | Error,
>(
	fn: () => T,
	errorMapper: (error: Error) => E,
): Result<T, E> => {
	try {
		return { type: OK, value: fn() };
	} catch (thrown) {
		let error: Error;

		if (thrown instanceof Error) {
			error = thrown;
		} else if (typeof thrown === "string") {
			error = new Error(thrown);
		} else {
			error = new Error(`Caught non-Error value: ${String(thrown)}`, {
				cause: thrown,
			});
		}

		return { type: ERR, error: errorMapper(error) };
	}
};

/**
 * Safely executes an async function with custom error mapping.
 * Uses proper Error.cause chaining before applying custom mapping.
 *
 * @example
 * ```typescript
 * // API error handling with custom error mapping
 * const result = await handleWithAsync(
 *   async () => {
 *     const response = await fetch('/api/users');
 *     if (!response.ok) throw new Error(`HTTP ${response.status}`);
 *     return response.json();
 *   },
 *   (error) => ({
 *     code: 'API_ERROR',
 *     message: error.message,
 *     timestamp: Date.now(),
 *     cause: error.cause
 *   })
 * );
 * // Returns: Promise<Result<Users[], CustomApiError>>
 *
 * const dbResult = await handleWithAsync(
 *   () => database.query(sql),
 *   (error) => new DatabaseError(error)
 * );
 * ```
 *
 * @param fn - The async function to execute safely
 * @param errorMapper - Function to transform caught errors/Error objects
 * @returns A Promise of Result with the function result or mapped error
 * @see {@link handleWith} for synchronous version
 * @see {@link handleAsync} for standard Error handling
 */
export const handleWithAsync = async <
	T,
	E extends Record<string, unknown> | string | Error,
>(
	fn: () => Promise<T>,
	errorMapper: (error: Error) => E,
): Promise<Result<T, E>> => {
	try {
		const value = await fn();
		return { type: OK, value };
	} catch (thrown) {
		let error: Error;

		if (thrown instanceof Error) {
			error = thrown;
		} else if (typeof thrown === "string") {
			error = new Error(thrown);
		} else {
			error = new Error(`Caught non-Error value: ${String(thrown)}`, {
				cause: thrown,
			});
		}

		return { type: ERR, error: errorMapper(error) };
	}
};

/**
 * Pattern matching for Results. Executes the appropriate handler based on Result type.
 * Overloaded for optimal type inference when both handlers return the same type.
 * Includes runtime validation for better developer experience.
 * Provides overloaded signatures for optimal type inference when error types are constrained.
 *
 * @example
 * ```typescript
 * const message = match(result, {
 *   Ok: (value) => `Success: ${value}`,
 *   Err: (error) => `Failed: ${error.message}`
 * });
 * // Returns: string (result of appropriate handler)
 *
 * const processed = match(apiResult, {
 *   Ok: (data) => data.users.length,
 *   Err: () => 0
 * });
 * // Returns: number
 *
 * // Error type constraint ensures structured error handling
 * const apiMessage = match(apiResult, {
 *   Ok: (data) => `Loaded ${data.users.length} users`,
 *   Err: (error) => `API Error ${error.status}: ${error.message}`
 * });
 * // Type safety: error parameter has .status, .message properties
 * ```
 *
 * @param result - The Result to match against (with constrained error type for better error handling)
 * @param handlers - Object with Ok and Err handler functions
 * @returns The result of the appropriate handler
 * @throws TypeError if arguments are invalid
 * @see {@link isOk} and {@link isErr} for simple boolean checks
 * @see {@link unwrap} and {@link unwrapOr} for value extraction
 */
export function match<T, E extends Record<string, unknown> | string | Error, R>(
	result: Result<T, E>,
	handlers: {
		Ok: (value: T) => R;
		Err: (error: E) => R;
	},
): R;
export function match<
	T,
	U,
	V,
	E extends Record<string, unknown> | string | Error,
>(
	result: Result<T, E>,
	handlers: {
		Ok: (value: T) => U;
		Err: (error: E) => V;
	},
): U | V;
export function match<T, E, R>(
	result: Result<T, E>,
	handlers: {
		Ok: (value: T) => R;
		Err: (error: E) => R;
	},
): R;
export function match<T, U, V, E>(
	result: Result<T, E>,
	handlers: {
		Ok: (value: T) => U;
		Err: (error: E) => V;
	},
): U | V;
export function match<T, U, V, E>(
	result: Result<T, E>,
	handlers: {
		Ok: (value: T) => U;
		Err: (error: E) => V;
	},
): U | V {
	if (!result || typeof result !== "object") {
		throw new TypeError("First argument must be a Result object");
	}
	const resultObj = result as unknown;
	if (
		typeof resultObj !== "object" ||
		resultObj === null ||
		!("type" in resultObj) ||
		((resultObj as Record<string, unknown>).type !== OK &&
			(resultObj as Record<string, unknown>).type !== ERR)
	) {
		throw new TypeError(
			`Invalid Result: expected object with type '${OK}' or '${ERR}'`,
		);
	}
	if (!handlers || typeof handlers !== "object") {
		throw new TypeError("Second argument must be a handlers object");
	}
	if (typeof handlers.Ok !== "function" || typeof handlers.Err !== "function") {
		throw new TypeError("Handlers must have Ok and Err functions");
	}

	return result.type === OK
		? handlers.Ok(result.value)
		: handlers.Err(result.error);
}

// Re-export types for layer files that import from core
export type { Err, Ok, Result } from "./types";

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
 * - Consistent Error handling with ES2022 Error.cause support
 * - Enhanced type safety with generic constraints and runtime validation
 * - Overloaded functions for optimal type inference
 * - Better developer experience with descriptive error messages
 *
 * Generic constraints ensure type safety:
 * - Error types constrained to meaningful types (Record<string, unknown> | string | Error)
 * - Overloaded signatures provide optimal type inference with constraints
 * - Backward compatibility maintained with unconstrained overloads
 * - Better IntelliSense and error messages during development
 */
