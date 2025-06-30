import { describe, it, expect } from "vitest";
import {
  ok,
  err,
  isOk,
  isErr,
  safe,
  safeAsync,
  zip,
  apply,
  yieldFn,
  resultOk,
  resultErr,
  type Result,
} from "../src/patterns";

describe("Advanced Patterns", () => {
  describe("safe()", () => {
    it("should handle successful generator operations", () => {
      const result = safe(function* () {
        const a = yield ok(1);
        const b = yield ok(2);
        return a + b;
      });

      expect(result).toEqual({ type: "Ok", value: 3 });
    });

    it("should short-circuit on first error", () => {
      const result = safe(function* () {
        const a = yield ok(1);
        const b = yield err("failed");
        const c = yield ok(3); // Should not execute
        return a + b + c;
      });

      expect(result).toEqual({ type: "Err", error: "failed" });
    });

    it("should handle complex data processing", () => {
      const parseNumber = (s: string): Result<number, string> =>
        isNaN(+s) ? err(`Invalid number: ${s}`) : ok(+s);

      const result = safe(function* () {
        const a = yield parseNumber("10");
        const b = yield parseNumber("20");
        const c = yield parseNumber("30");
        return { sum: a + b + c, average: (a + b + c) / 3 };
      });

      expect(result).toEqual({
        type: "Ok",
        value: { sum: 60, average: 20 },
      });
    });

    it("should handle early error with complex data", () => {
      const parseNumber = (s: string): Result<number, string> =>
        isNaN(+s) ? err(`Invalid number: ${s}`) : ok(+s);

      const result = safe(function* () {
        const a = yield parseNumber("10");
        const b = yield parseNumber("invalid");
        const c = yield parseNumber("30");
        return a + b + c;
      });

      expect(result).toEqual({ type: "Err", error: "Invalid number: invalid" });
    });

    it("should work with nested generators", () => {
      const innerGenerator = function* () {
        const x = yield ok(5);
        const y = yield ok(10);
        return x * y;
      };

      const result = safe(function* () {
        const inner = yield safe(innerGenerator);
        const outer = yield ok(2);
        return inner + outer;
      });

      expect(result).toEqual({ type: "Ok", value: 52 }); // (5 * 10) + 2
    });

    it("should stop at first error in for loop", () => {
      const result = safe(function* () {
        for (let i = 1; i <= 100; i++) {
          if (i === 50) {
            yield err("Stop at 50");
          } else {
            yield ok(i);
          }
        }
        return "completed";
      });

      expect(result).toEqual({ type: "Err", error: "Stop at 50" });
    });
  });

  describe("safeAsync()", () => {
    it("should handle successful async generator operations", async () => {
      const result = await safeAsync(async function* () {
        const a = yield await Promise.resolve(ok(1));
        const b = yield await Promise.resolve(ok(2));
        return a + b;
      });

      expect(result).toEqual({ type: "Ok", value: 3 });
    });

    it("should short-circuit on first async error", async () => {
      const result = await safeAsync(async function* () {
        const a = yield await Promise.resolve(ok(1));
        const b = yield await Promise.resolve(err("async failed"));
        const c = yield await Promise.resolve(ok(3)); // Should not execute
        return a + b + c;
      });

      expect(result).toEqual({ type: "Err", error: "async failed" });
    });

    it("should work with complex async generator workflows", async () => {
      // ✅ FIXED: Remove setTimeout timing dependencies, use deterministic IDs
      const validateEmail = (email: string) =>
        email.includes("@") ? resultOk(email) : resultErr("Invalid email");

      const checkEmailAvailable = async (email: string) => {
        await Promise.resolve(); // ✅ FIXED: Deterministic async
        return email === "taken@example.com"
          ? resultErr("Email already taken")
          : resultOk(email);
      };

      // Use deterministic ID generation for testing
      let mockIdCounter = 1000;
      const createUser = async (userData: any) => {
        await Promise.resolve(); // ✅ FIXED: Deterministic async
        return resultOk({
          id: mockIdCounter++, // ✅ FIXED: Deterministic ID generation
          ...userData,
          createdAt: new Date('2023-01-01T00:00:00.000Z').toISOString(), // ✅ FIXED: Fixed timestamp for testing
        });
      };

      const result = await safeAsync(async function* () {
        const email = "new@example.com";
        const validEmail = yield validateEmail(email);
        const availableEmail = yield await checkEmailAvailable(validEmail);
        const userData = { name: "John Doe", email: availableEmail };
        const user = yield await createUser(userData);
        return user;
      });

      expect(result.type).toBe("Ok");
      if (isOk(result)) {
        expect(result.value.name).toBe("John Doe");
        expect(result.value.email).toBe("new@example.com");
        expect(result.value.id).toBe(1000); // ✅ FIXED: Deterministic ID
        expect(result.value.createdAt).toBe("2023-01-01T00:00:00.000Z");
      }
    });

    it("should handle realistic async API calls", async () => {
      // ✅ FIXED: Remove setTimeout timing dependencies
      const fetchUserById = async (id: number): Promise<Result<{ id: number, name: string }, string>> => {
        await Promise.resolve(); // ✅ FIXED: Deterministic async
        return id === 1 ? ok({ id: 1, name: "John" }) : err("User not found");
      };

      const fetchUserPosts = async (userId: number) => {
        await Promise.resolve(); // ✅ FIXED: Deterministic async
        return ok([{ id: 1, title: "Post 1", authorId: userId }]);
      };

      const result = await safeAsync(async function* () {
        const user = yield await fetchUserById(1);
        const posts = yield await fetchUserPosts(user.id);
        return { user, posts };
      });

      // Test behavior: data flows correctly through async generator
      expect(result.type).toBe("Ok");
      if (isOk(result)) {
        expect(result.value.user.name).toBe("John");
        expect(result.value.user.id).toBe(1);
        expect(result.value.posts).toHaveLength(1);
        expect(result.value.posts[0].authorId).toBe(result.value.user.id);
        expect(result.value.posts[0].title).toBe("Post 1");
      }
    });

    it("should preserve async operation sequencing", async () => {
      // ✅ FIXED: Remove setTimeout timing dependencies
      let operationCount = 0;
      const asyncOp = async (name: string) => {
        await Promise.resolve(); // ✅ FIXED: Deterministic async
        operationCount++;
        return ok(`${name}-operation-${operationCount}`);
      };

      const result = await safeAsync(async function* () {
        const a = yield await asyncOp("first");
        const b = yield await asyncOp("second");
        return { a, b };
      });

      // Test behavior: operations executed in sequence, results preserved
      expect(result.type).toBe("Ok");
      if (isOk(result)) {
        expect(result.value.a).toBe("first-operation-1");
        expect(result.value.b).toBe("second-operation-2");
        expect(typeof result.value).toBe("object");
        expect(result.value).toHaveProperty("a");
        expect(result.value).toHaveProperty("b");
      }

      // Verify sequencing: second operation happened after first
      expect(operationCount).toBe(2);
    });

    it("should handle early exit in async operations", async () => {
      const fetchUser = async () => err("User not found");
      const fetchProfile = async () => ok({ bio: "Developer" });

      const result = await safeAsync(async function* () {
        const user = yield await fetchUser();
        const profile = yield await fetchProfile(); // Should not execute
        return { user, profile };
      });

      expect(result).toEqual({ type: "Err", error: "User not found" });
    });

    it("should handle mixed sync and async operations", async () => {
      const syncOp = () => ok("sync");
      const asyncOp = async () => ok("async");

      const result = await safeAsync(async function* () {
        const sync = yield syncOp();
        const async = yield await asyncOp();
        return { sync, async };
      });

      expect(result).toEqual({
        type: "Ok",
        value: { sync: "sync", async: "async" },
      });
    });

    it("should handle async generators that throw", async () => {
      await expect(async () => {
        await safeAsync(async function* () {
          throw new Error("Async error");
        });
      }).rejects.toThrow("Async error");
    });

    it("should handle async cleanup on early exit", async () => {
      let cleanupCalled = false;

      const result = await safeAsync(async function* () {
        try {
          yield await Promise.resolve(ok("step1"));
          yield await Promise.resolve(err("early exit"));
          yield await Promise.resolve(ok("step3"));
          return "success";
        } finally {
          cleanupCalled = true;
        }
      });

      expect(result).toEqual({ type: "Err", error: "early exit" });
      expect(cleanupCalled).toBe(true);
    });
  });

  describe("zip()", () => {
    it("should combine two successful Results", () => {
      const result = zip(ok(1), ok("hello"));
      expect(result).toEqual({ type: "Ok", value: [1, "hello"] });
    });

    it("should return first error if first Result fails", () => {
      const result = zip(err("first error"), ok("hello"));
      expect(result).toEqual({ type: "Err", error: "first error" });
    });

    it("should return first error if second Result fails", () => {
      const result = zip(ok(1), err("second error"));
      expect(result).toEqual({ type: "Err", error: "second error" });
    });

    it("should return first error if both Results fail", () => {
      const result = zip(err("first error"), err("second error"));
      expect(result).toEqual({ type: "Err", error: "first error" });
    });

    it("should handle complex types", () => {
      interface User {
        id: number;
        name: string;
      }

      interface Post {
        id: number;
        title: string;
      }

      const userResult: Result<User, string> = ok({ id: 1, name: "John" });
      const postResult: Result<Post, string> = ok({ id: 1, title: "Hello" });

      const combined = zip(userResult, postResult);
      expect(combined).toEqual({
        type: "Ok",
        value: [
          { id: 1, name: "John" },
          { id: 1, title: "Hello" },
        ],
      });
    });
  });

  describe("apply()", () => {
    it("should apply function to value when both are Ok", () => {
      const addOne = (x: number) => x + 1;
      const result = apply(ok(addOne), ok(5));
      expect(result).toEqual({ type: "Ok", value: 6 });
    });

    it("should return function error when function Result is Err", () => {
      const result = apply(err("no function"), ok(5));
      expect(result).toEqual({ type: "Err", error: "no function" });
    });

    it("should return value error when value Result is Err", () => {
      const addOne = (x: number) => x + 1;
      const result = apply(ok(addOne), err("no value"));
      expect(result).toEqual({ type: "Err", error: "no value" });
    });

    it("should return first error when both are Err", () => {
      const result = apply(err("no function"), err("no value"));
      expect(result).toEqual({ type: "Err", error: "no function" });
    });

    it("should work with curried functions", () => {
      const add = (x: number) => (y: number) => x + y;
      const addFive = apply(ok(add), ok(5));
      expect(addFive).toEqual({ type: "Ok", value: expect.any(Function) });

      if (isOk(addFive)) {
        const addFiveToThree = apply(addFive, ok(3));
        expect(addFiveToThree).toEqual({ type: "Ok", value: 8 });
      }
    });

    it("should work with complex transformations", () => {
      interface User {
        id: number;
        name: string;
      }

      const enhanceUser = (user: User) => ({
        ...user,
        displayName: `${user.name} (#${user.id})`,
      });

      const userResult: Result<User, string> = ok({ id: 1, name: "John" });
      const enhanced = apply(ok(enhanceUser), userResult);

      expect(enhanced).toEqual({
        type: "Ok",
        value: { id: 1, name: "John", displayName: "John (#1)" },
      });
    });
  });

  describe("yieldFn()", () => {
    it("should return the same Result it receives", () => {
      const okResult = ok(42);
      expect(yieldFn(okResult)).toBe(okResult);

      const errResult = err("failed");
      expect(yieldFn(errResult)).toBe(errResult);
    });

    it("should work with different types", () => {
      const stringResult = ok("hello");
      const numberResult = ok(123);
      const errorResult = err({ code: 404, message: "Not found" });

      expect(yieldFn(stringResult)).toBe(stringResult);
      expect(yieldFn(numberResult)).toBe(numberResult);
      expect(yieldFn(errorResult)).toBe(errorResult);
    });
  });

  describe("resultOk() and resultErr()", () => {
    it("should create Ok Results", () => {
      expect(resultOk(42)).toEqual({ type: "Ok", value: 42 });
      expect(resultOk("hello")).toEqual({ type: "Ok", value: "hello" });
      expect(resultOk(null)).toEqual({ type: "Ok", value: null });
    });

    it("should create Err Results", () => {
      expect(resultErr("failed")).toEqual({ type: "Err", error: "failed" });
      expect(resultErr(404)).toEqual({ type: "Err", error: 404 });
      expect(resultErr({ code: "ERROR" })).toEqual({
        type: "Err",
        error: { code: "ERROR" },
      });
    });

    it("should work in generator contexts", () => {
      const result = safe(function* () {
        const a = yield resultOk(10);
        const b = yield resultOk(20);
        return a + b;
      });

      expect(result).toEqual({ type: "Ok", value: 30 });
    });

    it("should work in async generator contexts", async () => {
      const result = await safeAsync(async function* () {
        const a = yield resultOk(10);
        const b = yield await Promise.resolve(resultOk(20));
        return a + b;
      });

      expect(result).toEqual({ type: "Ok", value: 30 });
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle generators with no yields", () => {
      const result = safe(function* () {
        return "no yields";
      });

      expect(result).toEqual({ type: "Ok", value: "no yields" });
    });

    it("should handle async generators with no yields", async () => {
      const result = await safeAsync(async function* () {
        return "no async yields";
      });

      expect(result).toEqual({ type: "Ok", value: "no async yields" });
    });

    it("should handle generators that yield undefined", () => {
      const result = safe(function* () {
        const a = yield ok(undefined);
        const b = yield ok(null);
        return { a, b };
      });

      expect(result).toEqual({
        type: "Ok",
        value: { a: undefined, b: null },
      });
    });

    it("should handle complex error propagation", () => {
      const validateAge = (age: number): Result<number, string> =>
        age >= 18 ? ok(age) : err("Must be 18 or older");

      const validateEmail = (email: string): Result<string, string> =>
        email.includes("@") ? ok(email) : err("Invalid email format");

      const result = safe(function* () {
        const age = yield validateAge(16); // Will fail
        const email = yield validateEmail("test@example.com"); // Won't execute
        return { age, email };
      });

      expect(result).toEqual({ type: "Err", error: "Must be 18 or older" });
    });

    it("should handle nested safe operations", () => {
      const innerOperation = function* () {
        const x = yield ok(5);
        const y = yield ok(10);
        return x * y;
      };

      const outerOperation = function* () {
        const inner = yield safe(innerOperation);
        const multiplier = yield ok(2);
        return inner * multiplier;
      };

      const result = safe(outerOperation);
      expect(result).toEqual({ type: "Ok", value: 100 }); // (5 * 10) * 2
    });

    it("should handle nested safe operations with errors", () => {
      const innerOperation = function* () {
        const x = yield ok(5);
        const y = yield err("inner error");
        return x * y;
      };

      const outerOperation = function* () {
        const inner = yield safe(innerOperation);
        const multiplier = yield ok(2);
        return inner * multiplier;
      };

      const result = safe(outerOperation);
      expect(result).toEqual({ type: "Err", error: "inner error" });
    });
  });

  describe("Integration Tests", () => {
    it("should work together for complex validation workflows", () => {
      interface FormData {
        name: string;
        email: string;
        age: number;
      }

      const validateName = (name: string): Result<string, string> =>
        name.length > 0 ? ok(name.trim()) : err("Name is required");

      const validateEmail = (email: string): Result<string, string> =>
        email.includes("@") ? ok(email.toLowerCase()) : err("Invalid email");

      const validateAge = (age: number): Result<number, string> =>
        age >= 18 ? ok(age) : err("Must be 18 or older");

      const validateForm = (data: FormData) =>
        safe(function* () {
          const name = yield validateName(data.name);
          const email = yield validateEmail(data.email);
          const age = yield validateAge(data.age);
          return { name, email, age };
        });

      const validForm = validateForm({
        name: "  John Doe  ",
        email: "JOHN@EXAMPLE.COM",
        age: 25,
      });

      expect(validForm).toEqual({
        type: "Ok",
        value: {
          name: "John Doe",
          email: "john@example.com",
          age: 25,
        },
      });

      const invalidForm = validateForm({
        name: "",
        email: "invalid-email",
        age: 16,
      });

      expect(invalidForm).toEqual({ type: "Err", error: "Name is required" });
    });

    it("should work with applicative patterns", () => {
      const add = (x: number) => (y: number) => x + y;
      const multiply = (x: number) => (y: number) => x * y;

      // Chain multiple applications
      const result = safe(function* () {
        const addFn = yield apply(ok(add), ok(5));
        const result1 = yield apply(ok(addFn), ok(3)); // 5 + 3 = 8

        const multFn = yield apply(ok(multiply), ok(2));
        const result2 = yield apply(ok(multFn), ok(result1)); // 2 * 8 = 16

        return result2;
      });

      expect(result).toEqual({ type: "Ok", value: 16 });
    });

    it("should work with zip and apply together", () => {
      const processUserData = (name: string, age: number) => ({
        name: name.toUpperCase(),
        age,
        canVote: age >= 18,
      });

      const result = safe(function* () {
        const userData = yield zip(ok("john"), ok(25));
        const processor = yield ok(([name, age]: [string, number]) =>
          processUserData(name, age),
        );
        const processed = yield apply(ok(processor), ok(userData));
        return processed;
      });

      expect(result).toEqual({
        type: "Ok",
        value: {
          name: "JOHN",
          age: 25,
          canVote: true,
        },
      });
    });
  });

  describe("Type Safety", () => {
    it("should maintain proper type inference", () => {
      const stringResult: Result<string, number> = ok("hello");
      const numberResult: Result<number, string> = ok(42);

      const zipped = zip(stringResult, numberResult);
      if (isOk(zipped)) {
        // TypeScript should infer [string, number]
        expect(typeof zipped.value[0]).toBe("string");
        expect(typeof zipped.value[1]).toBe("number");
      }

      const upperFn = (s: string) => s.toUpperCase();
      const applied = apply(ok(upperFn), stringResult);
      if (isOk(applied)) {
        // TypeScript should infer string
        expect(typeof applied.value).toBe("string");
        expect(applied.value).toBe("HELLO");
      }
    });

    it("should work with generic constraints", () => {
      interface User {
        id: number;
        name: string;
      }

      const userResult: Result<User, string> = ok({ id: 1, name: "John" });
      const transformUser = (user: User) => ({
        ...user,
        email: `${user.name.toLowerCase()}@example.com`,
      });

      const result = apply(ok(transformUser), userResult);
      if (isOk(result)) {
        expect(result.value.id).toBe(1);
        expect(result.value.name).toBe("John");
        expect(result.value.email).toBe("john@example.com");
      }
    });
  });
});
