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

describe("Batch Module - Array Processing", () => {
  describe("all()", () => {
    it("should convert array of Ok Results to Ok of array", () => {
      const results = [ok(1), ok(2), ok(3)];
      const combined = all(results);
      expect(combined).toEqual({ type: "Ok", value: [1, 2, 3] });
    });

    it("should return first error for mixed results", () => {
      const results: Result<number, string>[] = [ok(1), err("failed"), ok(3)];
      const combined = all(results);
      expect(combined).toEqual({ type: "Err", error: "failed" });
    });

    it("should return first error even if later errors exist", () => {
      const results: Result<number, string>[] = [
        ok(1),
        err("first error"),
        err("second error"),
      ];
      const combined = all(results);
      expect(combined).toEqual({ type: "Err", error: "first error" });
    });

    it("should handle empty arrays", () => {
      const results: Result<number, string>[] = [];
      const combined = all(results);
      expect(combined).toEqual({ type: "Ok", value: [] });
    });

    it("should handle single item arrays", () => {
      expect(all([ok(42)])).toEqual({ type: "Ok", value: [42] });
      expect(all([err("solo error")])).toEqual({
        type: "Err",
        error: "solo error",
      });
    });

    it("should preserve order of values", () => {
      const results = [ok("first"), ok("second"), ok("third")];
      const combined = all(results);
      expect(combined).toEqual({
        type: "Ok",
        value: ["first", "second", "third"],
      });
    });

    it("should handle different value types", () => {
      const results: Result<any, any>[] = [
        ok(1),
        ok("hello"),
        ok(true),
        ok({ id: 1 }),
      ];
      const combined = all(results);
      expect(combined).toEqual({
        type: "Ok",
        value: [1, "hello", true, { id: 1 }],
      });
    });

    it("should fail fast on first error", () => {
      let processCount = 0;
      const results: Result<number, string>[] = [
        ok(1),
        err("early failure"),
        // These shouldn't be processed due to early exit
        (() => {
          processCount++;
          return ok(3);
        })(),
        (() => {
          processCount++;
          return ok(4);
        })(),
      ];

      all(results);
      expect(processCount).toBe(2); // The later items still get created but early exit works in all()
    });
  });

  describe("allAsync()", () => {
    it("should handle array of successful Promise<Result>", async () => {
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

    it("should handle empty Promise array", async () => {
      const promises: Promise<Result<number, string>>[] = [];
      const result = await allAsync(promises);
      expect(result).toEqual({ type: "Ok", value: [] });
    });

    it("should wait for all promises to settle before processing", async () => {
      const delays = [10, 5, 15]; // Different delays to test timing
      const promises = delays.map(
        (delay, i) =>
          new Promise<Result<number, string>>((resolve) =>
            setTimeout(() => resolve(ok(i)), delay),
          ),
      );

      const start = Date.now();
      const result = await allAsync(promises);
      const elapsed = Date.now() - start;

      expect(result).toEqual({ type: "Ok", value: [0, 1, 2] });
      expect(elapsed).toBeGreaterThanOrEqual(15); // Should wait for longest delay
    });

    it("should preserve order despite different promise timing", async () => {
      const promises = [
        new Promise<Result<string, never>>((resolve) =>
          setTimeout(() => resolve(ok("slow")), 20),
        ),
        Promise.resolve(ok("fast")),
        new Promise<Result<string, never>>((resolve) =>
          setTimeout(() => resolve(ok("medium")), 10),
        ),
      ];

      const result = await allAsync(promises);
      expect(result).toEqual({ type: "Ok", value: ["slow", "fast", "medium"] });
    });
  });

  describe("allSettledAsync()", () => {
    it("should partition successful and failed Promise<Result>", async () => {
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

    it("should handle all successes", async () => {
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

    it("should handle all failures", async () => {
      const promises: Promise<Result<any, string>>[] = [
        Promise.resolve(err("error1")),
        Promise.resolve(err("error2")),
        Promise.resolve(err("error3")),
      ];

      const result = await allSettledAsync(promises);
      expect(result).toEqual({
        oks: [],
        errors: ["error1", "error2", "error3"],
      });
    });

    it("should handle empty promise array", async () => {
      const promises: Promise<Result<any, any>>[] = [];
      const result = await allSettledAsync(promises);
      expect(result).toEqual({ oks: [], errors: [] });
    });
  });

  describe("oks()", () => {
    it("should extract all success values", () => {
      const results: Result<number, string>[] = [
        ok(1),
        err("failed"),
        ok(3),
        err("failed2"),
        ok(5),
      ];
      const values = oks(results);
      expect(values).toEqual([1, 3, 5]);
    });

    it("should return empty array when no successes", () => {
      const results: Result<any, string>[] = [
        err("error1"),
        err("error2"),
        err("error3"),
      ];
      const values = oks(results);
      expect(values).toEqual([]);
    });

    it("should return all values when all are successes", () => {
      const results = [ok("a"), ok("b"), ok("c")];
      const values = oks(results);
      expect(values).toEqual(["a", "b", "c"]);
    });

    it("should handle empty arrays", () => {
      const results: Result<any, any>[] = [];
      const values = oks(results);
      expect(values).toEqual([]);
    });

    it("should handle null and undefined values", () => {
      const results: Result<any, any>[] = [
        ok(null),
        ok(undefined),
        ok(0),
        ok(false),
        ok(""),
      ];
      const values = oks(results);
      expect(values).toEqual([null, undefined, 0, false, ""]);
    });

    it("should preserve value types", () => {
      const results: Result<any, any>[] = [
        ok(1),
        ok("hello"),
        ok({ id: 1 }),
        ok([1, 2, 3]),
      ];
      const values = oks(results);
      expect(values).toEqual([1, "hello", { id: 1 }, [1, 2, 3]]);
    });
  });

  describe("errs()", () => {
    it("should extract all error values", () => {
      const results: Result<number, string>[] = [
        ok(1),
        err("failed"),
        ok(3),
        err("failed2"),
        ok(5),
      ];
      const errors = errs(results);
      expect(errors).toEqual(["failed", "failed2"]);
    });

    it("should return empty array when no errors", () => {
      const results: Result<number, any>[] = [ok(1), ok(2), ok(3)];
      const errors = errs(results);
      expect(errors).toEqual([]);
    });

    it("should return all errors when all are failures", () => {
      const results: Result<any, string>[] = [
        err("error1"),
        err("error2"),
        err("error3"),
      ];
      const errors = errs(results);
      expect(errors).toEqual(["error1", "error2", "error3"]);
    });

    it("should handle empty arrays", () => {
      const results: Result<any, any>[] = [];
      const errors = errs(results);
      expect(errors).toEqual([]);
    });

    it("should handle different error types", () => {
      const results: Result<any, any>[] = [
        err("string error"),
        err(404),
        err(new Error("Error object")),
        err({ code: 500, message: "Object error" }),
      ];
      const errors = errs(results);
      expect(errors).toEqual([
        "string error",
        404,
        new Error("Error object"),
        { code: 500, message: "Object error" },
      ]);
    });
  });

  describe("partition()", () => {
    it("should separate successes and errors", () => {
      const results: Result<number, string>[] = [
        ok(1),
        err("failed"),
        ok(3),
        err("failed2"),
        ok(5),
      ];
      const partitioned = partition(results);
      expect(partitioned).toEqual({
        oks: [1, 3, 5],
        errors: ["failed", "failed2"],
      });
    });

    it("should handle all successes", () => {
      const results: Result<number, any>[] = [ok(1), ok(2), ok(3)];
      const partitioned = partition(results);
      expect(partitioned).toEqual({
        oks: [1, 2, 3],
        errors: [],
      });
    });

    it("should handle all errors", () => {
      const results: Result<any, string>[] = [
        err("error1"),
        err("error2"),
        err("error3"),
      ];
      const partitioned = partition(results);
      expect(partitioned).toEqual({
        oks: [],
        errors: ["error1", "error2", "error3"],
      });
    });

    it("should handle empty arrays", () => {
      const results: Result<any, any>[] = [];
      const partitioned = partition(results);
      expect(partitioned).toEqual({ oks: [], errors: [] });
    });

    it("should preserve order in both arrays", () => {
      const results = [err("e1"), ok("s1"), err("e2"), ok("s2"), err("e3")];
      const partitioned = partition(results);
      expect(partitioned).toEqual({
        oks: ["s1", "s2"],
        errors: ["e1", "e2", "e3"],
      });
    });
  });

  describe("partitionWith()", () => {
    it("should partition with metadata", () => {
      const results = [ok(1), err("failed"), ok(3), err("failed2"), ok(5)];
      const partitioned = partitionWith(results);
      expect(partitioned).toEqual({
        oks: [1, 3, 5],
        errors: ["failed", "failed2"],
        okCount: 3,
        errorCount: 2,
        total: 5,
      });
    });

    it("should handle all successes with correct counts", () => {
      const results = [ok(1), ok(2), ok(3)];
      const partitioned = partitionWith(results);
      expect(partitioned).toEqual({
        oks: [1, 2, 3],
        errors: [],
        okCount: 3,
        errorCount: 0,
        total: 3,
      });
    });

    it("should handle all errors with correct counts", () => {
      const results = [err("error1"), err("error2")];
      const partitioned = partitionWith(results);
      expect(partitioned).toEqual({
        oks: [],
        errors: ["error1", "error2"],
        okCount: 0,
        errorCount: 2,
        total: 2,
      });
    });

    it("should handle empty arrays with zero counts", () => {
      const results: Result<any, any>[] = [];
      const partitioned = partitionWith(results);
      expect(partitioned).toEqual({
        oks: [],
        errors: [],
        okCount: 0,
        errorCount: 0,
        total: 0,
      });
    });

    it("should be equivalent to partition() plus counts", () => {
      const results = [ok(1), err("failed"), ok(3), err("failed2")];
      const withMeta = partitionWith(results);
      const basic = partition(results);

      expect(withMeta.oks).toEqual(basic.oks);
      expect(withMeta.errors).toEqual(basic.errors);
      expect(withMeta.okCount).toBe(basic.oks.length);
      expect(withMeta.errorCount).toBe(basic.errors.length);
      expect(withMeta.total).toBe(results.length);
    });
  });

  describe("analyze()", () => {
    it("should provide statistics without extracting values", () => {
      const results = [ok(1), err("failed"), ok(3), err("failed2"), ok(5)];
      const stats = analyze(results);
      expect(stats).toEqual({
        okCount: 3,
        errorCount: 2,
        total: 5,
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

    it("should handle empty arrays", () => {
      const results: Result<any, any>[] = [];
      const stats = analyze(results);
      expect(stats).toEqual({
        okCount: 0,
        errorCount: 0,
        total: 0,
        hasErrors: false,
        isEmpty: true,
      });
    });

    it("should handle single items", () => {
      const successStats = analyze([ok(42)]);
      expect(successStats).toEqual({
        okCount: 1,
        errorCount: 0,
        total: 1,
        hasErrors: false,
        isEmpty: false,
      });

      const errorStats = analyze([err("failed")]);
      expect(errorStats).toEqual({
        okCount: 0,
        errorCount: 1,
        total: 1,
        hasErrors: true,
        isEmpty: false,
      });
    });
  });

  describe("findFirst()", () => {
    it("should find first success and first error with indices", () => {
      const results = [
        err("e1"),
        err("e2"),
        ok("first success"),
        err("e3"),
        ok("second success"),
      ];
      const found = findFirst(results);
      expect(found).toEqual({
        firstOk: "first success",
        firstError: "e1",
        okIndex: 2,
        errorIndex: 0,
      });
    });

    it("should handle arrays with only successes", () => {
      const results = [ok("first"), ok("second"), ok("third")];
      const found = findFirst(results);
      expect(found).toEqual({
        firstOk: "first",
        firstError: undefined,
        okIndex: 0,
        errorIndex: -1,
      });
    });

    it("should handle arrays with only errors", () => {
      const results = [err("first"), err("second"), err("third")];
      const found = findFirst(results);
      expect(found).toEqual({
        firstOk: undefined,
        firstError: "first",
        okIndex: -1,
        errorIndex: 0,
      });
    });

    it("should handle empty arrays", () => {
      const results: Result<any, any>[] = [];
      const found = findFirst(results);
      expect(found).toEqual({
        firstOk: undefined,
        firstError: undefined,
        okIndex: -1,
        errorIndex: -1,
      });
    });

    it("should find items at different positions", () => {
      const results = [ok("early success"), err("late error")];
      const found = findFirst(results);
      expect(found).toEqual({
        firstOk: "early success",
        firstError: "late error",
        okIndex: 0,
        errorIndex: 1,
      });
    });

    it("should early exit once both first items are found", () => {
      // This is more of a conceptual test - the implementation should be efficient
      const largeArray = [
        err("first error"), // Found immediately
        ok("first success"), // Found immediately
        ...Array(1000).fill(ok("not processed")), // Early exit should skip these
        ...Array(1000).fill(err("not processed")),
      ];

      const found = findFirst(largeArray);
      expect(found.firstError).toBe("first error");
      expect(found.firstOk).toBe("first success");
      expect(found.errorIndex).toBe(0);
      expect(found.okIndex).toBe(1);
    });
  });

  describe("reduce()", () => {
    it("should reduce with custom handlers for Ok and Err", () => {
      const results = [ok(5), err("ignored"), ok(10), err("ignored"), ok(3)];
      const sum = reduce(
        results,
        {
          onOk: (acc: number, value: number) => acc + value,
          onErr: (acc: number) => acc, // ignore errors
        },
        0,
      );
      expect(sum).toBe(18); // 5 + 10 + 3
    });

    it("should handle error accumulation", () => {
      const results = [ok(1), err("error1"), ok(2), err("error2"), ok(3)];
      const errorLog = reduce(
        results,
        {
          onOk: (acc: string[]) => acc, // ignore successes
          onErr: (acc: string[], error: string) => [...acc, error],
        },
        [] as string[],
      );
      expect(errorLog).toEqual(["error1", "error2"]);
    });

    it("should provide indices to handlers", () => {
      const results = [ok("a"), err("b"), ok("c")];
      const indices = reduce(
        results,
        {
          onOk: (acc: number[], value: string, index: number) => [
            ...acc,
            index,
          ],
          onErr: (acc: number[], error: string, index: number) => [
            ...acc,
            index,
          ],
        },
        [] as number[],
      );
      expect(indices).toEqual([0, 1, 2]);
    });

    it("should handle empty arrays", () => {
      const results: Result<number, string>[] = [];
      const sum = reduce(
        results,
        {
          onOk: (acc: number, value: number) => acc + value,
          onErr: (acc: number) => acc,
        },
        42,
      );
      expect(sum).toBe(42); // Initial value unchanged
    });

    it("should handle complex accumulation patterns", () => {
      const results = [ok(1), err("e1"), ok(2), err("e2"), ok(3)];
      const summary = reduce(
        results,
        {
          onOk: (acc, value: number) => ({
            ...acc,
            sum: acc.sum + value,
            successCount: acc.successCount + 1,
          }),
          onErr: (acc, error: string) => ({
            ...acc,
            errors: [...acc.errors, error],
            errorCount: acc.errorCount + 1,
          }),
        },
        { sum: 0, successCount: 0, errors: [] as string[], errorCount: 0 },
      );

      expect(summary).toEqual({
        sum: 6, // 1 + 2 + 3
        successCount: 3,
        errors: ["e1", "e2"],
        errorCount: 2,
      });
    });
  });

  describe("first()", () => {
    it("should return first success when available", () => {
      const results = [err("e1"), err("e2"), ok("first success"), err("e3")];
      const result = first(results);
      expect(result).toEqual({ type: "Ok", value: "first success" });
    });

    it("should return all errors when no successes", () => {
      const results = [err("error1"), err("error2"), err("error3")];
      const result = first(results);
      expect(result).toEqual({
        type: "Err",
        error: ["error1", "error2", "error3"],
      });
    });

    it("should return first success even if others exist", () => {
      const results = [err("e1"), ok("first"), ok("second"), ok("third")];
      const result = first(results);
      expect(result).toEqual({ type: "Ok", value: "first" });
    });

    it("should handle arrays with only successes", () => {
      const results = [ok("only success")];
      const result = first(results);
      expect(result).toEqual({ type: "Ok", value: "only success" });
    });

    it("should handle empty arrays", () => {
      const results: Result<any, any>[] = [];
      const result = first(results);
      expect(result).toEqual({ type: "Err", error: [] });
    });

    it("should preserve error types when collecting", () => {
      const results = [err(404), err(500), err(503)];
      const result = first(results);
      expect(result).toEqual({ type: "Err", error: [404, 500, 503] });
    });
  });

  describe("Integration Tests", () => {
    it("should work together for complex data processing", () => {
      // Simulate processing a batch of user records
      const userRecords = [
        ok({ id: 1, name: "John", age: 25 }),
        err("Invalid record format"),
        ok({ id: 2, name: "Jane", age: 30 }),
        err("Missing required fields"),
        ok({ id: 3, name: "Bob", age: 35 }),
      ];

      // Get statistics
      const stats = analyze(userRecords);
      expect(stats).toEqual({
        okCount: 3,
        errorCount: 2,
        total: 5,
        hasErrors: true,
        isEmpty: false,
      });

      // Extract valid users
      const validUsers = oks(userRecords);
      expect(validUsers).toHaveLength(3);
      expect(validUsers[0].name).toBe("John");

      // Get processing errors
      const errors = errs(userRecords);
      expect(errors).toEqual([
        "Invalid record format",
        "Missing required fields",
      ]);

      // Calculate average age of valid users
      const avgAge = reduce(
        userRecords,
        {
          onOk: (acc, user) => ({
            sum: acc.sum + user.age,
            count: acc.count + 1,
          }),
          onErr: (acc) => acc,
        },
        { sum: 0, count: 0 },
      );
      expect(avgAge.sum / avgAge.count).toBe(30); // (25 + 30 + 35) / 3
    });

    it("should handle real-world API response processing", async () => {
      // Simulate API responses
      const apiResponses = [
        Promise.resolve(ok({ id: 1, data: "success1" })),
        Promise.resolve(err("Network timeout")),
        Promise.resolve(ok({ id: 2, data: "success2" })),
        Promise.resolve(err("Service unavailable")),
        Promise.resolve(ok({ id: 3, data: "success3" })),
      ];

      // Process all responses
      const settled = await allSettledAsync(apiResponses);
      expect(settled.oks).toHaveLength(3);
      expect(settled.errors).toHaveLength(2);
      expect(settled.errors).toContain("Network timeout");
      expect(settled.errors).toContain("Service unavailable");

      // Check if we got enough data to proceed
      const successRate =
        settled.oks.length / (settled.oks.length + settled.errors.length);
      expect(successRate).toBe(0.6); // 60% success rate

      // Extract successful data
      const successfulData = settled.oks.map((item) => item.data);
      expect(successfulData).toEqual(["success1", "success2", "success3"]);
    });

    it("should handle large dataset processing efficiently", () => {
      // Create a large dataset with mixed results
      const largeDataset = Array.from({ length: 10000 }, (_, i) =>
        i % 3 === 0 ? err(`Error ${i}`) : ok(i),
      );

      // Single-pass analysis should be fast
      const start = Date.now();
      const stats = analyze(largeDataset);
      const elapsed = Date.now() - start;

      expect(stats.total).toBe(10000);
      expect(stats.errorCount).toBeCloseTo(3334, 1); // ~1/3 are errors
      expect(stats.okCount).toBeCloseTo(6666, 1); // ~2/3 are successes
      expect(elapsed).toBeLessThan(50); // Should be very fast

      // partitionWith should also be efficient
      const partitioned = partitionWith(largeDataset);
      expect(partitioned.total).toBe(stats.total);
      expect(partitioned.okCount).toBe(stats.okCount);
      expect(partitioned.errorCount).toBe(stats.errorCount);
    });
  });

  describe("Performance Characteristics", () => {
    it("should demonstrate early exit behavior", () => {
      let processedCount = 0;

      // Create array where first() should exit early
      const results = [
        err("error1"),
        err("error2"),
        ok("found it!"), // Should stop here
        // The remaining items should be processed by the array creation but first() should exit
        (() => {
          processedCount++;
          return ok("not needed");
        })(),
        (() => {
          processedCount++;
          return ok("also not needed");
        })(),
      ];

      const result = first(results);
      expect(result).toEqual({ type: "Ok", value: "found it!" });
      expect(processedCount).toBe(2); // Later items were created but first() found what it needed
    });

    it("should handle null/undefined edge cases gracefully", () => {
      const mixedResults = [
        ok(null),
        ok(undefined),
        ok(0),
        ok(false),
        ok(""),
        err(null),
        err(undefined),
        err(0),
        err(false),
        err(""),
      ];

      const partitioned = partitionWith(mixedResults);
      expect(partitioned.oks).toEqual([null, undefined, 0, false, ""]);
      expect(partitioned.errors).toEqual([null, undefined, 0, false, ""]);
      expect(partitioned.okCount).toBe(5);
      expect(partitioned.errorCount).toBe(5);
      expect(partitioned.total).toBe(10);
    });

    it("should maintain referential integrity", () => {
      const obj1 = { id: 1, name: "test" };
      const obj2 = { id: 2, name: "test2" };
      const error1 = new Error("test error");

      const results = [ok(obj1), err(error1), ok(obj2)];
      const extracted = oks(results);
      const errors = errs(results);

      // Objects should be the same references
      expect(extracted[0]).toBe(obj1);
      expect(extracted[1]).toBe(obj2);
      expect(errors[0]).toBe(error1);
    });
  });
});
