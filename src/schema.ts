// result-ts/schema - Core essentials + Zod validation integration
// Provides runtime validation and JSON parsing with Result types

// Re-export all core essentials from core module
export * from "@/core";

import { z } from "zod"; // Fixed: Removed 'type' keyword for runtime usage
// Import types and constants for schema implementations
import { ERR, OK, type Result } from "@/types";

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
	// biome-ignore lint/suspicious/noExplicitAny: Required for Zod schema validation
	if (typeof (schema as any).parse !== "function") {
		throw new TypeError(
			`${functionName}: Schema must have a 'parse' method (Zod schema required)`,
		);
	}
	// biome-ignore lint/suspicious/noExplicitAny: Required for Zod schema validation
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
 * // Basic validation with string errors
 * const UserSchema = z.object({
 *   id: z.number(),
 *   name: z.string().min(1),
 *   email: z.string().email()
 * });
 *
 * const validUser = validate({
 *   id: 1,
 *   name: "John Doe",
 *   email: "john@example.com"
 * }, UserSchema);
 * // Returns: Result<User, string> → Ok({id: 1, name: "John Doe", email: "john@example.com"})
 *
 * const invalidUser = validate({
 *   id: "not-a-number",
 *   name: "",
 *   email: "invalid-email"
 * }, UserSchema);
 * // Returns: Result<User, string> → Err("Validation failed: Expected number, received string")
 *
 * // API request validation
 * const CreatePostSchema = z.object({
 *   title: z.string().min(5),
 *   content: z.string().min(10),
 *   tags: z.array(z.string()).optional()
 * });
 *
 * const postResult = validate(requestBody, CreatePostSchema);
 * if (isOk(postResult)) {
 *   const post = await createPost(postResult.value);
 *   return res.json(post);
 * } else {
 *   return res.status(400).json({ error: postResult.error });
 * }
 * ```
 *
 * @param data - Data to validate against the schema
 * @param schema - Zod schema to validate against
 * @returns Result containing validated data or validation error message
 * @throws TypeError if schema is not a valid Zod schema
 * @see {@link validateWith} for custom error mapping
 * @see {@link validateAsync} for asynchronous validation
 */
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
 * Validates data asynchronously against a Zod schema and returns a Result.
 * Essential for schemas with async refinements or transformations.
 * Includes runtime validation for better developer experience.
 *
 * @example
 * ```typescript
 * // Async validation with database checks
 * const UserRegistrationSchema = z.object({
 *   username: z.string().min(3).refine(async (username) => {
 *     const exists = await checkUsernameExists(username);
 *     return !exists;
 *   }, "Username already taken"),
 *   email: z.string().email().refine(async (email) => {
 *     const domain = await validateEmailDomain(email);
 *     return domain.isValid;
 *   }, "Invalid email domain"),
 *   password: z.string().min(8)
 * });
 *
 * const registrationResult = await validateAsync(userData, UserRegistrationSchema);
 * // Returns: Promise<Result<UserData, string>>
 *
 * if (isOk(registrationResult)) {
 *   const user = await createUser(registrationResult.value);
 *   sendWelcomeEmail(user.email);
 * } else {
 *   logValidationError("registration_failed", registrationResult.error);
 * }
 *
 * // File processing with async validation
 * const FileUploadSchema = z.object({
 *   filename: z.string(),
 *   content: z.string().refine(async (content) => {
 *     const scanResult = await virusScan(content);
 *     return scanResult.clean;
 *   }, "File failed security scan"),
 *   size: z.number().max(10485760) // 10MB
 * });
 *
 * const fileResult = await validateAsync(uploadData, FileUploadSchema);
 * ```
 *
 * @param data - Data to validate against the schema
 * @param schema - Zod schema to validate against
 * @returns Promise of Result containing validated data or validation error message
 * @throws TypeError if schema is not a valid Zod schema
 * @see {@link validate} for synchronous validation
 * @see {@link validateWithAsync} for async validation with custom error mapping
 */
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
 * Validates data with custom error mapping.
 * Combines Zod validation with application-specific error handling.
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
// JSON PARSING OPERATIONS (Individual Exports)
// =============================================================================

/**
 * Parses JSON and validates the result with a Zod schema.
 * Combines JSON parsing with validation in a single Result operation.
 * Includes runtime validation for better developer experience.
 *
 * @example
 * ```typescript
 * // API request body parsing
 * const CreateUserSchema = z.object({
 *   name: z.string().min(1),
 *   email: z.string().email(),
 *   role: z.enum(["admin", "user"])
 * });
 *
 * const userResult = parseJson(requestBody, CreateUserSchema);
 * // Returns: Result<CreateUserData, string>
 * // Handles both JSON parsing errors and validation errors
 *
 * if (isOk(userResult)) {
 *   const user = await createUser(userResult.value);
 *   return res.json(user);
 * } else {
 *   return res.status(400).json({ error: userResult.error });
 * }
 *
 * // Configuration file parsing
 * const ConfigSchema = z.object({
 *   database: z.object({
 *     host: z.string(),
 *     port: z.number(),
 *     name: z.string()
 *   }),
 *   redis: z.object({
 *     url: z.string().url()
 *   }),
 *   features: z.array(z.string()).optional()
 * });
 *
 * const config = parseJson(configFileContent, ConfigSchema);
 * if (isErr(config)) {
 *   console.error("Invalid config:", config.error);
 *   process.exit(1);
 * }
 * ```
 *
 * @param jsonString - JSON string to parse and validate
 * @param schema - Zod schema to validate the parsed data against
 * @returns Result containing validated parsed data or error message
 * @throws TypeError if jsonString is not a string or schema is not valid
 * @see {@link parseJsonAsync} for async version with async schemas
 * @see {@link parseResult} for parsing JSON strings containing Result objects
 */
export function parseJson<T>(
	jsonString: string,
	schema: z.ZodType<T>,
): Result<T, string> {
	validateJsonString(jsonString, "parseJson()");
	validateSchema(schema, "parseJson()");

	try {
		const parsed = JSON.parse(jsonString);
		const validationResult = schema.safeParse(parsed);
		return validationResult.success
			? { type: OK, value: validationResult.data }
			: {
					type: ERR,
					error: `Validation failed: ${validationResult.error.message}`,
				};
	} catch (error) {
		return {
			type: ERR,
			error: `Invalid JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
		};
	}
}

/**
 * Parses JSON asynchronously and validates with a Zod schema.
 * Essential for schemas with async refinements.
 * Includes runtime validation for better developer experience.
 *
 * @example
 * ```typescript
 * // Webhook payload validation with async checks
 * const WebhookSchema = z.object({
 *   event: z.string(),
 *   timestamp: z.number(),
 *   signature: z.string().refine(async (sig) => {
 *     return await verifyWebhookSignature(sig);
 *   }, "Invalid webhook signature"),
 *   data: z.any()
 * });
 *
 * const webhookResult = await parseJsonAsync(payloadString, WebhookSchema);
 * if (isOk(webhookResult)) {
 *   await processWebhookEvent(webhookResult.value);
 * } else {
 *   logWebhookError("invalid_payload", webhookResult.error);
 * }
 * ```
 *
 * @param jsonString - JSON string to parse and validate
 * @param schema - Zod schema to validate the parsed data against
 * @returns Promise of Result containing validated parsed data or error message
 * @throws TypeError if jsonString is not a string or schema is not valid
 * @see {@link parseJson} for synchronous version
 * @see {@link parseResultAsync} for parsing JSON strings containing Result objects
 */
export async function parseJsonAsync<T>(
	jsonString: string,
	schema: z.ZodType<T>,
): Promise<Result<T, string>> {
	validateJsonString(jsonString, "parseJsonAsync()");
	validateSchema(schema, "parseJsonAsync()");

	try {
		const parsed = JSON.parse(jsonString);
		const validationResult = await schema.safeParseAsync(parsed);
		return validationResult.success
			? { type: OK, value: validationResult.data }
			: {
					type: ERR,
					error: `Validation failed: ${validationResult.error.message}`,
				};
	} catch (error) {
		return {
			type: ERR,
			error: `Invalid JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
		};
	}
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
 * const response = {
 *   type: "Err",
 *   error: { message: "User validation failed", code: 400 }
 * };
 * const validated = UserResultSchema.parse(response);
 *
 * // Microservice communication with detailed error context
 * const ServiceCallSchema = structuredErrorSchema(
 *   z.object({ data: z.any(), requestId: z.string() })
 * );
 * ```
 *
 * @param valueSchema - Schema for the success value type
 * @returns Zod schema that validates Result<T, {message: string, code?: number}> objects
 * @throws TypeError if valueSchema is not a valid Zod schema
 * @see {@link resultSchema} for custom error types
 * @see {@link stringErrorSchema} for simple string errors
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
// RESULT PARSING OPERATIONS (Individual Exports)
// =============================================================================

/**
 * Parses a JSON string containing a Result object and validates both structure and data.
 * Useful for deserializing Result objects from APIs or storage.
 * Includes runtime validation for better developer experience.
 *
 * @example
 * ```typescript
 * // Deserialize API responses containing Result objects
 * const userResultJson = '{"type": "Ok", "value": {"id": 1, "name": "John"}}';
 * const UserSchema = z.object({ id: z.number(), name: z.string() });
 *
 * const result = parseResult(userResultJson, UserSchema, z.string());
 * // Returns: Result<Result<User, string>, string>
 *
 * if (isOk(result)) {
 *   const innerResult = result.value; // This is the parsed Result<User, string>
 *   if (isOk(innerResult)) {
 *     console.log("User:", innerResult.value);
 *   }
 * }
 *
 * // Deserialize stored computation results
 * const ComputationSchema = z.object({
 *   result: z.number(),
 *   duration: z.number(),
 *   timestamp: z.number()
 * });
 * const ErrorSchema = z.object({
 *   code: z.string(),
 *   message: z.string()
 * });
 *
 * const stored = parseResult(storedJson, ComputationSchema, ErrorSchema);
 * ```
 *
 * @param jsonString - JSON string containing a Result object
 * @param valueSchema - Schema for the success value type
 * @param errorSchema - Schema for the error type
 * @returns Result containing validated Result object or error message
 * @throws TypeError if parameters are invalid
 * @see {@link parseResultAsync} for async version
 * @see {@link parseJson} for parsing regular JSON with validation
 */
export function parseResult<T, E>(
	jsonString: string,
	valueSchema: z.ZodType<T>,
	errorSchema: z.ZodType<E>,
): Result<Result<T, E>, string> {
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
}

/**
 * Parses a JSON string containing a Result object with async validation.
 * Useful for deserializing Result objects with schemas that have async refinements.
 * Includes runtime validation for better developer experience.
 *
 * @example
 * ```typescript
 * // Deserialize API responses with async validation
 * const UserSchema = z.object({
 *   id: z.number(),
 *   email: z.string().email().refine(async (email) => {
 *     return await validateEmailDomain(email);
 *   }, "Invalid email domain")
 * });
 *
 * const result = await parseResultAsync(
 *   storedUserResultJson,
 *   UserSchema,
 *   z.string()
 * );
 * ```
 *
 * @param jsonString - JSON string containing a Result object
 * @param valueSchema - Schema for the success value type
 * @param errorSchema - Schema for the error type
 * @returns Promise of Result containing validated Result object or error message
 * @throws TypeError if parameters are invalid
 * @see {@link parseResult} for synchronous version
 * @see {@link parseJsonAsync} for parsing regular JSON with async validation
 */
export async function parseResultAsync<T, E>(
	jsonString: string,
	valueSchema: z.ZodType<T>,
	errorSchema: z.ZodType<E>,
): Promise<Result<Result<T, E>, string>> {
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
}

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
