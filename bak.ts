//import { z } from "zod";
//
//export const Result = {
//  schema: <T extends unknown, E extends unknown>(
//    valueSchema: z.ZodType<T>,
//    errorSchema: z.ZodType<E>,
//  ) =>
//    z.discriminatedUnion("type", [
//      z.object({ type: z.literal("Ok"), value: valueSchema }),
//      z.object({ type: z.literal("Err"), error: errorSchema }),
//    ]),
//
//  ok: <T extends unknown>(value: T) => ({ type: "Ok" as const, value }),
//  err: <E extends unknown>(error: E) => ({ type: "Err" as const, error }),
//
//  string: <T extends unknown>(valueSchema: z.ZodType<T>) =>
//    Result.schema(valueSchema, z.string()),
//
//  number: <T extends unknown>(valueSchema: z.ZodType<T>) =>
//    Result.schema(valueSchema, z.number()),
//
//  error: <T extends unknown>(valueSchema: z.ZodType<T>) =>
//    Result.schema(
//      valueSchema,
//      z.object({
//        message: z.string(),
//        code: z.number().optional(),
//      }),
//    ),
//
//  isOk: <T extends unknown, E extends unknown>(
//    result: { type: "Ok"; value: T } | { type: "Err"; error: E },
//  ): result is { type: "Ok"; value: T } => result.type === "Ok",
//
//  isErr: <T extends unknown, E extends unknown>(
//    result: { type: "Ok"; value: T } | { type: "Err"; error: E },
//  ): result is { type: "Err"; error: E } => result.type === "Err",
//
//  unwrap: <T extends unknown, E extends unknown>(
//    result: { type: "Ok"; value: T } | { type: "Err"; error: E },
//  ): T => {
//    if (Result.isOk(result)) return result.value;
//    throw new Error(`Unwrap failed: ${JSON.stringify(result.error)}`);
//  },
//
//  unwrapOr: <T extends unknown, E extends unknown>(
//    result: { type: "Ok"; value: T } | { type: "Err"; error: E },
//    defaultValue: T,
//  ): T => {
//    return Result.isOk(result) ? result.value : defaultValue;
//  },
//
//  parseJson: <T extends unknown>(jsonString: string, schema: z.ZodType<T>) => {
//    try {
//      const parsed = JSON.parse(jsonString);
//      const validated = schema.safeParse(parsed);
//      return validated.success
//        ? Result.ok(validated.data)
//        : Result.err(`Validation failed: ${validated.error.message}`);
//    } catch (error) {
//      return Result.err(
//        `Invalid JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
//      );
//    }
//  },
//
//  parseResult: <T extends unknown, E extends unknown>(
//    jsonString: string,
//    valueSchema: z.ZodType<T>,
//    errorSchema: z.ZodType<E>,
//  ) => {
//    const resultSchema = Result.schema(valueSchema, errorSchema);
//    return Result.parseJson(jsonString, resultSchema);
//  },
//
//  map: <T extends unknown, U extends unknown, E extends unknown>(
//    result: { type: "Ok"; value: T } | { type: "Err"; error: E },
//    mapper: (value: T) => U,
//  ) => {
//    return Result.isOk(result) ? Result.ok(mapper(result.value)) : result;
//  },
//
//  mapErr: <T extends unknown, E extends unknown, F extends unknown>(
//    result: { type: "Ok"; value: T } | { type: "Err"; error: E },
//    mapper: (error: E) => F,
//  ) => {
//    return Result.isErr(result) ? Result.err(mapper(result.error)) : result;
//  },
//
//  andThen: <T extends unknown, U extends unknown, E extends unknown>(
//    result: { type: "Ok"; value: T } | { type: "Err"; error: E },
//    mapper: (value: T) => { type: "Ok"; value: U } | { type: "Err"; error: E },
//  ) => {
//    return Result.isOk(result) ? mapper(result.value) : result;
//  },
//
//  try: <T extends unknown>(fn: () => T) => {
//    try {
//      return Result.ok(fn());
//    } catch (error) {
//      return Result.err(
//        error instanceof Error ? error.message : "Unknown error",
//      );
//    }
//  },
//
//  tryAsync: async <T extends unknown>(fn: () => Promise<T>) => {
//    try {
//      const value = await fn();
//      return Result.ok(value);
//    } catch (error) {
//      return Result.err(
//        error instanceof Error ? error.message : "Unknown error",
//      );
//    }
//  },
//
//  tryWith: <T extends unknown, E extends unknown>(
//    fn: () => T,
//    errorMapper: (error: unknown) => E,
//  ) => {
//    try {
//      return Result.ok(fn());
//    } catch (error) {
//      return Result.err(errorMapper(error));
//    }
//  },
//
//  async: {
//    map: async <T extends unknown, U extends unknown, E extends unknown>(
//      promise: Promise<{ type: "Ok"; value: T } | { type: "Err"; error: E }>,
//      mapper: (value: T) => U | Promise<U>,
//    ) => {
//      const result = await promise;
//      if (Result.isOk(result)) {
//        const mapped = await mapper(result.value);
//        return Result.ok(mapped);
//      }
//      return result;
//    },
//
//    andThen: async <T extends unknown, U extends unknown, E extends unknown>(
//      promise: Promise<{ type: "Ok"; value: T } | { type: "Err"; error: E }>,
//      mapper: (
//        value: T,
//      ) => Promise<{ type: "Ok"; value: U } | { type: "Err"; error: E }>,
//    ) => {
//      const result = await promise;
//      return Result.isOk(result) ? await mapper(result.value) : result;
//    },
//  },
//
//  all: <T extends unknown, E extends unknown>(
//    results: Array<{ type: "Ok"; value: T } | { type: "Err"; error: E }>,
//  ) => {
//    const values: T[] = [];
//    for (const result of results) {
//      if (Result.isErr(result)) {
//        return result; // Return first error
//      }
//      values.push(result.value);
//    }
//    return Result.ok(values);
//  },
//
//  // Filter out errors, keep only successes
//  successes: <T extends unknown, E extends unknown>(
//    results: Array<{ type: "Ok"; value: T } | { type: "Err"; error: E }>,
//  ): T[] => {
//    return results.filter(Result.isOk).map((r) => r.value);
//  },
//
//  partition: <T extends unknown, E extends unknown>(
//    results: Array<{ type: "Ok"; value: T } | { type: "Err"; error: E }>,
//  ) => {
//    const successes: T[] = [];
//    const errors: E[] = [];
//
//    for (const result of results) {
//      if (Result.isOk(result)) {
//        successes.push(result.value);
//      } else {
//        errors.push(result.error);
//      }
//    }
//
//    return { successes, errors };
//  },
//};
