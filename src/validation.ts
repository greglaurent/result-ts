import { z } from 'zod';
import { createBaseResult } from '@/base';

const base = createBaseResult();

export const Result = {
  ...base,

  schema: <T, E>(
    valueSchema: z.ZodType<T>,
    errorSchema: z.ZodType<E>
  ) => z.discriminatedUnion("type", [
    z.object({ type: z.literal("Ok"), value: valueSchema }),
    z.object({ type: z.literal("Err"), error: errorSchema })
  ]),

  string: <T>(valueSchema: z.ZodType<T>) =>
    Result.schema(valueSchema, z.string()),

  number: <T>(valueSchema: z.ZodType<T>) =>
    Result.schema(valueSchema, z.number()),

  error: <T>(valueSchema: z.ZodType<T>) =>
    Result.schema(valueSchema, z.object({
      message: z.string(),
      code: z.number().optional(),
    })),

  parseJson: <T>(jsonString: string, schema: z.ZodType<T>) => {
    try {
      const parsed = JSON.parse(jsonString);
      const validated = schema.safeParse(parsed);
      return validated.success
        ? base.ok(validated.data)
        : base.err(`Validation failed: ${validated.error.message}`);
    } catch (error) {
      return base.err(`Invalid JSON: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },

  parseResult: <T, E>(
    jsonString: string,
    valueSchema: z.ZodType<T>,
    errorSchema: z.ZodType<E>
  ) => {
    const resultSchema = Result.schema(valueSchema, errorSchema);
    return Result.parseJson(jsonString, resultSchema);
  },
};
