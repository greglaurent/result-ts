// result-ts/schema - Core essentials + Zod validation integration
// Provides runtime validation and JSON parsing with Result types

// Re-export all core essentials from core module
export * from "@/core";

// Import types and constants for schema implementations
import { OK, ERR, type Result } from "@/types";
import type { z } from "zod";

// =============================================================================
// RUNTIME VALIDATION HELPERS
// =============================================================================

/**
 * Validates that a schema parameter is a Zod schema.
 * Provides helpful error messages for common mistakes.
 */
const validateSchema = (schema: unknown, functionName: string): void => {
  if (!schema || typeof schema !== "object") {
    throw new TypeError(
      `${functionName}: Schema must be a Zod schema object, got ${typeof schema}`,
    );
  }
  if (typeof (schema as any).parse !== "function") {
    throw new TypeError(
      `${functionName}: Schema must have a 'parse' method (Zod schema required)`,
    );
  }
  if (typeof (schema as any).safeParse !== "function") {
    throw new TypeError(
      `${functionName}: Invalid Zod schema (missing 'safeParse' method)`,
    );
  }
};

/**
 * Validates that a mapper function parameter is actually a function.
 */
const validateMapper = (
  mapper: unknown,
  functionName: string,
  parameterName: string = "errorMapper",
): void => {
  if (typeof mapper !== "function") {
    throw new TypeError(
      `${functionName}: ${parameterName} must be a function, got ${typeof mapper}`,
    );
  }
};

/**
 * Validates that a JSON string parameter is a string.
 */
const validateJsonString = (
  jsonString: unknown,
  functionName: string,
): void => {
  if (typeof jsonString !== "string") {
    throw new TypeError(
      `${functionName}: First argument must be a JSON string, got ${typeof jsonString}`,
    );
  }
};

// =============================================================================
// VALIDATION OPERATIONS (Individual Exports)
// =============================================================================

/**
 * Validates data against a Zod schema and returns a Result.
 * Provides overloaded signatures for optimal type inference when error types are constrained.
 * Includes runtime validation for better developer experience.
 *
 * @example
 * ```typescript
 * // User validation with structured error handling
 * const UserSchema = z.object({
 *   id: z.number(),
 *   name: z.string(),
 *   email: z.string().email()
 * });
 *
 * const userResult = validate(userData, UserSchema);
 * // Returns: Result<User, string> → Ok(validUser) or Err("Validation failed: ...")
 *
 * // API request validation with consistent error format
 * const requestResult: Result<ApiRequest, string> = validate(requestBody, ApiRequestSchema);
 * if (isErr(requestResult)) {
 *   return res.status(400).json({ error: requestResult.error });
 * }
 *
 * // Type safety: validated data is properly typed
 * const user = requestResult.value; // TypeScript knows this is ApiRequest
 * ```
 *
 * @param data - Data to validate against the schema
 * @param schema - Zod schema to validate against
 * @returns Result containing validated data or validation error string
 * @throws TypeError if schema is not a valid Zod schema
 * @see {@link validateWith} for custom error mapping
 * @see {@link validateAsync} for async schema validation
 * @see {@link parseJson} for JSON parsing with validation
 */
export function validate<T, E extends string = string>(
  data: unknown,
  schema: z.ZodType<T>,
): Result<T, E>;
export function validate<T>(
  data: unknown,
  schema: z.ZodType<T>,
): Result<T, string>;
export function validate<T>(
  data: unknown,
  schema: z.ZodType<T>,
): Result<T, string> {
  validateSchema(schema, "validate()");

  const result = schema.safeParse(data);
  return result.success
    ? { type: OK, value: result.data }
    : { type: ERR, error: `Validation failed: ${result.error.message}` };
}

/**
 * Validates data against an async Zod schema and returns a Promise<Result>.
 * Provides overloaded signatures for optimal type inference when error types are constrained.
 * Includes runtime validation for better developer experience.
 *
 * @example
 * ```typescript
 * // Async email validation with external service
 * const AsyncEmailSchema = z.string().email().refine(async (email) => {
 *   const exists = await checkEmailExists(email);
 *   return !exists;
 * }, "Email already exists");
 *
 * const emailResult = await validateAsync(email, AsyncEmailSchema);
 * // Returns: Promise<Result<string, string>> → Ok(validEmail) or Err("Email already exists")
 *
 * // API validation with async database checks
 * const userResult = await validateAsync(userData, UserSchemaWithAsyncValidation);
 * if (isErr(userResult)) {
 *   console.log("Async validation failed:", userResult.error);
 * }
 *
 * // File upload validation with async virus scanning
 * const FileUploadSchema = z.object({
 *   filename: z.string(),
 *   content: z.string().refine(async (content) => {
 *     return await virusScan(content);
 *   }, "File contains malware")
 * });
 * const uploadResult = await validateAsync(uploadData, FileUploadSchema);
 * ```
 *
 * @param data - Data to validate against the async schema
 * @param schema - Zod schema with async validation rules
 * @returns Promise of Result containing validated data or validation error string
 * @throws TypeError if schema is not a valid Zod schema
 * @see {@link validate} for synchronous validation
 * @see {@link validateWithAsync} for custom async error mapping
 */
export function validateAsync<T, E extends string = string>(
  data: unknown,
  schema: z.ZodType<T>,
): Promise<Result<T, E>>;
export function validateAsync<T>(
  data: unknown,
  schema: z.ZodType<T>,
): Promise<Result<T, string>>;
export async function validateAsync<T>(
  data: unknown,
  schema: z.ZodType<T>,
): Promise<Result<T, string>> {
  validateSchema(schema, "validateAsync()");

  const result = await schema.safeParseAsync(data);
  return result.success
    ? { type: OK, value: result.data }
    : { type: ERR, error: `Validation failed: ${result.error.message}` };
}

/**
 * Validates data with custom error mapping for structured error handling.
 * Constrains error types to ensure meaningful custom error structure.
 * Includes runtime validation for better developer experience.
 *
 * @example
 * ```typescript
 * // API validation with structured error response
 * const apiErrorMapper = (zodError: z.ZodError): ApiValidationError => ({
 *   code: "VALIDATION_ERROR",
 *   message: "Request validation failed",
 *   fields: zodError.issues.map(issue => ({
 *     field: issue.path.join("."),
 *     message: issue.message,
 *     code: issue.code
 *   })),
 *   timestamp: Date.now()
 * });
 *
 * const result = validateWith(requestData, RequestSchema, apiErrorMapper);
 * // Returns: Result<RequestData, ApiValidationError>
 * // Type safety: error has .code, .message, .fields, .timestamp properties
 *
 * if (isErr(result)) {
 *   logValidationFailure(result.error.code, result.error.fields);
 *   return res.status(400).json(result.error);
 * }
 *
 * // Form validation with user-friendly errors
 * const formErrorMapper = (zodError: z.ZodError) => ({
 *   type: "FORM_ERROR" as const,
 *   firstError: zodError.issues[0]?.message || "Invalid input",
 *   fieldCount: zodError.issues.length,
 *   severity: "high" as const
 * });
 *
 * const formResult = validateWith(formData, ContactFormSchema, formErrorMapper);
 * // Type safety ensures error has .type, .firstError, .fieldCount, .severity
 *
 * // Database error mapping with structured information
 * const dbErrorMapper = (zodError: z.ZodError) => new ValidationError({
 *   operation: "user_validation",
 *   table: "users",
 *   fields: zodError.issues.map(i => i.path.join(".")),
 *   originalError: zodError
 * });
 * ```
 *
 * @param data - Data to validate against the schema
 * @param schema - Zod schema to validate against
 * @param errorMapper - Function to transform ZodError into custom error type (constrained to meaningful types)
 * @returns Result containing validated data or custom error
 * @throws TypeError if schema is not valid or errorMapper is not a function
 * @see {@link validate} for basic string error validation
 * @see {@link validateWithAsync} for async version with custom errors
 */
export function validateWith<
  T,
  E extends Record<string, unknown> | string | Error,
>(
  data: unknown,
  schema: z.ZodType<T>,
  errorMapper: (zodError: z.ZodError) => E,
): Result<T, E>;
export function validateWith<T, E>(
  data: unknown,
  schema: z.ZodType<T>,
  errorMapper: (zodError: z.ZodError) => E,
): Result<T, E>;
export function validateWith<T, E>(
  data: unknown,
  schema: z.ZodType<T>,
  errorMapper: (zodError: z.ZodError) => E,
): Result<T, E> {
  validateSchema(schema, "validateWith()");
  validateMapper(errorMapper, "validateWith()");

  const result = schema.safeParse(data);
  return result.success
    ? { type: OK, value: result.data }
    : { type: ERR, error: errorMapper(result.error) };
}

/**
 * Validates data asynchronously with custom error mapping.
 * Combines async validation capabilities with application-specific error handling.
 * Constrains error types to ensure meaningful custom error structure.
 * Includes runtime validation for better developer experience.
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
 *     operation: "user_registration",
 *     validationErrors: zodError.issues.map(issue => ({
 *       field: issue.path.join('.'),
 *       message: issue.message,
 *       severity: issue.code === 'invalid_email' ? 'high' : 'medium',
 *       code: issue.code
 *     }))
 *   })
 * );
 * // Returns: Promise<Result<User, CustomErrorReport>>
 * // Type safety ensures error has .timestamp, .requestId, .operation, .validationErrors
 *
 * // File processing with async validation and structured error reporting
 * const FileProcessingSchema = z.object({
 *   filename: z.string(),
 *   content: z.string().refine(async (content) => {
 *     const scanResult = await advancedVirusScan(content);
 *     return scanResult.clean;
 *   }, "File failed security scan")
 * });
 *
 * const fileResult = await validateWithAsync(
 *   fileData,
 *   FileProcessingSchema,
 *   (zodError) => new FileValidationError({
 *     filename: fileData.filename,
 *     reason: zodError.issues[0]?.message || "Unknown validation error",
 *     scanId: generateScanId(),
 *     quarantined: true
 *   })
 * );
 * // Type safety ensures error is FileValidationError with proper structure
 * ```
 *
 * @param data - Data to validate against the schema
 * @param schema - Zod schema to validate against
 * @param errorMapper - Function to transform ZodError into custom error type (constrained to meaningful types)
 * @returns Promise of Result containing validated data or custom mapped error
 * @throws TypeError if schema is not valid or errorMapper is not a function
 * @see {@link validateWith} for synchronous version with custom error mapping
 * @see {@link validateAsync} for async validation with standard error messages
 */
export function validateWithAsync<
  T,
  E extends Record<string, unknown> | string | Error,
>(
  data: unknown,
  schema: z.ZodType<T>,
  errorMapper: (zodError: z.ZodError) => E,
): Promise<Result<T, E>>;
export function validateWithAsync<T, E>(
  data: unknown,
  schema: z.ZodType<T>,
  errorMapper: (zodError: z.ZodError) => E,
): Promise<Result<T, E>>;
export async function validateWithAsync<T, E>(
  data: unknown,
  schema: z.ZodType<T>,
  errorMapper: (zodError: z.ZodError) => E,
): Promise<Result<T, E>> {
  validateSchema(schema, "validateWithAsync()");
  validateMapper(errorMapper, "validateWithAsync()");

  const result = await schema.safeParseAsync(data);
  return result.success
    ? { type: OK, value: result.data }
    : { type: ERR, error: errorMapper(result.error) };
}

// =============================================================================
// SCHEMA BUILDERS (Individual Exports)
// =============================================================================

/**
 * Creates a Zod schema for validating Result types.
 * Useful for API responses that return Result objects or deserializing Results.
 * Includes runtime validation for better developer experience.
 *
 * @example
 * ```typescript
 * // API response validation with structured error types
 * const UserResultSchema = resultSchema(
 *   z.object({ id: z.number(), name: z.string(), email: z.string() }),
 *   z.object({ code: z.string(), message: z.string(), timestamp: z.number() })
 * );
 *
 * const apiResponse = { type: "Ok", value: { id: 1, name: "John", email: "john@example.com" } };
 * const validated = UserResultSchema.parse(apiResponse);
 * // Returns: Result<User, ApiError> with validated structure
 *
 * // Webhook payload validation with detailed error tracking
 * const WebhookResultSchema = resultSchema(
 *   z.object({ event: z.string(), data: z.any() }),
 *   z.object({ errorCode: z.string(), details: z.string() })
 * );
 * const webhookResult = WebhookResultSchema.parse(webhookPayload);
 *
 * // Database query result validation
 * const QueryResultSchema = resultSchema(
 *   z.array(z.object({ id: z.number(), data: z.string() })),
 *   z.object({ sqlState: z.string(), errorMessage: z.string(), query: z.string() })
 * );
 * ```
 *
 * @param valueSchema - Schema for the success value type
 * @param errorSchema - Schema for the error type
 * @returns Zod schema that validates Result<T, E> objects
 * @throws TypeError if schemas are not valid Zod schemas
 * @see {@link stringErrorSchema} for Results with string errors
 * @see {@link structuredErrorSchema} for Results with structured error objects
 * @see {@link parseResult} for parsing JSON strings containing Result objects
 */
export const resultSchema = <T, E>(
  valueSchema: z.ZodType<T>,
  errorSchema: z.ZodType<E>,
) => {
  validateSchema(valueSchema, "resultSchema()");
  validateSchema(errorSchema, "resultSchema()");

  return z.discriminatedUnion("type", [
    z.object({ type: z.literal(OK), value: valueSchema }),
    z.object({ type: z.literal(ERR), error: errorSchema }),
  ]);
};

/**
 * Creates a Result schema with string error type.
 * Convenience function for the common case of string errors.
 * Includes runtime validation for better developer experience.
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
 *
 * // Form submission results
 * const FormResultSchema = stringErrorSchema(
 *   z.object({ submissionId: z.string(), timestamp: z.number() })
 * );
 * ```
 *
 * @param valueSchema - Schema for the success value type
 * @returns Zod schema that validates Result<T, string> objects
 * @throws TypeError if valueSchema is not a valid Zod schema
 * @see {@link resultSchema} for custom error types
 * @see {@link structuredErrorSchema} for structured error objects
 */
export const stringErrorSchema = <T>(valueSchema: z.ZodType<T>) => {
  validateSchema(valueSchema, "stringErrorSchema()");
  return resultSchema(valueSchema, z.string());
};

/**
 * Creates a Result schema with number error type.
 * Useful for HTTP status codes or numeric error codes.
 * Includes runtime validation for better developer experience.
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
 *
 * // System error codes
 * const ProcessResultSchema = numberErrorSchema(
 *   z.object({ output: z.string(), exitCode: z.number() })
 * );
 * ```
 *
 * @param valueSchema - Schema for the success value type
 * @returns Zod schema that validates Result<T, number> objects
 * @throws TypeError if valueSchema is not a valid Zod schema
 * @see {@link resultSchema} for custom error types
 * @see {@link stringErrorSchema} for string error messages
 */
export const numberErrorSchema = <T>(valueSchema: z.ZodType<T>) => {
  validateSchema(valueSchema, "numberErrorSchema()");
  return resultSchema(valueSchema, z.number());
};

/**
 * Creates a Result schema with structured error object.
 * Ideal for rich error information with codes, messages, and metadata.
 * Includes runtime validation for better developer experience.
 *
 * @example
 * ```typescript
 * // Rich error information for API responses
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
 *
 * // Database operation results with detailed error info
 * const DatabaseResultSchema = structuredErrorSchema(
 *   z.array(z.object({ id: z.number(), data: z.string() }))
 * );
 * // Validates: Result<DatabaseRow[], { message: string, code?: number }>
 * ```
 *
 * @param valueSchema - Schema for the success value type
 * @returns Zod schema that validates Result<T, StructuredError> objects
 * @throws TypeError if valueSchema is not a valid Zod schema
 * @see {@link resultSchema} for fully custom error schemas
 */
export const structuredErrorSchema = <T>(valueSchema: z.ZodType<T>) => {
  validateSchema(valueSchema, "structuredErrorSchema()");
  return resultSchema(
    valueSchema,
    z.object({
      message: z.string(),
      code: z.number().optional(),
    }),
  );
};

// =============================================================================
// JSON PARSING (Individual Exports)
// =============================================================================

/**
 * Parses JSON string and validates against schema, returning a Result.
 * Essential for safe API response processing and configuration file parsing.
 * Includes runtime validation for better developer experience.
 *
 * @example
 * ```typescript
 * // API response processing with structured validation
 * const UserSchema = z.object({
 *   id: z.number(),
 *   name: z.string(),
 *   email: z.string().email(),
 *   roles: z.array(z.string())
 * });
 * const apiResponse = '{"id": 1, "name": "John", "email": "john@example.com", "roles": ["user"]}';
 * const userResult = parseJson(apiResponse, UserSchema);
 * // Returns: Result<User, string> → Ok(user) or Err("Invalid JSON: ..." | "Validation failed: ...")
 *
 * // Configuration file parsing with defaults
 * const ConfigSchema = z.object({
 *   apiUrl: z.string().url(),
 *   timeout: z.number().positive().default(5000),
 *   retries: z.number().min(0).max(5).default(3),
 *   features: z.object({
 *     enableCache: z.boolean().default(true),
 *     debugMode: z.boolean().default(false)
 *   })
 * });
 * const configResult = parseJson(configFileContent, ConfigSchema);
 *
 * // Webhook payload validation with comprehensive error handling
 * const WebhookPayloadSchema = z.object({
 *   event: z.enum(["user.created", "user.updated", "user.deleted"]),
 *   data: z.object({
 *     userId: z.string().uuid(),
 *     timestamp: z.string().datetime()
 *   }),
 *   signature: z.string()
 * });
 * const webhookResult = parseJson(requestBody, WebhookPayloadSchema);
 * if (isOk(webhookResult)) {
 *   await processWebhook(webhookResult.value);
 * } else {
 *   logWebhookError(webhookResult.error);
 * }
 * ```
 *
 * @param jsonString - The JSON string to parse
 * @param schema - The Zod schema to validate the parsed data against
 * @returns Result containing validated parsed data or error message
 * @throws TypeError if jsonString is not a string or schema is not valid
 * @see {@link parseJsonAsync} for async validation with refinements
 * @see {@link validate} for validating already-parsed data
 * @see {@link parseResult} for parsing JSON containing Result objects
 */
export const parseJson = <T>(
  jsonString: string,
  schema: z.ZodType<T>,
): Result<T, string> => {
  validateJsonString(jsonString, "parseJson()");
  validateSchema(schema, "parseJson()");

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
 * Includes runtime validation for better developer experience.
 *
 * @example
 * ```typescript
 * // User registration with async email validation
 * const RegistrationSchema = z.object({
 *   email: z.string().email().refine(async (email) => {
 *     const exists = await checkEmailInDatabase(email);
 *     return !exists;
 *   }, "Email already registered"),
 *   username: z.string().min(3).refine(async (username) => {
 *     return await isUsernameAvailable(username);
 *   }, "Username already taken"),
 *   password: z.string().min(8)
 * });
 *
 * const registrationData = '{"email": "user@example.com", "username": "newuser", "password": "securepass123"}';
 * const result = await parseJsonAsync(registrationData, RegistrationSchema);
 * // Returns: Promise<Result<RegistrationData, string>>
 *
 * // File upload with async virus scanning validation
 * const FileUploadSchema = z.object({
 *   filename: z.string(),
 *   mimeType: z.string(),
 *   content: z.string().refine(async (content) => {
 *     const scanResult = await virusScanService.scan(content);
 *     return scanResult.clean;
 *   }, "File contains malicious content"),
 *   metadata: z.object({
 *     size: z.number().positive(),
 *     checksum: z.string()
 *   })
 * });
 * const uploadResult = await parseJsonAsync(uploadMetadata, FileUploadSchema);
 *
 * // External API validation with rate limiting
 * const ExternalApiSchema = z.object({
 *   apiKey: z.string().refine(async (key) => {
 *     return await validateApiKeyWithProvider(key);
 *   }, "Invalid API key"),
 *   endpoint: z.string().url()
 * });
 * ```
 *
 * @param jsonString - The JSON string to parse
 * @param schema - The Zod schema to validate the parsed data against
 * @returns Promise of Result containing validated parsed data or error message
 * @throws TypeError if jsonString is not a string or schema is not valid
 * @see {@link parseJson} for synchronous parsing and validation
 * @see {@link validateAsync} for validating already-parsed data asynchronously
 */
export const parseJsonAsync = async <T>(
  jsonString: string,
  schema: z.ZodType<T>,
): Promise<Result<T, string>> => {
  validateJsonString(jsonString, "parseJsonAsync()");
  validateSchema(schema, "parseJsonAsync()");

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
 * Includes comprehensive runtime validation for better developer experience.
 *
 * @example
 * ```typescript
 * // API endpoint that returns Result objects with structured errors
 * const apiResponseJson = '{"type": "Ok", "value": {"id": 1, "name": "John", "email": "john@example.com"}}';
 * const userResult = parseResult(
 *   apiResponseJson,
 *   z.object({ id: z.number(), name: z.string(), email: z.string() }),
 *   z.object({ code: z.string(), message: z.string(), timestamp: z.number() })
 * );
 * // Returns: Result<Result<User, ApiError>, string>
 *
 * // Cache deserialization with error recovery
 * const cachedResult = parseResult(
 *   cacheData,
 *   UserSchema,
 *   z.string()
 * );
 * if (isOk(cachedResult) && isOk(cachedResult.value)) {
 *   const user = cachedResult.value.value; // Validated user data
 * } else if (isOk(cachedResult) && isErr(cachedResult.value)) {
 *   console.log("Cached error:", cachedResult.value.error);
 * }
 *
 * // Database operation result deserialization
 * const dbOperationJson = '{"type": "Err", "error": {"sqlState": "23505", "message": "Duplicate key", "table": "users"}}';
 * const dbResult = parseResult(
 *   dbOperationJson,
 *   z.array(z.object({ id: z.number(), name: z.string() })),
 *   z.object({ sqlState: z.string(), message: z.string(), table: z.string() })
 * );
 *
 * // Microservice communication with Result serialization
 * const ServiceResponseSchema = resultSchema(
 *   z.object({ data: z.any(), processedAt: z.string() }),
 *   z.object({ service: z.string(), errorCode: z.string(), details: z.string() })
 * );
 * ```
 *
 * @param jsonString - JSON string containing a Result object
 * @param valueSchema - Schema for the success value type
 * @param errorSchema - Schema for the error type
 * @returns Result containing validated Result object or error message
 * @throws TypeError if parameters are not valid
 * @see {@link parseResultAsync} for async validation of Result objects
 * @see {@link resultSchema} for creating schemas that validate Result structure
 * @see {@link parseJson} for parsing JSON without Result structure
 */
export const parseResult = <T, E>(
  jsonString: string,
  valueSchema: z.ZodType<T>,
  errorSchema: z.ZodType<E>,
): Result<Result<T, E>, string> => {
  validateJsonString(jsonString, "parseResult()");
  validateSchema(valueSchema, "parseResult()");
  validateSchema(errorSchema, "parseResult()");

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
 * Includes comprehensive runtime validation for better developer experience.
 *
 * @example
 * ```typescript
 * // Deserialize Result with async validation for stored user data
 * const AsyncUserSchema = z.object({
 *   email: z.string().email().refine(async (email) => {
 *     // Validate email still exists in external system
 *     return await verifyEmailWithProvider(email);
 *   }, "Email no longer valid"),
 *   permissions: z.array(z.string()).refine(async (permissions) => {
 *     // Validate permissions against current RBAC system
 *     return await validatePermissions(permissions);
 *   }, "Permissions outdated")
 * });
 *
 * const asyncResult = await parseResultAsync(
 *   storedResultJson,
 *   AsyncUserSchema,
 *   z.object({ code: z.string(), message: z.string() })
 * );
 * // Returns: Promise<Result<Result<User, ErrorObject>, string>>
 *
 * // Complex validation scenarios with external service checks
 * const FileMetadataSchema = z.object({
 *   filename: z.string(),
 *   hash: z.string().refine(async (hash) => {
 *     // Verify file integrity with external service
 *     return await verifyFileIntegrity(hash);
 *   }, "File integrity check failed"),
 *   permissions: z.object({
 *     owner: z.string().refine(async (owner) => {
 *       return await userExists(owner);
 *     }, "Owner no longer exists")
 *   })
 * });
 *
 * const validatedResult = await parseResultAsync(
 *   storedFileResultJson,
 *   FileMetadataSchema,
 *   z.object({ operation: z.string(), reason: z.string(), timestamp: z.number() })
 * );
 *
 * // Microservice result deserialization with async business rule validation
 * const BusinessRuleSchema = z.object({
 *   customerId: z.string().refine(async (id) => {
 *     return await customerService.isActive(id);
 *   }, "Customer account inactive"),
 *   amount: z.number().refine(async (amount) => {
 *     return await fraudService.validateAmount(amount);
 *   }, "Amount flagged for fraud review")
 * });
 * ```
 *
 * @param jsonString - JSON string containing a Result object
 * @param valueSchema - Schema for the success value type
 * @param errorSchema - Schema for the error type
 * @returns Promise of Result containing validated Result object or error message
 * @throws TypeError if parameters are not valid
 * @see {@link parseResult} for synchronous validation of Result objects
 * @see {@link parseJsonAsync} for async JSON parsing without Result structure
 * @see {@link resultSchema} for creating schemas that validate Result structure
 */
export const parseResultAsync = async <T, E>(
  jsonString: string,
  valueSchema: z.ZodType<T>,
  errorSchema: z.ZodType<E>,
): Promise<Result<Result<T, E>, string>> => {
  validateJsonString(jsonString, "parseResultAsync()");
  validateSchema(valueSchema, "parseResultAsync()");
  validateSchema(errorSchema, "parseResultAsync()");

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
 * This entry point includes core essentials + Zod validation integration.
 *
 * Use for: runtime validation, JSON parsing, API data validation, form processing
 *
 * Key functions: validate(), parseJson(), resultSchema(), validateAsync()
 *
 * Generic constraints ensure type safety:
 * - Error types constrained to meaningful types (Record<string, unknown> | string | Error)
 * - Overloaded signatures provide optimal type inference with constraints
 * - Backward compatibility maintained with unconstrained overloads
 * - Better IntelliSense and error messages during development
 *
 * Common patterns:
 * - **API validation**: parseJson() for request bodies with structured error responses
 * - **Form processing**: validateWith() with custom error mapping for user-friendly messages
 * - **Configuration**: parseJson() for config files with comprehensive validation
 * - **Async validation**: validateAsync() for database uniqueness checks, external API validation
 * - **Result serialization**: parseResult() for deserializing stored Result objects with validation
 * - **Microservices**: resultSchema() for validating inter-service Result communication
 *
 * Performance characteristics:
 * - Uses Zod's safeParse for non-throwing validation
 * - Comprehensive runtime validation prevents common developer errors
 * - Structured error messages aid debugging
 *
 * Requires: Zod as peer dependency (^3.25.67)
 *
 * Other available layers:
 * - `result-ts` → core essentials only
 * - `result-ts/iter` → core + data transformation
 * - `result-ts/batch` → core + array processing
 * - `result-ts/utils` → core + debugging utilities
 * - `result-ts/patterns` → core + advanced patterns
 */
