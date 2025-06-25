const OK = "Ok";
const ERR = "Err";

interface Ok<T> {
  type: typeof OK;
  value: T;
}

interface Err<E> {
  type: typeof ERR;
  error: E;
}

type Result<T, E = unknown> = Ok<T> | Err<E>;

export const createBaseResult = () => ({
  ok: <T>(value: T): Ok<T> => ({
    type: OK,
    value
  }),

  err: <E>(error: E): Err<E> => ({
    type: ERR,
    error
  }),

  // Type guards
  isOk: <T, E>(
    result: Result<T, E>
  ): result is Ok<T> =>
    result.type === OK,

  isErr: <T, E>(
    result: Result<T, E>
  ): result is Err<E> =>
    result.type === ERR,

  unwrap: <T, E>(result: Result<T, E>): T => {
    if (result.type === OK) return result.value;

    const error = result.error;

    // If it's already an Error, throw it directly
    if (error instanceof Error) {
      throw error;
    }

    // If it's a string, use it as the message
    if (typeof error === 'string') {
      throw new Error(error);
    }

    // For other types, convert safely without JSON.stringify
    throw new Error(`Unwrap failed: ${String(error)}`);
  },

  unwrapOr: <T, E>(
    result: Result<T, E>,
    defaultValue: T
  ): T => {
    return result.type === OK ? result.value : defaultValue;
  },

  handle: <T>(fn: () => T): Result<T, string> => {
    try {
      return { type: OK, value: fn() };
    } catch (error) {
      return {
        type: ERR,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  },

  handleWith: <T, E>(
    fn: () => T,
    errorMapper: (error: unknown) => E
  ): Result<T, E> => {
    try {
      return { type: OK, value: fn() };
    } catch (error) {
      return { type: ERR, error: errorMapper(error) };
    }
  },
  // Pattern matching support
  match: <T, U, V, E>(
    result: Result<T, E>,
    handlers: {
      Ok: (value: T) => U;
      Err: (error: E) => V;
    }
  ): U | V => {
    return result.type === OK
      ? handlers.Ok(result.value)
      : handlers.Err(result.error);
  },

  safe: <T, E>(
    generator: () => Generator<Result<unknown, E>, T, unknown>
  ): Result<T, E> => {
    const gen = generator();
    try {
      let current = gen.next();
      while (!current.done) {
        const result = current.value as Result<unknown, E>;
        if (result.type === ERR) {
          try {
            gen.return(undefined as T);
          } catch {
            // Just ignore cleanup errors - don't try again!
          }
          return { type: ERR, error: result.error };
        }
        current = gen.next(result.value);
      }
      return { type: OK, value: current.value };
    } catch (error) {
      try {
        gen.return(undefined as T);
      } catch {
        // intentionally ignore errors
      }
      throw error;
    }
  },

  yieldFn: <T, E>(result: Result<T, E>) => result,

  iter: {
    map: <T, U, E>(
      result: Result<T, E>,
      mapper: (value: T) => U
    ): Result<U, E> => {
      return result.type === OK
        ? { type: OK, value: mapper(result.value) }
        : result;
    },

    mapErr: <T, E, F>(
      result: Result<T, E>,
      mapper: (error: E) => F
    ): Result<T, F> => {
      return result.type === ERR
        ? { type: ERR, error: mapper(result.error) }
        : result;
    },

    andThen: <T, U, E>(
      result: Result<T, E>,
      mapper: (value: T) => Result<U, E>
    ): Result<U, E> => {
      return result.type === OK ? mapper(result.value) : result;
    },

    // Lightweight pipe function for performance-critical chaining
    pipe: <T, E>(
      initialResult: Result<T, E>,
      ...operations: Array<(value: any) => Result<any, E>>
    ) => {
      let current = initialResult;

      for (const operation of operations) {
        if (current.type === ERR) return current;
        current = operation(current.value);
      }

      return current;
    },
  },

  collections: {
    all: <T, E>(
      results: Array<Result<T, E>>
    ): Result<T[], E> => {
      const values = [];
      for (const result of results) {
        if (result.type === ERR) {
          return result;
        }
        values.push(result.value);
      }
      return { type: OK, value: values };
    },

    oks: <T, E>(results: Array<Result<T, E>>) => {
      const values = [];
      for (const result of results) {
        if (result && result.type === OK) {
          values.push(result.value);
        }
      }
      return values;
    },

    errs: <T, E>(results: Array<Result<T, E>>) => {
      const errors = [];
      for (const result of results) {
        if (result && result.type === ERR) {
          errors.push(result.error);
        }
      }
      return errors;
    },

    partition: <T, E>(
      results: Array<Result<T, E>>
    ): { oks: T[]; errors: E[] } => {
      const oks = [];
      const errors = [];

      for (const result of results) {
        if (result.type === OK) {
          oks.push(result.value);
        } else {
          errors.push(result.error);
        }
      }

      return { oks, errors };
    },

    // Enhanced partition with metadata (single iteration)
    partitionWith: <T, E>(
      results: Array<Result<T, E>>
    ): {
      oks: T[];
      errors: E[];
      okCount: number;
      errorCount: number;
      total: number
    } => {
      const oks = [];
      const errors = [];

      for (const result of results) {
        if (result && result.type === OK) {
          oks.push(result.value);
        } else if (result && result.type === ERR) {
          errors.push(result.error);
        }
      }

      return {
        oks,
        errors,
        okCount: oks.length,
        errorCount: errors.length,
        total: results.length
      };
    },

    // Lightweight stats without value extraction
    analyze: <T, E>(
      results: Array<Result<T, E>>
    ): {
      okCount: number;
      errorCount: number;
      total: number;
      hasErrors: boolean;
      isEmpty: boolean;
    } => {
      let okCount = 0;
      let errorCount = 0;

      for (const result of results) {
        if (result && result.type === OK) {
          okCount++;
        } else if (result && result.type === ERR) {
          errorCount++;
        }
      }

      return {
        okCount,
        errorCount,
        total: results.length,
        hasErrors: errorCount > 0,
        isEmpty: results.length === 0
      };
    },

    // Early-exit first element finder
    findFirst: <T, E>(
      results: Array<Result<T, E>>
    ): {
      firstOk: T | undefined;
      firstError: E | undefined;
      okIndex: number;
      errorIndex: number
    } => {
      let firstOk: T | undefined;
      let firstError: E | undefined;
      let okIndex = -1;
      let errorIndex = -1;

      for (let i = 0; i < results.length; i++) {
        const result = results[i];

        if (result && result.type === OK && firstOk === undefined) {
          firstOk = result.value;
          okIndex = i;
        } else if (result && result.type === ERR && firstError === undefined) {
          firstError = result.error;
          errorIndex = i;
        }

        // Early exit if we found both
        if (firstOk !== undefined && firstError !== undefined) {
          break;
        }
      }

      return { firstOk, firstError, okIndex, errorIndex };
    },

    // General-purpose single-pass reducer
    reduce: <T, E, Acc>(
      results: Array<Result<T, E>>,
      reducer: {
        onOk: (acc: Acc, value: T, index: number) => Acc;
        onErr: (acc: Acc, error: E, index: number) => Acc;
      },
      initialValue: Acc
    ): Acc => {
      let acc = initialValue;

      for (let i = 0; i < results.length; i++) {
        const result = results[i];

        if (result && result.type === OK) {
          acc = reducer.onOk(acc, result.value, i);
        } else if (result && result.type === ERR) {
          acc = reducer.onErr(acc, result.error, i);
        }
      }

      return acc;
    },

    first: <T, E>(
      results: Array<Result<T, E>>
    ): Result<T, E[]> => {
      const errors = [];

      for (const result of results) {
        if (result.type === OK) {
          return result;
        }
        errors.push(result.error);
      }

      return { type: ERR, error: errors };
    },

  },

  async: {
    handle: async <T>(fn: () => Promise<T>): Promise<Result<T, string>> => {
      try {
        const value = await fn();
        return { type: OK, value };
      } catch (error) {
        return {
          type: ERR,
          error: error instanceof Error ? error.message : "Unknown error"
        };
      }
    },

    handleWith: async <T, E>(
      fn: () => Promise<T>,
      errorMapper: (error: unknown) => E
    ): Promise<Result<T, E>> => {
      try {
        const value = await fn();
        return { type: OK, value };
      } catch (error) {
        return { type: ERR, error: errorMapper(error) };
      }
    },

    safeWith: async <T, E>(
      generator: () => AsyncGenerator<Result<unknown, E>, T, unknown>
    ): Promise<Result<T, E>> => {
      const gen = generator();
      try {
        let current = await gen.next();
        while (!current.done) {
          const result = current.value as Result<unknown, E>;
          if (result.type === ERR) {
            try {
              await gen.return(undefined as T);
            } catch {
              // Just ignore cleanup errors
            }
            return { type: ERR, error: result.error };
          }
          current = await gen.next(result.value);
        }
        return { type: OK, value: current.value };
      } catch (error) {
        try {
          await gen.return(undefined as T);
        } catch {
          // Just ignore cleanup errors
        }
        throw error; // This is outside the cleanup try/catch
      }
    },

    map: async <T, U, E>(
      promise: Promise<Result<T, E>>,
      mapper: (value: T) => U | Promise<U>
    ): Promise<Result<U, E>> => {
      const result = await promise;
      if (result.type === OK) {
        const mapped = await mapper(result.value);
        return { type: OK, value: mapped };
      }
      return result;
    },

    mapErr: async <T, E, F>(
      promise: Promise<Result<T, E>>,
      mapper: (error: E) => F | Promise<F>
    ): Promise<Result<T, F>> => {
      const result = await promise;
      if (result.type === ERR) {
        const mapped = await mapper(result.error);
        return { type: ERR, error: mapped };
      }
      return result;
    },

    andThen: async <T, U, E>(
      promise: Promise<Result<T, E>>,
      mapper: (value: T) => Promise<Result<U, E>>
    ): Promise<Result<U, E>> => {
      const result = await promise;
      return result.type === OK ? await mapper(result.value) : result;
    },

    all: async <T, E>(
      promises: Array<Promise<Result<T, E>>>
    ): Promise<Result<T[], E>> => {
      const results = await Promise.all(promises);
      const values = [];

      for (const result of results) {
        if (result.type === ERR) {
          return result; // Return first error
        }
        values.push(result.value);
      }

      return { type: OK, value: values };
    },

    allSettled: async <T, E>(
      promises: Array<Promise<Result<T, E>>>
    ): Promise<{ oks: T[]; errors: E[] }> => {
      const results = await Promise.all(promises);
      const oks = [];
      const errors = [];

      for (const result of results) {
        if (result.type === OK) {
          oks.push(result.value);
        } else {
          errors.push(result.error);
        }
      }

      return { oks, errors };
    },
  },

  utils: {
    inspect: <T, E>(
      result: Result<T, E>,
      onOk?: (value: T) => void,
      onErr?: (error: E) => void
    ): Result<T, E> => {
      if (result.type === OK && onOk) {
        onOk(result.value);
      } else if (result.type === ERR && onErr) {
        onErr(result.error);
      }
      return result;
    },

    tap: <T, E>(
      result: Result<T, E>,
      fn: (value: T) => void
    ): Result<T, E> => {
      if (result.type === OK) {
        fn(result.value);
      }
      return result;
    },

    tapErr: <T, E>(
      result: Result<T, E>,
      fn: (error: E) => void
    ): Result<T, E> => {
      if (result.type === ERR) {
        fn(result.error);
      }
      return result;
    },

    fromNullable: <T>(
      value: T | null | undefined,
      errorValue: unknown = "Value is null or undefined"
    ): Result<T, unknown> => {
      return value != null
        ? { type: OK, value }
        : { type: ERR, error: errorValue };
    },

    toNullable: <T, E>(
      result: Result<T, E>
    ): T | null => {
      return result.type === OK ? result.value : null;
    },

    zip: <T, U, E>(
      resultA: Result<T, E>,
      resultB: Result<U, E>
    ): Result<[T, U], E> => {
      if (resultA.type === OK && resultB.type === OK) {
        return { type: OK, value: [resultA.value, resultB.value] };
      }

      if (resultA.type === ERR) {
        return { type: ERR, error: resultA.error };
      }

      if (resultB.type === ERR) {
        return { type: ERR, error: resultB.error };
      }

      // This should never happen, but TypeScript requires it
      throw new Error("Unreachable: both results cannot be Ok here");
    },

    apply: <T, U, E>(
      resultFn: Result<(value: T) => U, E>,
      resultValue: Result<T, E>
    ): Result<U, E> => {
      if (resultFn.type === OK && resultValue.type === OK) {
        return { type: OK, value: resultFn.value(resultValue.value) };
      }

      // Handle errors with explicit type checking
      if (resultFn.type === ERR) {
        return { type: ERR, error: resultFn.error };
      }

      if (resultValue.type === ERR) {
        return { type: ERR, error: resultValue.error };
      }

      // This should never happen, but TypeScript requires it
      throw new Error("Unreachable: both results cannot be Ok here");
    },
  }
});

export type { OK, ERR, Result, Ok, Err };
