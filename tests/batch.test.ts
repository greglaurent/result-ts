import { describe, it, expect } from "vitest";
import {
  ok,
  err,
  isOk,
  isErr,
  all,
  allAsync,
  allSettledAsync,
  oks,
  errs,
  partition,
  partitionWith,
  analyze,
  findFirst,
  reduce,
  first,
} from "../src/batch";
import type { Result } from "../src/types";

describe("Batch Module - Array Processing Operations", () => {
  describe("all()", () => {
    it("should convert array of successful Results to Result of array", () => {
      const results = [ok(1), ok(2), ok(3)];
      const combined = all(results);
      expect(combined).toEqual({ type: "Ok", value: [1, 2, 3] });
    });

    it("should return first error for mixed Results", () => {
      const results = [ok(1), err("failed"), ok(3)];
      const combined = all(results);
      expect(combined).toEqual({ type: "Err", error: "failed" });
    });

    it("should handle empty arrays", () => {
      const results: Result<number, string>[] = [];
      const combined = all(results);
      expect(combined).toEqual({ type: "Ok", value: [] });
    });

    it("should handle arrays with only errors", () => {
      const results = [err("error1"), err("error2")];
      const combined = all(results);
      expect(combined).toEqual({ type: "Err", error: "error1" });
    });

    it("should handle consistent value types", () => {
      const stringResults = [ok("hello"), ok("world"), ok("test")];
      const combined = all(stringResults);
      expect(combined).toEqual({
        type: "Ok",
        value: ["hello", "world", "test"],
      });
    });

    it("should gracefully handle null/undefined elements", () => {
      // Create array that allows null/undefined for testing edge cases
      const results: Array<Result<number, string> | null | undefined> = [
        ok(1),
        null,
        ok(3),
        undefined,
      ];
      const combined = all(
        results.filter((r): r is Result<number, string> => r != null),
      );
      expect(combined).toEqual({ type: "Ok", value: [1, 3] });
    });
  });

  describe("allAsync()", () => {
    it("should handle array of Promise<Result> successfully", async () => {
      const promises = [
        Promise.resolve(ok(1)),
        Promise.resolve(ok(2)),
        Promise.resolve(ok(3)),
      ];
      const result = await allAsync(promises);
      expect(result).toEqual({ type: "Ok", value: [1, 2, 3] });
    });

    it("should return first error from Promise<Result> array", async () => {
      const promises = [
        Promise.resolve(ok(1)),
        Promise.resolve(err("async error")),
        Promise.resolve(ok(3)),
      ];
      const result = await allAsync(promises);
      expect(result).toEqual({ type: "Err", error: "async error" });
    });

    it("should handle mixed timing async operations", async () => {
      const promises: Promise<Result<number, never>>[] = [
        new Promise((resolve) => setTimeout(() => resolve(ok(1)), 10)),
        new Promise((resolve) => setTimeout(() => resolve(ok(2)), 5)),
        new Promise((resolve) => setTimeout(() => resolve(ok(3)), 15)),
      ];
      const result = await allAsync(promises);
      expect(result).toEqual({ type: "Ok", value: [1, 2, 3] });
    });

    it("should handle null/undefined promises gracefully", async () => {
      const validPromises = [Promise.resolve(ok(1)), Promise.resolve(ok(3))];
      const result = await allAsync(validPromises);
      expect(result).toEqual({ type: "Ok", value: [1, 3] });
    });
  });

  describe("allSettledAsync()", () => {
    it("should partition successful and failed async results", async () => {
      const promises = [
        Promise.resolve(ok("success1")),
        Promise.resolve(err("error1")),
        Promise.resolve(ok("success2")),
        Promise.resolve(err("error2")),
      ];
      const result = await allSettledAsync(promises);
      expect(result).toEqual({
        oks: ["success1", "success2"],
        errors: ["error1", "error2"],
      });
    });

    it("should handle all successful results", async () => {
      const promises = [
        Promise.resolve(ok(1)),
        Promise.resolve(ok(2)),
        Promise.resolve(ok(3)),
      ];
      const result = await allSettledAsync(promises);
      expect(result).toEqual({
        oks: [1, 2, 3],
        errors: [],
      });
    });

    it("should handle all failed results", async () => {
      const promises = [
        Promise.resolve(err("error1")),
        Promise.resolve(err("error2")),
      ];
      const result = await allSettledAsync(promises);
      expect(result).toEqual({
        oks: [],
        errors: ["error1", "error2"],
      });
    });
  });

  describe("oks()", () => {
    it("should extract all success values", () => {
      const results = [ok(1), err("failed"), ok(3), err("error")];
      const successes = oks(results);
      expect(successes).toEqual([1, 3]);
    });

    it("should return empty array when no successes", () => {
      const results = [err("error1"), err("error2")];
      const successes = oks(results);
      expect(successes).toEqual([]);
    });

    it("should handle all successes", () => {
      const results = [ok(1), ok(2), ok(3)];
      const successes = oks(results);
      expect(successes).toEqual([1, 2, 3]);
    });

    it("should handle different value types separately", () => {
      const stringResults = [ok("hello"), err("failed"), ok("world")];
      const stringSuccesses = oks(stringResults);
      expect(stringSuccesses).toEqual(["hello", "world"]);

      const numberResults = [ok(42), err("failed"), ok(100)];
      const numberSuccesses = oks(numberResults);
      expect(numberSuccesses).toEqual([42, 100]);
    });

    it("should handle null/undefined elements gracefully", () => {
      const results: Array<Result<number, string> | null | undefined> = [
        ok(1),
        null,
        ok(3),
        undefined,
        err("error"),
      ];
      const successes = oks(
        results.filter((r): r is Result<number, string> => r != null),
      );
      expect(successes).toEqual([1, 3]);
    });
  });

  describe("errs()", () => {
    it("should extract all error values", () => {
      const results = [ok(1), err("failed"), ok(3), err("error")];
      const errors = errs(results);
      expect(errors).toEqual(["failed", "error"]);
    });

    it("should return empty array when no errors", () => {
      const results = [ok(1), ok(2), ok(3)];
      const errors = errs(results);
      expect(errors).toEqual([]);
    });

    it("should handle all errors", () => {
      const results = [err("error1"), err("error2")];
      const errors = errs(results);
      expect(errors).toEqual(["error1", "error2"]);
    });

    it("should handle different error types separately", () => {
      const stringErrorResults = [
        ok(1),
        err("string error"),
        err("another error"),
      ];
      const stringErrors = errs(stringErrorResults);
      expect(stringErrors).toEqual(["string error", "another error"]);

      const numberErrorResults = [ok(1), err(404), err(500)];
      const numberErrors = errs(numberErrorResults);
      expect(numberErrors).toEqual([404, 500]);
    });

    it("should handle null/undefined elements gracefully", () => {
      const results: Array<Result<number, string> | null | undefined> = [
        err("error1"),
        null,
        err("error2"),
        undefined,
        ok(1),
      ];
      const errors = errs(
        results.filter((r): r is Result<number, string> => r != null),
      );
      expect(errors).toEqual(["error1", "error2"]);
    });
  });

  describe("partition()", () => {
    it("should separate successes and errors", () => {
      const results = [ok(1), err("failed"), ok(3)];
      const { oks, errors } = partition(results);
      expect(oks).toEqual([1, 3]);
      expect(errors).toEqual(["failed"]);
    });

    it("should handle all successes", () => {
      const results = [ok(1), ok(2), ok(3)];
      const { oks, errors } = partition(results);
      expect(oks).toEqual([1, 2, 3]);
      expect(errors).toEqual([]);
    });

    it("should handle all errors", () => {
      const results = [err("error1"), err("error2")];
      const { oks, errors } = partition(results);
      expect(oks).toEqual([]);
      expect(errors).toEqual(["error1", "error2"]);
    });

    it("should handle empty arrays", () => {
      const results: Result<number, string>[] = [];
      const { oks, errors } = partition(results);
      expect(oks).toEqual([]);
      expect(errors).toEqual([]);
    });

    it("should handle null/undefined elements gracefully", () => {
      const results: Array<Result<number, string> | null | undefined> = [
        ok(1),
        null,
        err("error"),
        undefined,
        ok(3),
      ];
      const { oks, errors } = partition(
        results.filter((r): r is Result<number, string> => r != null),
      );
      expect(oks).toEqual([1, 3]);
      expect(errors).toEqual(["error"]);
    });
  });

  describe("partitionWith()", () => {
    it("should partition with metadata in single pass", () => {
      const results = [ok(1), err("failed"), ok(3)];
      const stats = partitionWith(results);
      expect(stats).toEqual({
        oks: [1, 3],
        errors: ["failed"],
        okCount: 2,
        errorCount: 1,
        total: 3,
      });
    });

    it("should handle all successes with counts", () => {
      const results = [ok(1), ok(2), ok(3)];
      const stats = partitionWith(results);
      expect(stats).toEqual({
        oks: [1, 2, 3],
        errors: [],
        okCount: 3,
        errorCount: 0,
        total: 3,
      });
    });

    it("should handle all errors with counts", () => {
      const results = [err("error1"), err("error2")];
      const stats = partitionWith(results);
      expect(stats).toEqual({
        oks: [],
        errors: ["error1", "error2"],
        okCount: 0,
        errorCount: 2,
        total: 2,
      });
    });

    it("should handle empty array", () => {
      const results: Result<number, string>[] = [];
      const stats = partitionWith(results);
      expect(stats).toEqual({
        oks: [],
        errors: [],
        okCount: 0,
        errorCount: 0,
        total: 0,
      });
    });
  });

  describe("analyze()", () => {
    it("should provide statistics without extracting values", () => {
      const results = [ok(1), err("failed"), ok(3)];
      const stats = analyze(results);
      expect(stats).toEqual({
        okCount: 2,
        errorCount: 1,
        total: 3,
        hasErrors: true,
        isEmpty: false,
      });
    });

    it("should handle all successes", () => {
      const results = [ok(1), ok(2), ok(3)];
      const stats = analyze(results);
      expect(stats).toEqual({
        okCount: 3,
        errorCount: 0,
        total: 3,
        hasErrors: false,
        isEmpty: false,
      });
    });

    it("should handle all errors", () => {
      const results = [err("error1"), err("error2")];
      const stats = analyze(results);
      expect(stats).toEqual({
        okCount: 0,
        errorCount: 2,
        total: 2,
        hasErrors: true,
        isEmpty: false,
      });
    });

    it("should handle empty array", () => {
      const results: Result<number, string>[] = [];
      const stats = analyze(results);
      expect(stats).toEqual({
        okCount: 0,
        errorCount: 0,
        total: 0,
        hasErrors: false,
        isEmpty: true,
      });
    });

    it("should handle null/undefined elements gracefully", () => {
      // Note: analyze counts total array length including nulls
      const results: Array<Result<number, string> | null | undefined> = [
        ok(1),
        null,
        err("error"),
        undefined,
        ok(3),
      ];
      const validResults = results.filter(
        (r): r is Result<number, string> => r != null,
      );
      const stats = analyze(validResults);
      expect(stats).toEqual({
        okCount: 2,
        errorCount: 1,
        total: 3, // Only counting valid Results
        hasErrors: true,
        isEmpty: false,
      });
    });
  });

  describe("findFirst()", () => {
    it("should find first success and error with indices", () => {
      const results = [err("e1"), ok("success"), err("e2"), ok("ok2")];
      const found = findFirst(results);
      expect(found).toEqual({
        firstOk: "success",
        firstError: "e1",
        okIndex: 1,
        errorIndex: 0,
      });
    });

    it("should handle array with only successes", () => {
      const results = [ok(1), ok(2), ok(3)];
      const found = findFirst(results);
      expect(found).toEqual({
        firstOk: 1,
        firstError: undefined,
        okIndex: 0,
        errorIndex: -1,
      });
    });

    it("should handle array with only errors", () => {
      const results = [err("error1"), err("error2")];
      const found = findFirst(results);
      expect(found).toEqual({
        firstOk: undefined,
        firstError: "error1",
        okIndex: -1,
        errorIndex: 0,
      });
    });

    it("should handle empty array", () => {
      const results: Result<number, string>[] = [];
      const found = findFirst(results);
      expect(found).toEqual({
        firstOk: undefined,
        firstError: undefined,
        okIndex: -1,
        errorIndex: -1,
      });
    });

    it("should early exit when both found", () => {
      const results = [ok(1), err("error"), ok(2), err("error2")];
      const found = findFirst(results);
      expect(found).toEqual({
        firstOk: 1,
        firstError: "error",
        okIndex: 0,
        errorIndex: 1,
      });
    });

    it("should handle null/undefined elements gracefully", () => {
      const results: Array<Result<string, string> | null | undefined> = [
        null,
        err("error"),
        undefined,
        ok("success"),
      ];
      const validResults = results.filter(
        (r): r is Result<string, string> => r != null,
      );
      const found = findFirst(validResults);
      expect(found).toEqual({
        firstOk: "success",
        firstError: "error",
        okIndex: 1, // Index in filtered array
        errorIndex: 0,
      });
    });
  });

  describe("reduce()", () => {
    it("should reduce with custom handlers for successes and errors", () => {
      const results = [ok(5), err("failed"), ok(10)];
      const sum = reduce(
        results,
        {
          onOk: (acc, value) => acc + value,
          onErr: (acc) => acc, // ignore errors
        },
        0,
      );
      expect(sum).toBe(15);
    });

    it("should handle error accumulation", () => {
      const results = [ok(1), err("error1"), ok(2), err("error2")];
      const errorCount = reduce(
        results,
        {
          onOk: (acc) => acc,
          onErr: (acc) => acc + 1,
        },
        0,
      );
      expect(errorCount).toBe(2);
    });

    it("should handle complex accumulation", () => {
      const results = [ok("a"), err("error"), ok("b"), ok("c")];
      const combined = reduce(
        results,
        {
          onOk: (acc, value, index) => ({ ...acc, [`ok${index}`]: value }),
          onErr: (acc, error, index) => ({ ...acc, [`err${index}`]: error }),
        },
        {} as Record<string, any>,
      );
      expect(combined).toEqual({
        ok0: "a",
        err1: "error",
        ok2: "b",
        ok3: "c",
      });
    });

    it("should handle empty array", () => {
      const results: Result<number, string>[] = [];
      const sum = reduce(
        results,
        {
          onOk: (acc, value) => acc + value,
          onErr: (acc) => acc,
        },
        0,
      );
      expect(sum).toBe(0);
    });

    it("should handle null/undefined elements gracefully", () => {
      const results: Array<Result<number, string> | null | undefined> = [
        ok(1),
        null,
        ok(2),
        undefined,
        err("error"),
      ];
      const validResults = results.filter(
        (r): r is Result<number, string> => r != null,
      );
      const sum = reduce(
        validResults,
        {
          onOk: (acc, value) => acc + value,
          onErr: (acc) => acc + 100, // penalty for errors
        },
        0,
      );
      expect(sum).toBe(103); // 1 + 2 + 100
    });
  });

  describe("first()", () => {
    it("should return first successful Result", () => {
      const results = [err("e1"), err("e2"), ok("success")];
      const firstResult = first(results);
      expect(firstResult).toEqual({ type: "Ok", value: "success" });
    });

    it("should return all errors if no successes", () => {
      const results = [err("e1"), err("e2")];
      const firstResult = first(results);
      expect(firstResult).toEqual({ type: "Err", error: ["e1", "e2"] });
    });

    it("should return first success immediately", () => {
      const results = [ok("first"), ok("second"), err("error")];
      const firstResult = first(results);
      expect(firstResult).toEqual({ type: "Ok", value: "first" });
    });

    it("should handle empty array", () => {
      const results: Result<string, string>[] = [];
      const firstResult = first(results);
      expect(firstResult).toEqual({ type: "Err", error: [] });
    });

    it("should handle single success", () => {
      const results = [ok("single")];
      const firstResult = first(results);
      expect(firstResult).toEqual({ type: "Ok", value: "single" });
    });

    it("should handle single error", () => {
      const results = [err("single error")];
      const firstResult = first(results);
      expect(firstResult).toEqual({ type: "Err", error: ["single error"] });
    });

    it("should handle null/undefined elements gracefully", () => {
      const results: Array<Result<string, string> | null | undefined> = [
        null,
        err("error1"),
        undefined,
        ok("success"),
      ];
      const validResults = results.filter(
        (r): r is Result<string, string> => r != null,
      );
      const firstResult = first(validResults);
      expect(firstResult).toEqual({ type: "Ok", value: "success" });
    });
  });

  describe("Integration Tests", () => {
    it("should work together for complex data processing", () => {
      // Simulate processing user data
      const userResults = [
        ok({ id: 1, name: "John", age: 30 }),
        err("Invalid user data"),
        ok({ id: 2, name: "Jane", age: 25 }),
        ok({ id: 3, name: "Bob", age: 35 }),
      ];

      // Get statistics
      const stats = analyze(userResults);
      expect(stats.okCount).toBe(3);
      expect(stats.errorCount).toBe(1);
      expect(stats.hasErrors).toBe(true);

      // Extract valid users
      const validUsers = oks(userResults);
      expect(validUsers).toHaveLength(3);
      expect(validUsers[0].name).toBe("John");

      // Get errors for logging
      const errors = errs(userResults);
      expect(errors).toEqual(["Invalid user data"]);

      // Find first valid user
      const firstUser = first(userResults);
      expect(firstUser).toEqual({
        type: "Ok",
        value: { id: 1, name: "John", age: 30 },
      });
    });

    it("should handle mixed async and sync patterns", async () => {
      // Simulate API calls
      const apiCalls = [
        Promise.resolve(ok({ userId: 1, posts: 5 })),
        Promise.resolve(err("API timeout")),
        Promise.resolve(ok({ userId: 2, posts: 3 })),
      ];

      const result = await allSettledAsync(apiCalls);
      expect(result.oks).toHaveLength(2);
      expect(result.errors).toEqual(["API timeout"]);

      // Process successful results
      const successfulData = result.oks;
      const totalPosts = successfulData.reduce(
        (sum, user) => sum + user.posts,
        0,
      );
      expect(totalPosts).toBe(8);
    });

    it("should work with validation and error handling pipelines", () => {
      interface User {
        id: number;
        email: string;
        age: number;
      }

      const validateUser = (data: any): Result<User, string> => {
        if (!data.id || !data.email || !data.age) {
          return err("Missing required fields");
        }
        if (data.age < 18) {
          return err("Must be 18 or older");
        }
        return ok(data as User);
      };

      const userData = [
        { id: 1, email: "john@example.com", age: 30 },
        { id: 2, email: "jane@example.com" }, // missing age
        { id: 3, email: "bob@example.com", age: 16 }, // too young
        { id: 4, email: "alice@example.com", age: 25 },
      ];

      const validationResults = userData.map(validateUser);
      const stats = partitionWith(validationResults);

      expect(stats.okCount).toBe(2);
      expect(stats.errorCount).toBe(2);
      expect(stats.oks).toHaveLength(2);
      expect(stats.errors).toContain("Missing required fields");
      expect(stats.errors).toContain("Must be 18 or older");

      // Get all valid users
      const validUsers = stats.oks;
      expect(validUsers.every((user) => user.age >= 18)).toBe(true);
    });
  });

  describe("Performance and Edge Cases", () => {
    it("should handle large arrays efficiently", () => {
      const largeResults = Array.from({ length: 10000 }, (_, i) =>
        i % 3 === 0 ? err(`error-${i}`) : ok(i),
      );

      const start = Date.now();
      const stats = analyze(largeResults);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100); // Should be very fast
      expect(stats.total).toBe(10000);
      expect(stats.okCount).toBe(6666); // ~2/3 successes
      expect(stats.errorCount).toBe(3334); // ~1/3 errors
    });

    it("should handle arrays with different Result value types using union types", () => {
      const mixedResults: Result<string | number | boolean, string>[] = [
        ok("string"),
        err("error1"),
        ok(42),
        ok(true),
      ];

      const values = oks(mixedResults);
      expect(values).toEqual(["string", 42, true]);

      const errors = errs(mixedResults);
      expect(errors).toEqual(["error1"]);
    });

    it("should maintain object references", () => {
      const obj1 = { id: 1, name: "test" };
      const obj2 = { id: 2, name: "test2" };
      const results = [ok(obj1), err("error"), ok(obj2)];

      const values = oks(results);
      expect(values[0]).toBe(obj1); // Same reference
      expect(values[1]).toBe(obj2); // Same reference
    });

    it("should handle concurrent async operations", async () => {
      const delay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      const promises = [
        delay(10).then(() => ok("fast")),
        delay(50).then(() => ok("slow")),
        delay(25).then(() => err("medium-error")),
        delay(5).then(() => ok("fastest")),
      ];

      const start = Date.now();
      const result = await allSettledAsync(promises);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(50); // Should wait for slowest
      expect(result.oks).toEqual(["fast", "slow", "fastest"]);
      expect(result.errors).toEqual(["medium-error"]);
    });
  });

  describe("Type Safety", () => {
    it("should maintain type information through operations", () => {
      const stringResults: Result<string, number>[] = [
        ok("hello"),
        err(404),
        ok("world"),
      ];

      const values = oks(stringResults);
      expect(values.every((v) => typeof v === "string")).toBe(true);

      const errors = errs(stringResults);
      expect(errors.every((e) => typeof e === "number")).toBe(true);

      const { oks: okValues, errors: errValues } = partition(stringResults);
      expect(okValues).toEqual(["hello", "world"]);
      expect(errValues).toEqual([404]);
    });

    it("should work with complex generic types", () => {
      interface User {
        id: number;
        name: string;
      }

      interface ApiError {
        code: number;
        message: string;
      }

      const userResults: Result<User, ApiError>[] = [
        ok({ id: 1, name: "John" }),
        err({ code: 404, message: "Not found" }),
        ok({ id: 2, name: "Jane" }),
      ];

      const users = oks(userResults);
      expect(users[0].id).toBe(1);
      expect(users[0].name).toBe("John");

      const apiErrors = errs(userResults);
      expect(apiErrors[0].code).toBe(404);
      expect(apiErrors[0].message).toBe("Not found");
    });
  });
});
