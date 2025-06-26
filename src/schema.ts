// result-ts/schema - Core essentials + schema validation
// Provides runtime validation with Zod integration

import { z } from "zod";

// Re-export all core essentials (11 functions)
export * from "./core";

// Use the same string literals as base.ts
const OK_VALUE = "Ok" as const;
const ERR_VALUE = "Err" as const;

// Import individual functions for validation logic
import { ok, err, type Result } from "@/base";

// =============================================================================
// CORE VALIDATION FUNCTIONS
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
 */
export const validate = <T>(data: unknown, schema: z.ZodType<T>): Result<T, string> => {
  const result = schema.safeParse(data);
  return result.success
    ? ok(result.data)
    : err(`Validation failed: ${result.error.message}`);
};

/**
 * Validates data against a Zod schema asynchronously and returns a Result.
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
// SCHEMA BUILDERS
// =============================================================================

/**
 * Creates a Zod schema for validating Result types.
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
 */
export const stringErrorSchema = <T>(valueSchema: z.ZodType<T>) =>
  resultSchema(valueSchema, z.string());

/**
 * Creates a Result schema with number error type.
 */
export const numberErrorSchema = <T>(valueSchema: z.ZodType<T>) =>
  resultSchema(valueSchema, z.number());

/**
 * Creates a Result schema with structured error object.
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
// JSON PARSING
// =============================================================================

/**
 * Parses JSON string and validates against schema, returning a Result.
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
 */
export const parseResult = <T, E>(
  jsonString: string,
  valueSchema: z.ZodType<T>,
  errorSchema: z.ZodType<E>,
): Result<Result<T, E>, string> => {
  try {
    const parsed = JSON.parse(jsonString);

    if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) {
      return err("Invalid Result structure: missing 'type' field");
    }

    if (parsed.type === OK_VALUE) {
      if (!('value' in parsed)) {
        return err("Invalid Ok Result: missing 'value' field");
      }
      const valueValidation = valueSchema.safeParse(parsed.value);
      if (!valueValidation.success) {
        return err(`Invalid Ok value: ${valueValidation.error.message}`);
      }
      return ok({ type: OK_VALUE, value: valueValidation.data });
    } else if (parsed.type === ERR_VALUE) {
      if (!('error' in parsed)) {
        return err("Invalid Err Result: missing 'error' field");
      }
      const errorValidation = errorSchema.safeParse(parsed.error);
      if (!errorValidation.success) {
        return err(`Invalid Err value: ${errorValidation.error.message}`);
      }
      return ok({ type: ERR_VALUE, error: errorValidation.data });
    } else {
      return err(`Invalid Result type: expected '${OK_VALUE}' or '${ERR_VALUE}', got '${parsed.type}'`);
    }
  } catch (error) {
    return err(
      `Invalid JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

/**
 * Parses a JSON string containing a Result object and validates asynchronously.
 */
export const parseResultAsync = async <T, E>(
  jsonString: string,
  valueSchema: z.ZodType<T>,
  errorSchema: z.ZodType<E>,
): Promise<Result<Result<T, E>, string>> => {
  try {
    const parsed = JSON.parse(jsonString);

    if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) {
      return err("Invalid Result structure: missing 'type' field");
    }

    if (parsed.type === OK_VALUE) {
      if (!('value' in parsed)) {
        return err("Invalid Ok Result: missing 'value' field");
      }
      const valueValidation = await valueSchema.safeParseAsync(parsed.value);
      if (!valueValidation.success) {
        return err(`Invalid Ok value: ${valueValidation.error.message}`);
      }
      return ok({ type: OK_VALUE, value: valueValidation.data });
    } else if (parsed.type === ERR_VALUE) {
      if (!('error' in parsed)) {
        return err("Invalid Err Result: missing 'error' field");
      }
      const errorValidation = await errorSchema.safeParseAsync(parsed.error);
      if (!errorValidation.success) {
        return err(`Invalid Err value: ${errorValidation.error.message}`);
      }
      return ok({ type: ERR_VALUE, error: errorValidation.data });
    } else {
      return err(`Invalid Result type: expected '${OK_VALUE}' or '${ERR_VALUE}', got '${parsed.type}'`);
    }
  } catch (error) {
    return err(
      `Invalid JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
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
