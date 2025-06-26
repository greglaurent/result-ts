import { z } from "zod";
import { createBaseResult } from "@/base";

const base = createBaseResult();

// Use the same string literals as base.ts
const OK_VALUE = "Ok" as const;
const ERR_VALUE = "Err" as const;

export const createValidationResult = () => {
  const validateFn = <T>(data: unknown, schema: z.ZodType<T>) => {
    const result = schema.safeParse(data);
    return result.success
      ? base.ok(result.data)
      : base.err(`Validation failed: ${result.error.message}`);
  };

  const validateAsyncFn = async <T>(data: unknown, schema: z.ZodType<T>) => {
    const result = await schema.safeParseAsync(data);
    return result.success
      ? base.ok(result.data)
      : base.err(`Validation failed: ${result.error.message}`);
  };

  const resultSchema = <T, E>(
    valueSchema: z.ZodType<T>,
    errorSchema: z.ZodType<E>,
  ) =>
    z.discriminatedUnion("type", [
      z.object({ type: z.literal(OK_VALUE), value: valueSchema }),
      z.object({ type: z.literal(ERR_VALUE), error: errorSchema }),
    ]);

  return {
    // CORE VALIDATION (Root Level)
    validate: validateFn,
    validateAsync: validateAsyncFn,

    validateWith: <T, E>(
      data: unknown,
      schema: z.ZodType<T>,
      errorMapper: (error: z.ZodError) => E,
    ) => {
      const result = schema.safeParse(data);
      return result.success
        ? base.ok(result.data)
        : base.err(errorMapper(result.error));
    },

    validateWithAsync: async <T, E>(
      data: unknown,
      schema: z.ZodType<T>,
      errorMapper: (error: z.ZodError) => E,
    ) => {
      const result = await schema.safeParseAsync(data);
      return result.success
        ? base.ok(result.data)
        : base.err(errorMapper(result.error));
    },

    // SCHEMA BUILDERS
    schemas: {
      // Build Result schemas for validation
      result: resultSchema,

      // Common Result schema patterns
      stringError: <T>(valueSchema: z.ZodType<T>) =>
        resultSchema(valueSchema, z.string()),

      numberError: <T>(valueSchema: z.ZodType<T>) =>
        resultSchema(valueSchema, z.number()),

      structuredError: <T>(valueSchema: z.ZodType<T>) =>
        resultSchema(
          valueSchema,
          z.object({
            message: z.string(),
            code: z.number().optional(),
          }),
        ),
    },

    // JSON PARSING
    parse: {
      json: <T>(jsonString: string, schema: z.ZodType<T>) => {
        try {
          const parsed = JSON.parse(jsonString);
          return validateFn(parsed, schema);
        } catch (error) {
          return base.err(
            `Invalid JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      },

      jsonAsync: async <T>(jsonString: string, schema: z.ZodType<T>) => {
        try {
          const parsed = JSON.parse(jsonString);
          return await validateAsyncFn(parsed, schema);
        } catch (error) {
          return base.err(
            `Invalid JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      },

      result: <T, E>(
        jsonString: string,
        valueSchema: z.ZodType<T>,
        errorSchema: z.ZodType<E>,
      ) => {
        const schema = resultSchema(valueSchema, errorSchema);
        try {
          const parsed = JSON.parse(jsonString);
          return validateFn(parsed, schema);
        } catch (error) {
          return base.err(
            `Invalid JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      },

      resultAsync: async <T, E>(
        jsonString: string,
        valueSchema: z.ZodType<T>,
        errorSchema: z.ZodType<E>,
      ) => {
        const schema = resultSchema(valueSchema, errorSchema);
        try {
          const parsed = JSON.parse(jsonString);
          return await validateAsyncFn(parsed, schema);
        } catch (error) {
          return base.err(
            `Invalid JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      },
    },
  };
};

// Export validation functions separately from base Result
export const validation = createValidationResult();

// Re-export base for convenience, but keep separate
export { createBaseResult } from "@/base";
export type { Result, Ok, Err } from "@/base";
