// result-ts/schema - Core essentials + schema validation
// Provides runtime validation with Zod integration

import { z } from "zod";

// Re-export all core essentials from core module
export * from "@/core";

// Import types and constants for schema implementations
import { OK, ERR, type Result } from "@/types";

// Use shared constants from types.ts

// =============================================================================
// CORE VALIDATION FUNCTIONS (Individual Exports)
// =============================================================================

/**
 * Validates data against a Zod schema and returns a Result.
 * Essential for runtime type safety and API data validation.
 *
 * @example
 * ```typescript
 * const UserSchema = z.object({
 *   id: z.number(),
 *   email: z.string().email(),
 *   name: z.string().min(1),
 *   age: z.number().min(18).max(120)
 * });
 *
 * // API request validation
 * const userResult = validate(requestBody, UserSchema);
 * // Returns: Result<User, string> → Ok(validatedUser) or Err("Validation failed: ...")
 *
 * // Form data validation
 * const formResult = validate(formData, UserSchema);
 * if (isOk(formResult)) {
 *   await saveUser(formResult.value); // Type-safe validated data
 * } else {
 *   displayValidationError(formResult.error);
 * }
 * ```
 *
 * @param data - The data to validate
 * @param schema - The Zod schema to validate against
 * @returns Result containing validated data or validation error message
 * @see {@link validateAsync} for async validation with refinements
 * @see {@link validateWith} for custom error mapping
 * @see {@link parseJson} for combined JSON parsing and validation
 */
export const validate = <T>(
  data: unknown,
  schema: z.ZodType<T>,
): Result<T, string> => {
  const result = schema.safeParse(data);
  return result.success
    ? { type: OK, value: result.data }
    : { type: ERR, error: `Validation failed: ${result.error.message}` };
};

/**
 * Validates data against a Zod schema asynchronously and returns a Result.
 * Required for schemas with async refinements like database uniqueness checks.
 *
 * @example
 * ```typescript
 * const UserRegistrationSchema = z.object({
 *   email: z.string().email().refine(async (email) => {
 *     const exists = await checkEmailExists(email);
 *     return !exists;
 *   }, "Email already registered"),
 *   username: z.string().min(3).refine(async (username) => {
 *     return await isUsernameAvailable(username);
 *   }, "Username already taken")
 * });
 *
 * // User registration with async validation
 * const registrationResult = await validateAsync(userData, UserRegistrationSchema);
 * // Returns: Promise<Result<UserData, string>>
 *
 * // File upload validation with async virus scanning
 * const fileResult = await validateAsync(uploadData, FileUploadSchema);
 * ```
 *
 * @param data - The data to validate
 * @param schema - The Zod schema to validate against
 * @returns Promise of Result containing validated data or validation error message
 * @see {@link validate} for synchronous validation
 * @see {@link validateWithAsync} for async validation with custom error mapping
 * @see {@link parseJsonAsync} for combined async JSON parsing and validation
 */
export const validateAsync = async <T>(
  data: unknown,
  schema: z.ZodType<T>,
): Promise<Result<T, string>> => {
  const result = await schema.safeParseAsync(data);
  return result.success
    ? { type: OK, value: result.data }
    : { type: ERR, error: `Validation failed: ${result.error.message}` };
};

/**
 * Validates data with custom error mapping for application-specific error types.
 * Useful for creating structured error responses or domain-specific error objects.
 *
 * @example
 * ```typescript
 * // API error responses
 * const apiValidation = validateWith(
 *   requestData,
 *   UserSchema,
 *   (zodError) => ({
 *     status: 400,
 *     code: "VALIDATION_ERROR",
 *     message: "Invalid user data",
 *     details: zodError.issues.map(issue => ({
 *       field: issue.path.join('.'),
 *       message: issue.message,
 *       code: issue.code
 *     }))
 *   })
 * );
 * // Returns: Result<User, ApiErrorResponse>
 *
 * // Form validation with field-specific errors
 * const formValidation = validateWith(
 *   formData,
 *   ContactFormSchema,
 *   (zodError) => new ValidationError(
 *     zodError.issues[0]?.message || "Validation failed",
 *     zodError.issues[0]?.path.join('.') || 'unknown'
 *   )
 * );
 * ```
 *
 * @param data - The data to validate
 * @param schema - The Zod schema to validate against
 * @param errorMapper - Function to transform ZodError into custom error type
 * @returns Result containing validated data or custom mapped error
 * @see {@link validate} for standard string error messages
 * @see {@link validateWithAsync} for async version with custom error mapping
 */
export const validateWith = <T, E>(
  data: unknown,
  schema: z.ZodType<T>,
  errorMapper: (error: z.ZodError) => E,
): Result<T, E> => {
  const result = schema.safeParse(data);
  return result.success
    ? { type: OK, value: result.data }
    : { type: ERR, error: errorMapper(result.error) };
};

/**
 * Validates data asynchronously with custom error mapping.
 * Combines async validation capabilities with application-specific error handling.
 *
 * @example
 * ```typescript
 * // Advanced user registration with custom error tracking
 * const registration = await validateWithAsync(
 *   userData,
 *   AsyncUserSchema,
 *   (zodError) => ({
 *     timestamp: Date.now(),
 *     requestId: generateRequestId(),
 *     validationErrors: zodError.issues.map(issue => ({
 *       field: issue.path.join('.'),
 *       message: issue.message,
 *       severity: issue.code === 'invalid_email' ? 'high' : 'medium'
 *     }))
 *   })
 * );
 * // Returns: Promise<Result<User, CustomErrorReport>>
 * ```
 *
 * @param data - The data to validate
 * @param schema - The Zod schema to validate against
 * @param errorMapper - Function to transform ZodError into custom error type
 * @returns Promise of Result containing validated data or custom mapped error
 * @see {@link validateWith} for synchronous version with custom error mapping
 * @see {@link validateAsync} for async validation with standard error messages
 */
export const validateWithAsync = async <T, E>(
  data: unknown,
  schema: z.ZodType<T>,
  errorMapper: (error: z.ZodError) => E,
): Promise<Result<T, E>> => {
  const result = await schema.safeParseAsync(data);
  return result.success
    ? { type: OK, value: result.data }
    : { type: ERR, error: errorMapper(result.error) };
};

// =============================================================================
// SCHEMA BUILDERS (Individual Exports)
// =============================================================================

/**
 * Creates a Zod schema for validating Result types.
 * Useful for API responses that return Result objects or deserializing Results.
 *
 * @example
 * ```typescript
 * // API response validation
 * const UserResultSchema = resultSchema(
 *   z.object({ id: z.number(), name: z.string(), email: z.string() }),
 *   z.object({ code: z.string(), message: z.string() })
 * );
 *
 * const apiResponse = { type: "Ok", value: { id: 1, name: "John", email: "john@example.com" } };
 * const validated = UserResultSchema.parse(apiResponse);
 * // Returns: Result<User, ApiError> with validated structure
 *
 * // Webhook payload validation
 * const WebhookResultSchema = resultSchema(z.any(), z.string());
 * const webhookResult = WebhookResultSchema.parse(webhookPayload);
 * ```
 *
 * @param valueSchema - Schema for the success value type
 * @param errorSchema - Schema for the error type
 * @returns Zod schema that validates Result<T, E> objects
 * @see {@link stringErrorSchema} for Results with string errors
 * @see {@link structuredErrorSchema} for Results with structured error objects
 */
export const resultSchema = <T, E>(
  valueSchema: z.ZodType<T>,
  errorSchema: z.ZodType<E>,
) =>
  z.discriminatedUnion("type", [
    z.object({ type: z.literal(OK), value: valueSchema }),
    z.object({ type: z.literal(ERR), error: errorSchema }),
  ]);

/**
 * Creates a Result schema with string error type.
 * Convenience function for the common case of string errors.
 *
 * @example
 * ```typescript
 * // Simple API response validation
 * const UserResultSchema = stringErrorSchema(
 *   z.object({ id: z.number(), name: z.string(), email: z.string() })
 * );
 *
 * // Validates: Result<User, string>
 * const response = { type: "Err", error: "User not found" };
 * const validated = UserResultSchema.parse(response);
 * ```
 *
 * @param valueSchema - Schema for the success value type
 * @returns Zod schema that validates Result<T, string> objects
 * @see {@link resultSchema} for custom error types
 * @see {@link structuredErrorSchema} for structured error objects
 */
export const stringErrorSchema = <T>(valueSchema: z.ZodType<T>) =>
  resultSchema(valueSchema, z.string());

/**
 * Creates a Result schema with number error type.
 * Useful for HTTP status codes or numeric error codes.
 *
 * @example
 * ```typescript
 * // HTTP status code errors
 * const ApiResponseSchema = numberErrorSchema(
 *   z.object({ data: z.array(z.any()), meta: z.object({}) })
 * );
 *
 * // Validates: Result<ApiData, number>
 * const response = { type: "Err", error: 404 };
 * const validated = ApiResponseSchema.parse(response);
 * ```
 *
 * @param valueSchema - Schema for the success value type
 * @returns Zod schema that validates Result<T, number> objects
 * @see {@link resultSchema} for custom error types
 * @see {@link stringErrorSchema} for string error messages
 */
export const numberErrorSchema = <T>(valueSchema: z.ZodType<T>) =>
  resultSchema(valueSchema, z.number());

/**
 * Creates a Result schema with structured error object.
 * Ideal for rich error information with codes, messages, and metadata.
 *
 * @example
 * ```typescript
 * // Rich error information
 * const UserResultSchema = structuredErrorSchema(
 *   z.object({ id: z.number(), name: z.string(), email: z.string() })
 * );
 * // Validates: Result<User, { message: string, code?: number }>
 *
 * const errorResponse = {
 *   type: "Err",
 *   error: { message: "Invalid email format", code: 400 }
 * };
 * const validated = UserResultSchema.parse(errorResponse);
 * ```
 *
 * @param valueSchema - Schema for the success value type
 * @returns Zod schema that validates Result<T, StructuredError> objects
 * @see {@link resultSchema} for fully custom error schemas
 */
export const structuredErrorSchema = <T>(valueSchema: z.ZodType<T>) =>
  resultSchema(
    valueSchema,
    z.object({
      message: z.string(),
      code: z.number().optional(),
    }),
  );

// =============================================================================
// JSON PARSING (Individual Exports)
// =============================================================================

/**
 * Parses JSON string and validates against schema, returning a Result.
 * Essential for safe API response processing and configuration file parsing.
 *
 * @example
 * ```typescript
 * // API response processing
 * const UserSchema = z.object({ id: z.number(), name: z.string(), email: z.string() });
 * const apiResponse = '{"id": 1, "name": "John", "email": "john@example.com"}';
 * const userResult = parseJson(apiResponse, UserSchema);
 * // Returns: Result<User, string> → Ok(user) or Err("Invalid JSON: ..." | "Validation failed: ...")
 *
 * // Configuration file parsing
 * const ConfigSchema = z.object({
 *   apiUrl: z.string().url(),
 *   timeout: z.number().positive(),
 *   retries: z.number().min(0).max(5)
 * });
 * const configResult = parseJson(configFileContent, ConfigSchema);
 *
 * // Webhook payload validation
 * const webhookResult = parseJson(requestBody, WebhookPayloadSchema);
 * if (isOk(webhookResult)) {
 *   await processWebhook(webhookResult.value);
 * }
 * ```
 *
 * @param jsonString - The JSON string to parse
 * @param schema - The Zod schema to validate the parsed data against
 * @returns Result containing validated parsed data or error message
 * @see {@link parseJsonAsync} for async validation with refinements
 * @see {@link validate} for validating already-parsed data
 */
export const parseJson = <T>(
  jsonString: string,
  schema: z.ZodType<T>,
): Result<T, string> => {
  try {
    const parsed = JSON.parse(jsonString);
    return validate(parsed, schema);
  } catch (error) {
    return {
      type: ERR,
      error: `Invalid JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
};

/**
 * Parses JSON string and validates against schema asynchronously.
 * Required when schemas include async refinements or external validation.
 *
 * @example
 * ```typescript
 * // User registration with async email validation
 * const RegistrationSchema = z.object({
 *   email: z.string().email().refine(async (email) => {
 *     return !(await isEmailTaken(email));
 *   }, "Email already registered"),
 *   username: z.string().min(3)
 * });
 *
 * const registrationData = '{"email": "user@example.com", "username": "newuser"}';
 * const result = await parseJsonAsync(registrationData, RegistrationSchema);
 * // Returns: Promise<Result<RegistrationData, string>>
 *
 * // File upload with async virus scanning
 * const uploadResult = await parseJsonAsync(uploadMetadata, FileUploadSchema);
 * ```
 *
 * @param jsonString - The JSON string to parse
 * @param schema - The Zod schema to validate the parsed data against
 * @returns Promise of Result containing validated parsed data or error message
 * @see {@link parseJson} for synchronous parsing and validation
 * @see {@link validateAsync} for validating already-parsed data asynchronously
 */
export const parseJsonAsync = async <T>(
  jsonString: string,
  schema: z.ZodType<T>,
): Promise<Result<T, string>> => {
  try {
    const parsed = JSON.parse(jsonString);
    return await validateAsync(parsed, schema);
  } catch (error) {
    return {
      type: ERR,
      error: `Invalid JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
};

/**
 * Parses a JSON string containing a Result object and validates both structure and content.
 * Essential for deserializing Result objects from APIs or storage.
 *
 * @example
 * ```typescript
 * // API endpoint that returns Result objects
 * const apiResponseJson = '{"type": "Ok", "value": {"id": 1, "name": "John", "email": "john@example.com"}}';
 * const userResult = parseResult(
 *   apiResponseJson,
 *   z.object({ id: z.number(), name: z.string(), email: z.string() }),
 *   z.object({ code: z.string(), message: z.string() })
 * );
 * // Returns: Result<Result<User, ApiError>, string>
 *
 * // Cache deserialization
 * const cachedResult = parseResult(cacheData, UserSchema, z.string());
 * if (isOk(cachedResult) && isOk(cachedResult.value)) {
 *   const user = cachedResult.value.value; // Validated user data
 * }
 * ```
 *
 * @param jsonString - JSON string containing a Result object
 * @param valueSchema - Schema for the success value type
 * @param errorSchema - Schema for the error type
 * @returns Result containing validated Result object or error message
 * @see {@link parseResultAsync} for async validation of Result objects
 * @see {@link resultSchema} for creating schemas that validate Result structure
 */
export const parseResult = <T, E>(
  jsonString: string,
  valueSchema: z.ZodType<T>,
  errorSchema: z.ZodType<E>,
): Result<Result<T, E>, string> => {
  try {
    const parsed = JSON.parse(jsonString);

    if (!parsed || typeof parsed !== "object" || !("type" in parsed)) {
      return {
        type: ERR,
        error: "Invalid Result structure: missing 'type' field",
      };
    }

    if (parsed.type === OK) {
      if (!("value" in parsed)) {
        return { type: ERR, error: "Invalid Ok Result: missing 'value' field" };
      }
      const valueValidation = valueSchema.safeParse(parsed.value);
      if (!valueValidation.success) {
        return {
          type: ERR,
          error: `Invalid Ok value: ${valueValidation.error.message}`,
        };
      }
      return { type: OK, value: { type: OK, value: valueValidation.data } };
    } else if (parsed.type === ERR) {
      if (!("error" in parsed)) {
        return {
          type: ERR,
          error: "Invalid Err Result: missing 'error' field",
        };
      }
      const errorValidation = errorSchema.safeParse(parsed.error);
      if (!errorValidation.success) {
        return {
          type: ERR,
          error: `Invalid Err value: ${errorValidation.error.message}`,
        };
      }
      return { type: OK, value: { type: ERR, error: errorValidation.data } };
    } else {
      return {
        type: ERR,
        error: `Invalid Result type: expected '${OK}' or '${ERR}', got '${parsed.type}'`,
      };
    }
  } catch (error) {
    return {
      type: ERR,
      error: `Invalid JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
};

/**
 * Parses a JSON string containing a Result object and validates asynchronously.
 * Required when Result content schemas include async refinements.
 *
 * @example
 * ```typescript
 * // Deserialize Result with async validation
 * const asyncResult = await parseResultAsync(
 *   resultJson,
 *   AsyncUserSchema,  // Contains async email uniqueness check
 *   z.string()
 * );
 * // Returns: Promise<Result<Result<User, string>, string>>
 *
 * // Complex validation scenarios
 * const validatedResult = await parseResultAsync(
 *   storedResultJson,
 *   FileMetadataSchema, // Async virus scan validation
 *   ErrorSchema
 * );
 * ```
 *
 * @param jsonString - JSON string containing a Result object
 * @param valueSchema - Schema for the success value type
 * @param errorSchema - Schema for the error type
 * @returns Promise of Result containing validated Result object or error message
 * @see {@link parseResult} for synchronous validation of Result objects
 * @see {@link parseJsonAsync} for async JSON parsing without Result structure
 */
export const parseResultAsync = async <T, E>(
  jsonString: string,
  valueSchema: z.ZodType<T>,
  errorSchema: z.ZodType<E>,
): Promise<Result<Result<T, E>, string>> => {
  try {
    const parsed = JSON.parse(jsonString);

    if (!parsed || typeof parsed !== "object" || !("type" in parsed)) {
      return {
        type: ERR,
        error: "Invalid Result structure: missing 'type' field",
      };
    }

    if (parsed.type === OK) {
      if (!("value" in parsed)) {
        return { type: ERR, error: "Invalid Ok Result: missing 'value' field" };
      }
      const valueValidation = await valueSchema.safeParseAsync(parsed.value);
      if (!valueValidation.success) {
        return {
          type: ERR,
          error: `Invalid Ok value: ${valueValidation.error.message}`,
        };
      }
      return { type: OK, value: { type: OK, value: valueValidation.data } };
    } else if (parsed.type === ERR) {
      if (!("error" in parsed)) {
        return {
          type: ERR,
          error: "Invalid Err Result: missing 'error' field",
        };
      }
      const errorValidation = await errorSchema.safeParseAsync(parsed.error);
      if (!errorValidation.success) {
        return {
          type: ERR,
          error: `Invalid Err value: ${errorValidation.error.message}`,
        };
      }
      return { type: OK, value: { type: ERR, error: errorValidation.data } };
    } else {
      return {
        type: ERR,
        error: `Invalid Result type: expected '${OK}' or '${ERR}', got '${parsed.type}'`,
      };
    }
  } catch (error) {
    return {
      type: ERR,
      error: `Invalid JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
};

/**
 * This entry point includes core essentials + schema validation.
 *
 * Use for: runtime validation with Zod, JSON parsing, schema building
 *
 * Key functions: validate(), parseJson(), resultSchema(), validateAsync()
 *
 * Common patterns:
 * - **API validation**: parseJson() for request bodies, validate() for parsed data
 * - **Form processing**: validate() with custom error mapping for user-friendly messages
 * - **Configuration**: parseJson() for config files with structured validation
 * - **Async validation**: validateAsync() for database uniqueness checks, external API validation
 * - **Result serialization**: parseResult() for deserializing stored Result objects
 *
 * Requires: Zod as peer dependency
 *
 * Other available layers:
 * - `result-ts` → core essentials only
 * - `result-ts/iter` → core + data transformation
 * - `result-ts/batch` → core + array processing
 * - `result-ts/utils` → core + debugging utilities
 * - `result-ts/patterns` → core + advanced patterns
 */
