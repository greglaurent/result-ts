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
  schema: z.ZodType<T>,
): Promise<Result<T, string>> => {
  const result = await schema.safeParseAsync(data);
  return result.success
    ? { type: OK, value: result.data }
    : { type: ERR, error: `Validation failed: ${result.error.message}` };
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
    ? { type: OK, value: result.data }
    : { type: ERR, error: errorMapper(result.error) };
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
    ? { type: OK, value: result.data }
    : { type: ERR, error: errorMapper(result.error) };
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
    z.object({ type: z.literal(OK), value: valueSchema }),
    z.object({ type: z.literal(ERR), error: errorSchema }),
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
 * ```
 *
 * @param valueSchema - Schema for the success value type
 * @returns Zod schema that validates Result<T, string> objects
 */
export const stringErrorSchema = <T>(valueSchema: z.ZodType<T>) =>
  resultSchema(valueSchema, z.string());

/**
 * Creates a Result schema with number error type.
 *
 * @example
 * ```typescript
 * const userResultSchema = numberErrorSchema(
 *   z.object({ name: z.string(), age: z.number() })
 * );
 * ```
 *
 * @param valueSchema - Schema for the success value type
 * @returns Zod schema that validates Result<T, number> objects
 */
export const numberErrorSchema = <T>(valueSchema: z.ZodType<T>) =>
  resultSchema(valueSchema, z.number());

/**
 * Creates a Result schema with structured error object.
 *
 * @example
 * ```typescript
 * const userResultSchema = structuredErrorSchema(
 *   z.object({ name: z.string(), age: z.number() })
 * );
 * // Validates Result<User, { message: string, code?: number }>
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
 * const result = parseJson('{"name": "John", "age": 30}', userSchema);
 * // Returns: Ok({ name: "John", age: 30 })
 *
 * const invalid = parseJson('{"name": "John"}', userSchema);
 * // Returns: Err("Validation failed: ...")
 * ```
 *
 * @param jsonString - The JSON string to parse
 * @param schema - The Zod schema to validate the parsed data against
 * @returns Result containing validated parsed data or error message
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
 *
 * @example
 * ```typescript
 * const result = await parseResultAsync(
 *   jsonResult,
 *   asyncValueSchema,
 *   asyncErrorSchema
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
 * Requires: Zod as peer dependency
 *
 * Other available layers:
 * - `result-ts` → core essentials only
 * - `result-ts/iter` → core + data transformation
 * - `result-ts/batch` → core + array processing
 * - `result-ts/utils` → core + debugging utilities
 * - `result-ts/patterns` → core + advanced patterns
 */
