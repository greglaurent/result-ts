import { describe, it, expect } from "vitest";
import {
  ok,
  err,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
  handle,
  handleAsync,
  handleWith,
  handleWithAsync,
  match,
} from "../src/core";
import type { Result } from "../src/types";

describe("Core Result Functions", () => {
  describe("ok()", () => {
    it("should create a successful Result", () => {
      const result = ok("hello");
      expect(result).toEqual({ type: "Ok", value: "hello" });
    });

    it("should handle different value types", () => {
      expect(ok(42)).toEqual({ type: "Ok", value: 42 });
      expect(ok(true)).toEqual({ type: "Ok", value: true });
      expect(ok(null)).toEqual({ type: "Ok", value: null });
      expect(ok(undefined)).toEqual({ type: "Ok", value: undefined });
      expect(ok({ name: "test" })).toEqual({
        type: "Ok",
        value: { name: "test" },
      });
      expect(ok([1, 2, 3])).toEqual({ type: "Ok", value: [1, 2, 3] });
    });
  });

  describe("err()", () => {
    it("should create an error Result", () => {
      const result = err("something went wrong");
      expect(result).toEqual({ type: "Err", error: "something went wrong" });
    });

    it("should handle different error types", () => {
      expect(err("string error")).toEqual({
        type: "Err",
        error: "string error",
      });
      expect(err(404)).toEqual({ type: "Err", error: 404 });
      expect(err(new Error("test"))).toEqual({
        type: "Err",
        error: new Error("test"),
      });
      expect(err({ code: 500, message: "Server error" })).toEqual({
        type: "Err",
        error: { code: 500, message: "Server error" },
      });
    });
  });

  describe("isOk()", () => {
    it("should return true for Ok Results", () => {
      expect(isOk(ok("hello"))).toBe(true);
      expect(isOk(ok(42))).toBe(true);
      expect(isOk(ok(null))).toBe(true);
    });

    it("should return false for Err Results", () => {
      expect(isOk(err("error"))).toBe(false);
      expect(isOk(err(404))).toBe(false);
    });

    it("should narrow types correctly", () => {
      const result: Result<string, number> = ok("hello");

      if (isOk(result)) {
        // TypeScript should know result.value is string
        expect(typeof result.value).toBe("string");
        expect(result.value.length).toBe(5);
      }
    });
  });

  describe("isErr()", () => {
    it("should return true for Err Results", () => {
      expect(isErr(err("error"))).toBe(true);
      expect(isErr(err(404))).toBe(true);
      expect(isErr(err(new Error("test")))).toBe(true);
    });

    it("should return false for Ok Results", () => {
      expect(isErr(ok("hello"))).toBe(false);
      expect(isErr(ok(42))).toBe(false);
    });

    it("should narrow types correctly", () => {
      const result: Result<string, number> = err(404);

      if (isErr(result)) {
        // TypeScript should know result.error is number
        expect(typeof result.error).toBe("number");
        expect(result.error).toBe(404);
      }
    });
  });

  describe("unwrap()", () => {
    it("should return value for Ok Results", () => {
      expect(unwrap(ok("hello"))).toBe("hello");
      expect(unwrap(ok(42))).toBe(42);
      expect(unwrap(ok(null))).toBe(null);
    });

    it("should throw Error for string errors", () => {
      expect(() => unwrap(err("error message"))).toThrow("error message");
    });

    it("should throw original Error objects", () => {
      const originalError = new Error("original error");
      expect(() => unwrap(err(originalError))).toThrow(originalError);
    });

    it("should throw Error with string representation for non-Error objects", () => {
      expect(() => unwrap(err(404))).toThrow("Unwrap failed: 404");
      expect(() => unwrap(err({ code: 500 }))).toThrow(
        "Unwrap failed: [object Object]",
      );
    });
  });

  describe("unwrapOr()", () => {
    it("should return value for Ok Results", () => {
      expect(unwrapOr(ok("hello"), "default")).toBe("hello");
      expect(unwrapOr(ok(42), 0)).toBe(42);
    });

    it("should return default value for Err Results", () => {
      expect(unwrapOr(err("error"), "default")).toBe("default");
      expect(unwrapOr(err(404), 0)).toBe(0);
    });

    it("should handle different default value types", () => {
      expect(unwrapOr(err("error"), null)).toBe(null);
      expect(unwrapOr(err("error"), undefined)).toBe(undefined);
      expect(unwrapOr(err("error"), { fallback: true })).toEqual({
        fallback: true,
      });
    });
  });

  describe("handle()", () => {
    it("should return Ok for successful functions", () => {
      const result = handle(() => "success");
      expect(result).toEqual({ type: "Ok", value: "success" });
    });

    it("should return Ok for functions returning different types", () => {
      expect(handle(() => 42)).toEqual({ type: "Ok", value: 42 });
      expect(handle(() => ({ data: "test" }))).toEqual({
        type: "Ok",
        value: { data: "test" },
      });
      expect(handle(() => null)).toEqual({ type: "Ok", value: null });
    });

    it("should return Err with original Error for thrown Error objects", () => {
      const originalError = new Error("something failed");
      const result = handle(() => {
        throw originalError;
      });
      expect(result.type).toBe("Err");
      if (isErr(result)) {
        expect(result.error).toBe(originalError);
      }
    });

    it("should return Err with new Error for thrown strings", () => {
      const result = handle(() => {
        throw "string error";
      });
      expect(result.type).toBe("Err");
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toBe("string error");
      }
    });

    it("should return Err with wrapped Error for other thrown types", () => {
      const result = handle(() => {
        throw 404;
      });
      expect(result.type).toBe("Err");
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toBe("Caught non-Error value: 404");
        expect((result.error as any).cause).toBe(404);
      }

      const objResult = handle(() => {
        throw { code: 500, message: "Server error" };
      });
      expect(objResult.type).toBe("Err");
      if (isErr(objResult)) {
        expect(objResult.error).toBeInstanceOf(Error);
        expect((objResult.error as any).cause).toEqual({
          code: 500,
          message: "Server error",
        });
      }
    });

    it("should handle JSON.parse example", () => {
      const validJson = handle(() => JSON.parse('{"name": "John"}'));
      expect(validJson).toEqual({ type: "Ok", value: { name: "John" } });

      const invalidJson = handle(() => JSON.parse("invalid json"));
      expect(invalidJson.type).toBe("Err");
      if (isErr(invalidJson)) {
        expect(invalidJson.error).toBeInstanceOf(Error);
      }
    });
  });

  describe("handleAsync()", () => {
    it("should return Ok for successful async functions", async () => {
      const result = await handleAsync(async () => "async success");
      expect(result).toEqual({ type: "Ok", value: "async success" });
    });

    it("should return Ok for Promise.resolve", async () => {
      const result = await handleAsync(() => Promise.resolve(42));
      expect(result).toEqual({ type: "Ok", value: 42 });
    });

    it("should return Err with original Error for rejected promises", async () => {
      const originalError = new Error("async error");
      const result = await handleAsync(() => Promise.reject(originalError));
      expect(result.type).toBe("Err");
      if (isErr(result)) {
        expect(result.error).toBe(originalError);
      }
    });

    it("should return Err with new Error for thrown strings", async () => {
      const result = await handleAsync(async () => {
        throw "async string error";
      });
      expect(result.type).toBe("Err");
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toBe("async string error");
      }
    });

    it("should return Err with wrapped Error for other thrown types", async () => {
      const result = await handleAsync(async () => {
        throw 404;
      });
      expect(result.type).toBe("Err");
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toBe("Caught non-Error value: 404");
        expect((result.error as any).cause).toBe(404);
      }
    });

    it("should handle fetch-like patterns", async () => {
      // Simulate successful fetch
      const successResult = await handleAsync(async () => {
        const response = { ok: true, json: () => Promise.resolve({ id: 1 }) };
        return response.json();
      });
      expect(successResult).toEqual({ type: "Ok", value: { id: 1 } });

      // Simulate failed fetch
      const failResult = await handleAsync(async () => {
        throw new Error("Network error");
      });
      expect(failResult.type).toBe("Err");
      if (isErr(failResult)) {
        expect(failResult.error.message).toBe("Network error");
      }
    });
  });

  describe("handleWith()", () => {
    it("should return Ok for successful functions", () => {
      const result = handleWith(
        () => "success",
        (error) => ({ code: 500, message: error.message }),
      );
      expect(result).toEqual({ type: "Ok", value: "success" });
    });

    it("should map Error objects with custom function", () => {
      const result = handleWith(
        () => {
          throw new Error("original error");
        },
        (error) => ({ code: 500, message: error.message, type: "custom" }),
      );
      expect(result).toEqual({
        type: "Err",
        error: { code: 500, message: "original error", type: "custom" },
      });
    });

    it("should map string throws to Error then custom mapping", () => {
      const result = handleWith(
        () => {
          throw "string error";
        },
        (error) => ({ code: 400, message: error.message }),
      );
      expect(result).toEqual({
        type: "Err",
        error: { code: 400, message: "string error" },
      });
    });

    it("should map wrapped non-Error throws", () => {
      const result = handleWith(
        () => {
          throw 404;
        },
        (error) => ({
          code: 500,
          message: error.message,
          originalCause: (error as any).cause,
        }),
      );
      expect(result.type).toBe("Err");
      if (isErr(result)) {
        expect(result.error.code).toBe(500);
        expect(result.error.originalCause).toBe(404);
        expect(result.error.message).toBe("Caught non-Error value: 404");
      }
    });
  });

  describe("handleWithAsync()", () => {
    it("should return Ok for successful async functions", async () => {
      const result = await handleWithAsync(
        async () => "async success",
        (error) => ({ code: 500, message: error.message }),
      );
      expect(result).toEqual({ type: "Ok", value: "async success" });
    });

    it("should map async Error objects with custom function", async () => {
      const result = await handleWithAsync(
        async () => {
          throw new Error("async error");
        },
        (error) => ({
          code: 500,
          message: error.message,
          async: true,
        }),
      );
      expect(result).toEqual({
        type: "Err",
        error: { code: 500, message: "async error", async: true },
      });
    });

    it("should handle Promise rejections with wrapping", async () => {
      const result = await handleWithAsync(
        () => Promise.reject(42),
        (error) => ({
          type: "rejection",
          message: error.message,
          cause: (error as any).cause,
        }),
      );
      expect(result.type).toBe("Err");
      if (isErr(result)) {
        expect(result.error.type).toBe("rejection");
        expect(result.error.cause).toBe(42);
      }
    });
  });

  describe("match()", () => {
    it("should call Ok handler for Ok Results", () => {
      const result = match(ok("hello"), {
        Ok: (value) => `Success: ${value}`,
        Err: (error) => `Failed: ${error}`,
      });
      expect(result).toBe("Success: hello");
    });

    it("should call Err handler for Err Results", () => {
      const result = match(err("something failed"), {
        Ok: (value) => `Success: ${value}`,
        Err: (error) => `Failed: ${error}`,
      });
      expect(result).toBe("Failed: something failed");
    });

    it("should return different types from handlers", () => {
      const numberResult = match(ok(42), {
        Ok: (value) => value * 2,
        Err: () => 0,
      });
      expect(numberResult).toBe(84);

      const boolResult = match(err("error"), {
        Ok: () => true,
        Err: () => false,
      });
      expect(boolResult).toBe(false);
    });

    it("should work with Error objects in Err handlers", () => {
      const errorResult = match(
        handle(() => {
          throw new Error("test error");
        }),
        {
          Ok: (value) => `Success: ${value}`,
          Err: (error) => `Error: ${error.message}`,
        },
      );
      expect(errorResult).toBe("Error: test error");

      const wrappedResult = match(
        handle(() => {
          throw 404;
        }),
        {
          Ok: (value) => `Success: ${value}`,
          Err: (error) => ({
            message: error.message,
            cause: (error as any).cause,
          }),
        },
      );
      expect(wrappedResult).toEqual({
        message: "Caught non-Error value: 404",
        cause: 404,
      });
    });

    it("should work with complex transformations", () => {
      const processResult = (result: Result<number[], Error>) =>
        match(result, {
          Ok: (numbers) => ({
            sum: numbers.reduce((a, b) => a + b, 0),
            count: numbers.length,
            average:
              numbers.length > 0
                ? numbers.reduce((a, b) => a + b, 0) / numbers.length
                : 0,
          }),
          Err: (error) => ({ error: true, message: error.message }),
        });

      expect(processResult(ok([1, 2, 3, 4]))).toEqual({
        sum: 10,
        count: 4,
        average: 2.5,
      });

      expect(processResult(err(new Error("no data")))).toEqual({
        error: true,
        message: "no data",
      });
    });
  });

  describe("Type Safety", () => {
    it("should maintain type information through operations", () => {
      const stringResult: Result<string, number> = ok("hello");
      const numberResult: Result<number, string> = ok(42);
      const errorResult: Result<string, number> = err(404);

      // These should compile and work correctly
      if (isOk(stringResult)) {
        expect(stringResult.value.toUpperCase()).toBe("HELLO");
      }

      if (isOk(numberResult)) {
        expect(numberResult.value + 1).toBe(43);
      }

      if (isErr(errorResult)) {
        expect(errorResult.error + 1).toBe(405);
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty functions", () => {
      const result = handle(() => {});
      expect(result).toEqual({ type: "Ok", value: undefined });
    });

    it("should handle functions returning falsy values", () => {
      expect(handle(() => 0)).toEqual({ type: "Ok", value: 0 });
      expect(handle(() => false)).toEqual({ type: "Ok", value: false });
      expect(handle(() => "")).toEqual({ type: "Ok", value: "" });
      expect(handle(() => null)).toEqual({ type: "Ok", value: null });
      expect(handle(() => undefined)).toEqual({ type: "Ok", value: undefined });
    });

    it("should handle async functions returning falsy values", async () => {
      expect(await handleAsync(async () => 0)).toEqual({
        type: "Ok",
        value: 0,
      });
      expect(await handleAsync(async () => false)).toEqual({
        type: "Ok",
        value: false,
      });
      expect(await handleAsync(async () => "")).toEqual({
        type: "Ok",
        value: "",
      });
    });

    it("should handle various thrown types with wrapping", () => {
      const nullResult = handle(() => {
        throw null;
      });
      expect(nullResult.type).toBe("Err");
      if (isErr(nullResult)) {
        expect((nullResult.error as any).cause).toBe(null);
      }

      const undefinedResult = handle(() => {
        throw undefined;
      });
      expect(undefinedResult.type).toBe("Err");
      if (isErr(undefinedResult)) {
        expect((undefinedResult.error as any).cause).toBe(undefined);
      }

      const zeroResult = handle(() => {
        throw 0;
      });
      expect(zeroResult.type).toBe("Err");
      if (isErr(zeroResult)) {
        expect((zeroResult.error as any).cause).toBe(0);
      }

      const falseResult = handle(() => {
        throw false;
      });
      expect(falseResult.type).toBe("Err");
      if (isErr(falseResult)) {
        expect((falseResult.error as any).cause).toBe(false);
      }
    });
  });
});
