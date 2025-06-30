// result-ts/utils - Core essentials + utility functions
// Provides debugging, side effects, and conversion utilities

// Re-export all core essentials from core module
export * from "@/core";

// Import types and constants for utils implementations
import { OK, ERR, type Result } from "@/types";

// =============================================================================
// UTILITY FUNCTIONS (Individual Exports)
// =============================================================================

/**
 * Inspects a Result by calling callbacks without changing the Result.
 * Useful for debugging or side effects without changing the Result.
 *
 * @example
 * ```typescript
 * const userResult = inspect(
 *   fetchUser(userId),
 *   (user) => console.log(`✅ Loaded user: ${user.name} (${user.email})`),
 *   (error) => console.error(`❌ Failed to load user: ${error.message}`)
 * );
 * // Returns: Result<User, Error> - original result unchanged
 *
 * // Debug API responses in development
 * const apiResult = inspect(
 *   callExternalAPI(),
 *   (data) => console.log("API Success:", JSON.stringify(data, null, 2)),
 *   (error) => console.error("API Error:", error.status, error.message)
 * );
 * ```
 *
 * @param result - The Result to inspect
 * @param onOk - Optional callback for success values
 * @param onErr - Optional callback for error values
 * @returns The original Result unchanged
 * @see {@link tap} for side effects on success values only
 * @see {@link tapErr} for side effects on error values only
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
 * Useful for logging, caching, or other side effects in a processing chain.
 *
 * @example
 * ```typescript
 * const processedUser = tap(
 *   validateAndEnrichUser(userData),
 *   (user) => {
 *     // Cache valid user data
 *     userCache.set(user.id, user);
 *     // Log successful processing
 *     logger.info(`User ${user.id} processed successfully`);
 *   }
 * );
 * // Returns: Result<User, ValidationError> - original result unchanged
 *
 * // Audit trail for successful operations
 * const paymentResult = tap(
 *   processPayment(amount, cardToken),
 *   (payment) => auditLog.record("payment_success", {
 *     amount: payment.amount,
 *     transactionId: payment.id
 *   })
 * );
 * ```
 *
 * @param result - The Result to tap
 * @param fn - Function to call with success value
 * @returns The original Result unchanged
 * @see {@link tapErr} for side effects on error values
 * @see {@link inspect} for side effects on both success and error values
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
 * Useful for error logging, metrics collection, or cleanup operations.
 *
 * @example
 * ```typescript
 * const apiResult = tapErr(
 *   callExternalAPI(),
 *   (error) => {
 *     // Log API failures for monitoring
 *     errorTracker.record("api_failure", {
 *       endpoint: error.endpoint,
 *       status: error.status,
 *       timestamp: Date.now()
 *     });
 *     // Increment retry counter
 *     retryMetrics.increment(error.endpoint);
 *   }
 * );
 * // Returns: Result<ApiData, ApiError> - original result unchanged
 *
 * // User-friendly error reporting
 * const validationResult = tapErr(
 *   validateUserForm(formData),
 *   (validationError) => {
 *     displayFieldError(validationError.field, validationError.message);
 *     analytics.track("form_validation_error", { field: validationError.field });
 *   }
 * );
 * ```
 *
 * @param result - The Result to tap
 * @param fn - Function to call with error value
 * @returns The original Result unchanged
 * @see {@link tap} for side effects on success values
 * @see {@link inspect} for side effects on both success and error values
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
 * Converts a nullable value to a Result with customizable error.
 * Essential for bridging nullable APIs with Result-based error handling.
 *
 * @example
 * ```typescript
 * // Database query results
 * const userRecord = database.findById(userId); // User | null
 * const userResult = fromNullable(userRecord, "User not found");
 * // Returns: Result<User, string> → Ok(user) or Err("User not found")
 *
 * // API responses with optional data
 * const profileData = apiResponse.data?.profile; // Profile | undefined
 * const profileResult = fromNullable(profileData, {
 *   code: "PROFILE_MISSING",
 *   message: "User profile not available"
 * });
 * // Returns: Result<Profile, ErrorObject>
 *
 * // Array operations
 * const firstMatch = items.find(item => item.category === "premium");
 * const matchResult = fromNullable(firstMatch, "No premium items found");
 * ```
 *
 * @param value - The nullable value to convert
 * @param errorValue - Error to use if value is null/undefined
 * @returns Result with the value or the error
 * @see {@link toNullable} for converting Results back to nullable values
 */
export const fromNullable = <T>(
  value: T | null | undefined,
  errorValue: unknown = "Value is null or undefined",
): Result<T, unknown> => {
  return value != null ? { type: OK, value } : { type: ERR, error: errorValue };
};

/**
 * Converts a Result to a nullable value for compatibility with nullable APIs.
 * Useful when interfacing with code that expects null for missing values.
 *
 * @example
 * ```typescript
 * // Database operations
 * const userResult = validateAndFetchUser(userId);
 * const userOrNull = toNullable(userResult);
 * // Returns: User | null
 *
 * if (userOrNull) {
 *   updateUserLastSeen(userOrNull.id); // Safe to access - not null
 * }
 *
 * // Optional chaining with Results
 * const avatarUrl = toNullable(getUserProfile(userId))?.avatar?.url;
 * // Returns: string | null | undefined
 *
 * // Form field values
 * const validatedEmail = toNullable(validateEmail(formData.email));
 * const validatedPhone = toNullable(validatePhone(formData.phone));
 *
 * const contactInfo = {
 *   email: validatedEmail, // string | null
 *   phone: validatedPhone  // string | null
 * };
 * ```
 *
 * @param result - The Result to convert
 * @returns The success value or null for errors
 * @see {@link fromNullable} for converting nullable values to Results
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
 * Common patterns:
 * - **Debugging workflows**: inspect() for comprehensive logging
 * - **Side effects**: tap() for success actions, tapErr() for error handling
 * - **API integration**: fromNullable() for nullable APIs, toNullable() for compatibility
 * - **Performance**: All utilities preserve references and add minimal overhead
 *
 * Other available layers:
 * - `result-ts` → core essentials only
 * - `result-ts/iter` → core + data transformation
 * - `result-ts/batch` → core + array processing
 * - `result-ts/patterns` → core + advanced patterns
 * - `result-ts/schema` → core + validation with Zod
 */
