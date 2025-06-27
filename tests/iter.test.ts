import { describe, it, expect } from "vitest";
import {
  ok,
  err,
  isOk,
  isErr,
  map,
  mapAsync,
  mapErr,
  mapErrAsync,
  andThen,
  andThenAsync,
  pipe,
} from "../src/iter";
import type { Result } from "../src/types";

describe("Iter Module - Data Transformation", () => {
  describe("map()", () => {
    it("should transform success values", () => {
      const result = map(ok(5), (x) => x * 2);
      expect(result).toEqual({ type: "Ok", value: 10 });
    });

    it("should pass through error values unchanged", () => {
      const result = map(err("failed"), (x: number) => x * 2);
      expect(result).toEqual({ type: "Err", error: "failed" });
    });

    it("should handle different transformation types", () => {
      // Number to string
      expect(map(ok(42), (x) => x.toString())).toEqual({
        type: "Ok",
        value: "42",
      });

      // String to object
      expect(map(ok("hello"), (s) => ({ message: s }))).toEqual({
        type: "Ok",
        value: { message: "hello" },
      });

      // Array transformation
      expect(map(ok([1, 2, 3]), (arr) => arr.length)).toEqual({
        type: "Ok",
        value: 3,
      });

      // Complex object transformation
      const user = { id: 1, name: "John" };
      expect(map(ok(user), (u) => ({ ...u, isActive: true }))).toEqual({
        type: "Ok",
        value: { id: 1, name: "John", isActive: true },
      });
    });

    it("should handle transformations that return null/undefined", () => {
      expect(map(ok(5), () => null)).toEqual({ type: "Ok", value: null });
      expect(map(ok(5), () => undefined)).toEqual({
        type: "Ok",
        value: undefined,
      });
    });

    it("should preserve error types", () => {
      const numberError: Result<string, number> = err(404);
      const result = map(numberError, (s: string) => s.toUpperCase());
      expect(result).toEqual({ type: "Err", error: 404 });

      if (isErr(result)) {
        expect(typeof result.error).toBe("number");
      }
    });
  });

  describe("mapAsync()", () => {
    it("should transform success values asynchronously", async () => {
      const promise = Promise.resolve(ok(5));
      const result = await mapAsync(promise, async (x) => x * 2);
      expect(result).toEqual({ type: "Ok", value: 10 });
    });

    it("should pass through error values unchanged", async () => {
      const promise = Promise.resolve(err("failed"));
      const result = await mapAsync(promise, async (x: number) => x * 2);
      expect(result).toEqual({ type: "Err", error: "failed" });
    });

    it("should handle async transformations", async () => {
      const promise = Promise.resolve(ok("hello"));
      const result = await mapAsync(promise, async (s) => {
        // Simulate async operation
        await new Promise((resolve) => setTimeout(resolve, 1));
        return s.toUpperCase();
      });
      expect(result).toEqual({ type: "Ok", value: "HELLO" });
    });

    it("should handle sync transformations in async context", async () => {
      const promise = Promise.resolve(ok(42));
      const result = await mapAsync(promise, (x) => x.toString());
      expect(result).toEqual({ type: "Ok", value: "42" });
    });

    it("should handle Promise.resolve in mapper", async () => {
      const promise = Promise.resolve(ok(10));
      const result = await mapAsync(promise, (x) => Promise.resolve(x + 5));
      expect(result).toEqual({ type: "Ok", value: 15 });
    });
  });

  describe("mapErr()", () => {
    it("should transform error values", () => {
      const result = mapErr(err("not found"), (error) => ({
        code: 404,
        message: error,
      }));
      expect(result).toEqual({
        type: "Err",
        error: { code: 404, message: "not found" },
      });
    });

    it("should pass through success values unchanged", () => {
      const result = mapErr(ok(42), (error) => ({ code: 500, message: error }));
      expect(result).toEqual({ type: "Ok", value: 42 });
    });

    it("should handle different error transformation types", () => {
      // String to number
      expect(mapErr(err("404"), (s) => parseInt(s))).toEqual({
        type: "Err",
        error: 404,
      });

      // Error object to custom format
      const error = new Error("Something failed");
      expect(
        mapErr(err(error), (e) => ({
          timestamp: Date.now(),
          message: e.message,
          type: "system_error",
        })),
      ).toEqual({
        type: "Err",
        error: {
          timestamp: expect.any(Number),
          message: "Something failed",
          type: "system_error",
        },
      });
    });

    it("should preserve success value types", () => {
      const stringResult: Result<string, number> = ok("hello");
      const result = mapErr(stringResult, (e: number) => e.toString());
      expect(result).toEqual({ type: "Ok", value: "hello" });

      if (isOk(result)) {
        expect(typeof result.value).toBe("string");
      }
    });
  });

  describe("mapErrAsync()", () => {
    it("should transform error values asynchronously", async () => {
      const promise = Promise.resolve(err("failed"));
      const result = await mapErrAsync(promise, async (error) => ({
        code: 500,
        message: error,
        timestamp: Date.now(),
      }));

      expect(result.type).toBe("Err");
      if (isErr(result)) {
        expect(result.error).toMatchObject({
          code: 500,
          message: "failed",
          timestamp: expect.any(Number),
        });
      }
    });

    it("should pass through success values unchanged", async () => {
      const promise = Promise.resolve(ok(42));
      const result = await mapErrAsync(promise, async (error) => ({
        code: 500,
        message: error,
      }));
      expect(result).toEqual({ type: "Ok", value: 42 });
    });

    it("should handle async error transformations", async () => {
      const promise = Promise.resolve(err("timeout"));
      const result = await mapErrAsync(promise, async (error) => {
        // Simulate async logging
        await new Promise((resolve) => setTimeout(resolve, 1));
        return { logged: true, originalError: error };
      });

      expect(result).toEqual({
        type: "Err",
        error: { logged: true, originalError: "timeout" },
      });
    });

    it("should handle sync transformations in async context", async () => {
      const promise = Promise.resolve(err(404));
      const result = await mapErrAsync(promise, (code) => `Error ${code}`);
      expect(result).toEqual({ type: "Err", error: "Error 404" });
    });
  });

  describe("andThen()", () => {
    it("should chain successful operations", () => {
      const getUser = (id: number) => ok({ id, name: "John" });
      const getUserEmail = (user: { id: number }) =>
        ok(`${user.id}@example.com`);

      const result = andThen(getUser(1), getUserEmail);
      expect(result).toEqual({ type: "Ok", value: "1@example.com" });
    });

    it("should short-circuit on first error", () => {
      const getUser = (id: number) => err("User not found");
      const getUserEmail = (user: { id: number }) =>
        ok(`${user.id}@example.com`);

      const result = andThen(getUser(1), getUserEmail);
      expect(result).toEqual({ type: "Err", error: "User not found" });
    });

    it("should handle subsequent failures", () => {
      const getUser = (id: number) => ok({ id, name: "John" });
      const getUserEmail = () => err("Email service down");

      const result = andThen(getUser(1), getUserEmail);
      expect(result).toEqual({ type: "Err", error: "Email service down" });
    });

    it("should work with complex chaining", () => {
      const parseNumber = (s: string): Result<number, string> => {
        const num = parseInt(s);
        return isNaN(num) ? err("Not a number") : ok(num);
      };

      const validatePositive = (n: number): Result<number, string> => {
        return n > 0 ? ok(n) : err("Must be positive");
      };

      const double = (n: number): Result<number, string> => ok(n * 2);

      // Success path
      const successResult = andThen(
        andThen(parseNumber("5"), validatePositive),
        double,
      );
      expect(successResult).toEqual({ type: "Ok", value: 10 });

      // Failure at parsing
      const parseFailure = andThen(
        andThen(parseNumber("abc"), validatePositive),
        double,
      );
      expect(parseFailure).toEqual({ type: "Err", error: "Not a number" });

      // Failure at validation
      const validationFailure = andThen(
        andThen(parseNumber("-5"), validatePositive),
        double,
      );
      expect(validationFailure).toEqual({
        type: "Err",
        error: "Must be positive",
      });
    });
  });

  describe("andThenAsync()", () => {
    it("should chain successful async operations", async () => {
      const fetchUser = async (id: number) => ok({ id, name: "John" });
      const fetchUserPosts = async (user: { id: number }) =>
        ok([
          { id: 1, title: "Post 1", authorId: user.id },
          { id: 2, title: "Post 2", authorId: user.id },
        ]);

      const result = await andThenAsync(fetchUser(1), fetchUserPosts);
      expect(result).toEqual({
        type: "Ok",
        value: [
          { id: 1, title: "Post 1", authorId: 1 },
          { id: 2, title: "Post 2", authorId: 1 },
        ],
      });
    });

    it("should short-circuit on async error", async () => {
      const fetchUser = async (id: number) => err("User not found");
      const fetchUserPosts = async (user: { id: number }) => ok([]);

      const result = await andThenAsync(fetchUser(1), fetchUserPosts);
      expect(result).toEqual({ type: "Err", error: "User not found" });
    });

    it("should handle subsequent async failures", async () => {
      const fetchUser = async (id: number) => ok({ id, name: "John" });
      const fetchUserPosts = async () => err("Posts service unavailable");

      const result = await andThenAsync(fetchUser(1), fetchUserPosts);
      expect(result).toEqual({
        type: "Err",
        error: "Posts service unavailable",
      });
    });

    it("should work with mixed sync/async operations", async () => {
      const syncOperation = (n: number) => ok(n * 2);
      const asyncOperation = async (n: number) => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return ok(n + 10);
      };

      const result = await andThenAsync(
        Promise.resolve(ok(5)),
        async (value) => {
          const doubled = syncOperation(value);
          if (isErr(doubled)) return doubled;
          return await asyncOperation(doubled.value);
        },
      );

      expect(result).toEqual({ type: "Ok", value: 20 }); // (5 * 2) + 10
    });
  });

  describe("pipe()", () => {
    it("should chain operations efficiently", () => {
      const add1 = (x: number) => ok(x + 1);
      const multiply2 = (x: number) => ok(x * 2);
      const subtract3 = (x: number) => ok(x - 3);

      const result = pipe(ok(5), add1, multiply2, subtract3);
      expect(result).toEqual({ type: "Ok", value: 9 }); // ((5 + 1) * 2) - 3 = 9
    });

    it("should early exit on first error", () => {
      const add1 = (x: number) => ok(x + 1);
      const failOperation = () => err("Operation failed");
      const multiply2 = (x: number) => ok(x * 2);

      const result = pipe(ok(5), add1, failOperation, multiply2);
      expect(result).toEqual({ type: "Err", error: "Operation failed" });
    });

    it("should handle complex operation chains", () => {
      const parseNumber = (s: string): Result<number, string> => {
        const num = parseInt(s);
        return isNaN(num) ? err("Not a number") : ok(num);
      };

      const validateRange = (n: number): Result<number, string> => {
        return n >= 1 && n <= 100 ? ok(n) : err("Out of range");
      };

      const square = (n: number) => ok(n * n);
      const toString = (n: number) => ok(n.toString());

      // Success case
      const success = pipe(parseNumber("5"), validateRange, square, toString);
      expect(success).toEqual({ type: "Ok", value: "25" });

      // Failure case - out of range
      const failure = pipe(parseNumber("150"), validateRange, square, toString);
      expect(failure).toEqual({ type: "Err", error: "Out of range" });
    });

    it("should work with single operation", () => {
      const double = (x: number) => ok(x * 2);
      const result = pipe(ok(5), double);
      expect(result).toEqual({ type: "Ok", value: 10 });
    });

    it("should work with many operations", () => {
      const ops = Array(10)
        .fill(0)
        .map((_, i) => (x: number) => ok(x + i));
      const result = pipe(ok(0), ...ops);
      expect(result).toEqual({ type: "Ok", value: 45 }); // 0 + 0 + 1 + 2 + ... + 9 = 45
    });

    it("should pass through initial errors", () => {
      const add1 = (x: number) => ok(x + 1);
      const result = pipe(err("initial error"), add1);
      expect(result).toEqual({ type: "Err", error: "initial error" });
    });
  });

  describe("Integration Tests", () => {
    it("should work together for complex workflows", () => {
      // Simulate a user data processing pipeline
      interface User {
        id: number;
        name: string;
        email?: string;
      }

      const users: User[] = [
        { id: 1, name: "John" },
        { id: 2, name: "Jane", email: "jane@example.com" },
      ];

      const findUser = (id: number): Result<User, string> => {
        const user = users.find((u) => u.id === id);
        return user ? ok(user) : err("User not found");
      };

      const addEmail = (user: User): Result<User, string> => {
        if (user.email) return ok(user);
        return ok({ ...user, email: `${user.name.toLowerCase()}@example.com` });
      };

      const formatUser = (user: User): Result<string, string> => {
        return ok(`${user.name} <${user.email}>`);
      };

      // Using pipe for clean composition
      const result1 = pipe(findUser(1), addEmail, formatUser);
      expect(result1).toEqual({ type: "Ok", value: "John <john@example.com>" });

      const result2 = pipe(findUser(2), addEmail, formatUser);
      expect(result2).toEqual({ type: "Ok", value: "Jane <jane@example.com>" });

      const result3 = pipe(findUser(99), addEmail, formatUser);
      expect(result3).toEqual({ type: "Err", error: "User not found" });
    });

    it("should handle mixed sync/async operations in real workflow", async () => {
      // Simulate an API data processing workflow
      const validateInput = (input: string): Result<string, string> => {
        return input.trim().length > 0 ? ok(input.trim()) : err("Empty input");
      };

      const fetchUserData = async (username: string) => {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1));
        return username === "john"
          ? ok({ id: 1, username: "john", followers: 150 })
          : err("User not found");
      };

      const enrichWithMetadata = (user: any): Result<any, string> => {
        return ok({
          ...user,
          isPopular: user.followers > 100,
          displayName: `@${user.username}`,
        });
      };

      // Chain sync and async operations
      const processUser = async (input: string) => {
        const validatedInput = validateInput(input);
        if (isErr(validatedInput)) return validatedInput;

        const userData = await fetchUserData(validatedInput.value);
        if (isErr(userData)) return userData;

        return enrichWithMetadata(userData.value);
      };

      // Success case
      const success = await processUser("john");
      expect(success).toEqual({
        type: "Ok",
        value: {
          id: 1,
          username: "john",
          followers: 150,
          isPopular: true,
          displayName: "@john",
        },
      });

      // Validation failure
      const validationFailure = await processUser("  ");
      expect(validationFailure).toEqual({ type: "Err", error: "Empty input" });

      // API failure
      const apiFailure = await processUser("unknown");
      expect(apiFailure).toEqual({ type: "Err", error: "User not found" });
    });
  });

  describe("Type Safety", () => {
    it("should maintain proper type inference through transformations", () => {
      // TypeScript should infer types correctly through the chain
      const stringResult: Result<string, number> = ok("hello");

      const numberResult = map(stringResult, (s) => s.length);
      if (isOk(numberResult)) {
        expect(typeof numberResult.value).toBe("number");
        expect(numberResult.value).toBe(5);
      }

      const booleanResult = map(numberResult, (n) => n > 3);
      if (isOk(booleanResult)) {
        expect(typeof booleanResult.value).toBe("boolean");
        expect(booleanResult.value).toBe(true);
      }
    });

    it("should maintain error types through operations", () => {
      const numberError: Result<string, number> = err(404);

      const mapped = map(numberError, (s: string) => s.toUpperCase());
      const chained = andThen(mapped, (s) => ok(s.length));

      if (isErr(chained)) {
        expect(typeof chained.error).toBe("number");
        expect(chained.error).toBe(404);
      }
    });
  });

  describe("Performance Characteristics", () => {
    it("should handle large data transformations efficiently", () => {
      // Test with reasonably large dataset
      const largeArray = Array.from({ length: 1000 }, (_, i) => i);

      const result = pipe(
        ok(largeArray),
        (arr: number[]) => ok(arr.map((x) => x * 2)),
        (arr: number[]) => ok(arr.filter((x) => x % 4 === 0)),
        (arr: number[]) => ok(arr.reduce((sum, x) => sum + x, 0)),
      );

      expect(result.type).toBe("Ok");
      if (isOk(result)) {
        expect(typeof result.value).toBe("number");
        expect(result.value).toBeGreaterThan(0);
      }
    });

    it("should short-circuit efficiently in long chains", () => {
      const add1 = (x: number) => ok(x + 1);
      const multiply2 = (x: number) => ok(x * 2);
      const subtract3 = (x: number) => ok(x - 3);
      const add10 = (x: number) => ok(x + 10);

      const ops = Array(10)
        .fill(0)
        .map((_, i) => (x: number) => ok(x + i));
      const result = pipe(ok(0), ...ops);
    });
  });
});
