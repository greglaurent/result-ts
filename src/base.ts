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
  ok: <T extends unknown>(value: T): Ok<T> => ({
    type: OK,
    value
  }),

  err: <E extends unknown>(error: E): Err<E> => ({
    type: ERR,
    error
  }),

  // Type guards
  isOk: <T extends unknown, E extends unknown>(
    result: Result<T, E>
  ): result is Ok<T> =>
    result.type === OK,

  isErr: <T extends unknown, E extends unknown>(
    result: Result<T, E>
  ): result is Err<E> =>
    result.type === ERR,

  // Basic utilities
  unwrap: <T extends unknown, E extends unknown>(result: Result<T, E>): T => {
    if (result.type === OK) return result.value;
    throw new Error(`Unwrap failed: ${JSON.stringify(result.error)}`);
  },

  unwrapOr: <T extends unknown, E extends unknown>(
    result: Result<T, E>,
    defaultValue: T
  ): T => {
    return result.type === OK ? result.value : defaultValue;
  },

  tryFn: <T extends unknown>(fn: () => T): Result<T, string> => {
    try {
      return { type: OK, value: fn() };
    } catch (error) {
      return {
        type: ERR,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  },

  tryWith: <T extends unknown, E extends unknown>(
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
  match: <T extends unknown, U extends unknown, V extends unknown, E extends unknown>(
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

  // Rust-like ? operator simulation using generators
  safeTry: <T extends unknown, E extends unknown>(
    generator: () => Generator<Result<unknown, E>, T, unknown>
  ): Result<T, E> => {
    const gen = generator();
    let current = gen.next();

    while (!current.done) {
      const result = current.value as Result<unknown, E>;

      if (result.type === ERR) {
        return result as Result<T, E>;
      }

      // Pass the Ok value back to the generator
      current = gen.next(result.value);
    }

    // Generator completed successfully, return the final value
    return { type: OK, value: current.value };
  },

  yieldFn: <T extends unknown, E extends unknown>(result: Result<T, E>) => result,

  iter: {
    map: <T extends unknown, U extends unknown, E extends unknown>(
      result: Result<T, E>,
      mapper: (value: T) => U
    ): Result<U, E> => {
      return result.type === OK
        ? { type: OK, value: mapper(result.value) }
        : result;
    },

    mapErr: <T extends unknown, E extends unknown, F extends unknown>(
      result: Result<T, E>,
      mapper: (error: E) => F
    ): Result<T, F> => {
      return result.type === ERR
        ? { type: ERR, error: mapper(result.error) }
        : result;
    },

    andThen: <T extends unknown, U extends unknown, E extends unknown>(
      result: Result<T, E>,
      mapper: (value: T) => Result<U, E>
    ): Result<U, E> => {
      return result.type === OK ? mapper(result.value) : result;
    },
  },

  collections: {
    all: <T extends unknown, E extends unknown>(
      results: Array<Result<T, E>>
    ): Result<T[], E> => {
      const values: T[] = [];
      for (const result of results) {
        if (result.type === ERR) {
          return result;
        }
        values.push(result.value);
      }
      return { type: OK, value: values };
    },

    oks: <T extends unknown, E extends unknown>(
      results: Array<Result<T, E>>
    ): T[] => {
      return results
        .filter((result): result is Ok<T> => result.type === OK)
        .map(r => r.value);
    },

    errs: <T extends unknown, E extends unknown>(
      results: Array<Result<T, E>>
    ): E[] => {
      return results
        .filter((result): result is Err<E> => result.type === ERR)
        .map(r => r.error);
    },

    partition: <T extends unknown, E extends unknown>(
      results: Array<Result<T, E>>
    ): { successes: T[]; errors: E[] } => {
      const successes: T[] = [];
      const errors: E[] = [];

      for (const result of results) {
        if (result.type === OK) {
          successes.push(result.value);
        } else {
          errors.push(result.error);
        }
      }

      return { successes, errors };
    },

    first: <T extends unknown, E extends unknown>(
      results: Array<Result<T, E>>
    ): Result<T, E[]> => {
      const errors: E[] = [];

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
    tryFn: async <T extends unknown>(fn: () => Promise<T>): Promise<Result<T, string>> => {
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

    tryWith: async <T extends unknown, E extends unknown>(
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

    safeTry: async <T extends unknown, E extends unknown>(
      generator: () => AsyncGenerator<Result<unknown, E>, T, unknown>
    ): Promise<Result<T, E>> => {
      const gen = generator();
      let current = await gen.next();

      while (!current.done) {
        const result = current.value as Result<unknown, E>;

        if (result.type === ERR) {
          return result as Result<T, E>;
        }

        current = await gen.next(result.value);
      }

      return { type: OK, value: current.value };
    },


    map: async <T extends unknown, U extends unknown, E extends unknown>(
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

    mapErr: async <T extends unknown, E extends unknown, F extends unknown>(
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

    andThen: async <T extends unknown, U extends unknown, E extends unknown>(
      promise: Promise<Result<T, E>>,
      mapper: (value: T) => Promise<Result<U, E>>
    ): Promise<Result<U, E>> => {
      const result = await promise;
      return result.type === OK ? await mapper(result.value) : result;
    },

    all: async <T extends unknown, E extends unknown>(
      promises: Array<Promise<Result<T, E>>>
    ): Promise<Result<T[], E>> => {
      const results = await Promise.all(promises);
      const values: T[] = [];

      for (const result of results) {
        if (result.type === ERR) {
          return result; // Return first error
        }
        values.push(result.value);
      }

      return { type: OK, value: values };
    },

    allSettled: async <T extends unknown, E extends unknown>(
      promises: Array<Promise<Result<T, E>>>
    ): Promise<{ successes: T[]; errors: E[] }> => {
      const results = await Promise.all(promises);
      const successes: T[] = [];
      const errors: E[] = [];

      for (const result of results) {
        if (result.type === OK) {
          successes.push(result.value);
        } else {
          errors.push(result.error);
        }
      }

      return { successes, errors };
    },
  },

  utils: {
    inspect: <T extends unknown, E extends unknown>(
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

    tap: <T extends unknown, E extends unknown>(
      result: Result<T, E>,
      fn: (value: T) => void
    ): Result<T, E> => {
      if (result.type === OK) {
        fn(result.value);
      }
      return result;
    },

    tapErr: <T extends unknown, E extends unknown>(
      result: Result<T, E>,
      fn: (error: E) => void
    ): Result<T, E> => {
      if (result.type === ERR) {
        fn(result.error);
      }
      return result;
    },

    fromNullable: <T extends unknown>(
      value: T | null | undefined,
      errorValue: unknown = "Value is null or undefined"
    ): Result<T, unknown> => {
      return value != null
        ? { type: OK, value }
        : { type: ERR, error: errorValue };
    },

    toNullable: <T extends unknown, E extends unknown>(
      result: Result<T, E>
    ): T | null => {
      return result.type === OK ? result.value : null;
    },

    zip: <T extends unknown, U extends unknown, E extends unknown>(
      resultA: Result<T, E>,
      resultB: Result<U, E>
    ): Result<[T, U], E> => {
      if (resultA.type === OK && resultB.type === OK) {
        return { type: OK, value: [resultA.value, resultB.value] };
      }
      return resultA.type === ERR ? resultA : resultB as Err<E>;
    },

    apply: <T extends unknown, U extends unknown, E extends unknown>(
      resultFn: Result<(value: T) => U, E>,
      resultValue: Result<T, E>
    ): Result<U, E> => {
      if (resultFn.type === OK && resultValue.type === OK) {
        return { type: OK, value: resultFn.value(resultValue.value) };
      }
      // Return first error encountered
      return resultFn.type === ERR ? resultFn : resultValue as Err<E>;
    }
  }
});

export type { OK, ERR, Result, Ok, Err };
