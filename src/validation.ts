import { z } from "zod";
import { ok, err, type Result } from "@/base";

// Use the same string literals as base.ts
const OK_VALUE = "Ok" as const;
const ERR_VALUE = "Err" as const;

// =============================================================================
// CORE VALIDATION (Individual Exports)
// =============================================================================

/**
 * Validates data against a Zod schema and returns a Result.
 * 
 * @example
 * ```typescript
 * const userSchema = z.object({
 *   name: z.string(),
 *   age: z.number()
 * });
 * 
 * const result = validate({ name: "John", age: 30 }, userSchema);
 * // Returns: Ok({ name: "John", age: 30 })
 * 
 * const invalid = validate({ name: "John" }, userSchema);
 * // Returns: Err("Validation failed: ...")
 * ```
 * 
 * @param data - The data to validate
 * @param schema - The Zod schema to validate against
 * @returns Result containing validated data or validation error message
 */
export const validate = <T>(data: unknown, schema: z.ZodType<T>): Result<T, string> => {
  const result = schema.safeParse(data);
  return result.success
    ? ok(result.data)
    : err(`Validation failed: ${result.error.message}`);
};

/**
 * Validates data against a Zod schema asynchronously and returns a Result.
 * 
 * @example
 * ```typescript
 * const userSchema = z.object({
 *   email: z.string().email().refine(async (email) => {
 *     return await checkEmailExists(email);
 *   })
 * });
 * 
 * const result = await validateAsync(userData, userSchema);
 * // Returns: Ok(validatedData) or Err("Validation failed: ...")
 * ```
 * 
 * @param data - The data to validate
 * @param schema - The Zod schema to validate against
 * @returns Promise of Result containing validated data or validation error message
 */
export const validateAsync = async <T>(
  data: unknown,
  schema: z.ZodType<T>
): Promise<Result<T, string>> => {
  const result = await schema.safeParseAsync(data);
  return result.success
    ? ok(result.data)
    : err(`Validation failed: ${result.error.message}`);
};

/**
 * Validates data with custom error mapping.
 * 
 * @example
 * ```typescript
 * const result = validateWith(
 *   invalidData,
 *   userSchema,
 *   (zodError) => ({
 *     code: 400,
 *     message: zodError.issues[0]?.message || "Validation failed",
 *     field: zodError.issues[0]?.path.join('.') || 'unknown'
 *   })
 * );
 * // Returns: Ok(data) or Err(customErrorObject)
 * ```
 * 
 * @param data - The data to validate
 * @param schema - The Zod schema to validate against
 * @param errorMapper - Function to transform ZodError into custom error type
 * @returns Result containing validated data or custom mapped error
 */
export const validateWith = <T, E>(
  data: unknown,
  schema: z.ZodType<T>,
  errorMapper: (error: z.ZodError) => E,
): Result<T, E> => {
  const result = schema.safeParse(data);
  return result.success
    ? ok(result.data)
    : err(errorMapper(result.error));
};

/**
 * Validates data asynchronously with custom error mapping.
 * 
 * @example
 * ```typescript
 * const result = await validateWithAsync(
 *   asyncData,
 *   asyncSchema,
 *   (zodError) => new ValidationError(zodError.message)
 * );
 * ```
 * 
 * @param data - The data to validate
 * @param schema - The Zod schema to validate against
 * @param errorMapper - Function to transform ZodError into custom error type
 * @returns Promise of Result containing validated data or custom mapped error
 */
export const validateWithAsync = async <T, E>(
  data: unknown,
  schema: z.ZodType<T>,
  errorMapper: (error: z.ZodError) => E,
): Promise<Result<T, E>> => {
  const result = await schema.safeParseAsync(data);
  return result.success
    ? ok(result.data)
    : err(errorMapper(result.error));
};

// =============================================================================
// SCHEMA BUILDERS (Individual Exports)
// =============================================================================

/**
 * Creates a Zod schema for validating Result types.
 * 
 * @example
 * ```typescript
 * const userResultSchema = resultSchema(
 *   z.object({ name: z.string(), age: z.number() }),
 *   z.string()
 * );
 * 
 * const validResult = { type: "Ok", value: { name: "John", age: 30 } };
 * const parsed = userResultSchema.parse(validResult);
 * // Returns: validated Result object
 * ```
 * 
 * @param valueSchema - Schema for the success value type
 * @param errorSchema - Schema for the error type
 * @returns Zod schema that validates Result<T, E> objects
 */
export const resultSchema = <T, E>(
  valueSchema: z.ZodType<T>,
  errorSchema: z.ZodType<E>,
) =>
  z.discriminatedUnion("type", [
    z.object({ type: z.literal(OK_VALUE), value: valueSchema }),
    z.object({ type: z.literal(ERR_VALUE), error: errorSchema }),
  ]);

/**
 * Creates a Result schema with string error type.
 * Convenience function for the common case of string errors.
 * 
 * @example
 * ```typescript
 * const userResultSchema = stringErrorSchema(
 *   z.object({ name: z.string(), age: z.number() })
 * );
 * // Validates Result<User, string>
 * ```
 * 
 * @param valueSchema - Schema for the success value type
 * @returns Zod schema that validates Result<T, string> objects
 */
export const stringErrorSchema = <T>(valueSchema: z.ZodType<T>) =>
  resultSchema(valueSchema, z.string());

/**
 * Creates a Result schema with number error type.
 * Useful for error codes or numeric error identifiers.
 * 
 * @example
 * ```typescript
 * const apiResultSchema = numberErrorSchema(
 *   z.object({ data: z.any() })
 * );
 * // Validates Result<ApiResponse, number>
 * ```
 * 
 * @param valueSchema - Schema for the success value type
 * @returns Zod schema that validates Result<T, number> objects
 */
export const numberErrorSchema = <T>(valueSchema: z.ZodType<T>) =>
  resultSchema(valueSchema, z.number());

/**
 * Creates a Result schema with structured error object.
 * Useful for detailed error information with codes and messages.
 * 
 * @example
 * ```typescript
 * const apiResultSchema = structuredErrorSchema(
 *   z.object({ users: z.array(z.object({ id: z.string() })) })
 * );
 * // Validates Result<ApiData, { message: string, code?: number }>
 * ```
 * 
 * @param valueSchema - Schema for the success value type
 * @returns Zod schema that validates Result<T, StructuredError> objects
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
 * 
 * @example
 * ```typescript
 * const userSchema = z.object({ name: z.string(), age: z.number() });
 * const jsonString = '{"name": "John", "age": 30}';
 * 
 * const result = parseJson(jsonString, userSchema);
 * // Returns: Ok({ name: "John", age: 30 })
 * 
 * const invalid = parseJson('{"name": "John"}', userSchema);
 * // Returns: Err("Validation failed: ...")
 * 
 * const malformed = parseJson('invalid json', userSchema);
 * // Returns: Err("Invalid JSON: ...")
 * ```
 * 
 * @param jsonString - The JSON string to parse
 * @param schema - The Zod schema to validate the parsed data against
 * @returns Result containing validated parsed data or error message
 */
export const parseJson = <T>(jsonString: string, schema: z.ZodType<T>): Result<T, string> => {
  try {
    const parsed = JSON.parse(jsonString);
    return validate(parsed, schema);
  } catch (error) {
    return err(
      `Invalid JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

/**
 * Parses JSON string and validates against schema asynchronously.
 * 
 * @example
 * ```typescript
 * const asyncSchema = z.object({
 *   email: z.string().email().refine(async (email) => {
 *     return await isValidEmail(email);
 *   })
 * });
 * 
 * const result = await parseJsonAsync('{"email": "test@example.com"}', asyncSchema);
 * // Returns: Ok(validatedData) or Err("...")
 * ```
 * 
 * @param jsonString - The JSON string to parse
 * @param schema - The Zod schema to validate the parsed data against
 * @returns Promise of Result containing validated parsed data or error message
 */
export const parseJsonAsync = async <T>(
  jsonString: string,
  schema: z.ZodType<T>
): Promise<Result<T, string>> => {
  try {
    const parsed = JSON.parse(jsonString);
    return await validateAsync(parsed, schema);
  } catch (error) {
    return err(
      `Invalid JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

/**
 * Parses a JSON string containing a Result object and validates both structure and content.
 * 
 * @example
 * ```typescript
 * const jsonResult = '{"type": "Ok", "value": {"name": "John", "age": 30}}';
 * const result = parseResult(
 *   jsonResult,
 *   z.object({ name: z.string(), age: z.number() }),
 *   z.string()
 * );
 * // Returns: Ok(Result<User, string>)
 * ```
 * 
 * @param jsonString - JSON string containing a Result object
 * @param valueSchema - Schema for the success value type
 * @param errorSchema - Schema for the error type
 * @returns Result containing validated Result object or error message
 */
export const parseResult = <T, E>(
  jsonString: string,
  valueSchema: z.ZodType<T>,
  errorSchema: z.ZodType<E>,
): Result<Result<T, E>, string> => {
  const schema = resultSchema(valueSchema, errorSchema);
  try {
    const parsed = JSON.parse(jsonString);
    return validate(parsed, schema) as Result<Result<T, E>, string>;
  } catch (error) {
    return err(
      `Invalid JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

/**
 * Parses a JSON string containing a Result object and validates asynchronously.
 * 
 * @example
 * ```typescript
 * const jsonResult = '{"type": "Ok", "value": {"email": "test@example.com"}}';
 * const result = await parseResultAsync(
 *   jsonResult,
 *   z.object({ email: z.string().email() }),
 *   z.string()
 * );
 * ```
 * 
 * @param jsonString - JSON string containing a Result object
 * @param valueSchema - Schema for the success value type
 * @param errorSchema - Schema for the error type
 * @returns Promise of Result containing validated Result object or error message
 */
export const parseResultAsync = async <T, E>(
  jsonString: string,
  valueSchema: z.ZodType<T>,
  errorSchema: z.ZodType<E>,
): Promise<Result<Result<T, E>, string>> => {
  const schema = resultSchema(valueSchema, errorSchema);
  try {
    const parsed = JSON.parse(jsonString);
    return (await validateAsync(parsed, schema)) as Result<Result<T, E>, string>;
  } catch (error) {
    return err(
      `Invalid JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

// =============================================================================
// FACTORY FUNCTION (Backward Compatibility)
// =============================================================================

/**
 * Factory function that creates an object containing all validation utilities.
 * This maintains backward compatibility while allowing individual function imports.
 * All functions reference the individual exports above for zero overhead.
 * 
 * @example
 * ```typescript
 * const { validate, validateAsync, schemas, parse } = createValidationResult();
 * 
 * // Or use individual imports for better tree-shaking:
 * import { validate, parseJson, resultSchema } from './validation';
 * ```
 * 
 * @returns Object containing all validation utilities organized by category
 */
export const createValidationResult = () => ({
  // Core validation
  validate,
  validateAsync,
  validateWith,
  validateWithAsync,

  // Schema builders
  schemas: {
    result: resultSchema,
    stringError: stringErrorSchema,
    numberError: numberErrorSchema,
    structuredError: structuredErrorSchema,
  },

  // JSON parsing
  parse: {
    json: parseJson,
    jsonAsync: parseJsonAsync,
    result: parseResult,
    resultAsync: parseResultAsync,
  },
});

// Export validation instance for convenience, but keep separate
export const validation = createValidationResult();

// Re-export types for convenience
export type { Result, Ok, Err } from "@/base";
