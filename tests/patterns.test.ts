import { describe, it, expect, vi } from "vitest";
import {
  ok,
  err,
  isOk,
  isErr,
  safe,
  safeAsync,
  yieldFn,
  zip,
  apply,
} from "../src/patterns";
import type { Result } from "../src/types";

describe("Patterns Module - Advanced Functional Patterns", () => {
  describe("safe()", () => {
    it("should execute successful generator operations", () => {
      const getUser = (id: number) => ok({ id, name: "John" });
      const getProfile = (user: { id: number }) =>
        ok({ userId: user.id, bio: "Developer" });

      const result = safe(function* () {
        const user = yield getUser(1);
        const profile = yield getProfile(user);
        return { user, profile };
      });

      expect(result).toEqual({
        type: "Ok",
        value: {
          user: { id: 1, name: "John" },
          profile: { userId: 1, bio: "Developer" },
        },
      });
    });

    it("should early exit on first error", () => {
      const getUser = (id: number) =>
        id > 0 ? ok({ id, name: "John" }) : err("Invalid ID");
      const getProfile = vi.fn(() => ok({ bio: "Developer" }));

      const result = safe(function* () {
        const user = yield getUser(-1); // This will fail
        const profile = yield getProfile(user); // This should not execute
        return { user, profile };
      });

      expect(result).toEqual({ type: "Err", error: "Invalid ID" });
      expect(getProfile).not.toHaveBeenCalled(); // Should not reach this
    });

    it("should handle multiple operations with early exit", () => {
      const step1 = () => ok("step1");
      const step2 = () => ok("step2");
      const step3 = () => err("step3 failed");
      const step4 = vi.fn(() => ok("step4"));

      const result = safe(function* () {
        const result1 = yield step1();
        const result2 = yield step2();
        const result3 = yield step3(); // Fails here
        const result4 = yield step4(); // Should not execute
        return { result1, result2, result3, result4 };
      });

      expect(result).toEqual({ type: "Err", error: "step3 failed" });
      expect(step4).not.toHaveBeenCalled();
    });

    it("should work with complex data flows", () => {
      const validateInput = (input: string) =>
        input.length > 0 ? ok(input.trim()) : err("Empty input");

      const parseNumber = (str: string) => {
        const num = parseInt(str);
        return isNaN(num) ? err("Not a number") : ok(num);
      };

      const validateRange = (num: number) =>
        num >= 1 && num <= 100 ? ok(num) : err("Out of range");

      const square = (num: number) => ok(num * num);

      // Success case
      const successResult = safe(function* () {
        const input = yield validateInput("5");
        const number = yield parseNumber(input);
        const validated = yield validateRange(number);
        const squared = yield square(validated);
        return squared;
      });

      expect(successResult).toEqual({ type: "Ok", value: 25 });

      // Failure case - empty input
      const failResult1 = safe(function* () {
        const input = yield validateInput("");
        const number = yield parseNumber(input);
        const validated = yield validateRange(number);
        const squared = yield square(validated);
        return squared;
      });

      expect(failResult1).toEqual({ type: "Err", error: "Empty input" });

      // Failure case - out of range
      const failResult2 = safe(function* () {
        const input = yield validateInput("150");
        const number = yield parseNumber(input);
        const validated = yield validateRange(number);
        const squared = yield square(validated);
        return squared;
      });

      expect(failResult2).toEqual({ type: "Err", error: "Out of range" });
    });

    it("should handle empty generators", () => {
      const result = safe(function* () {
        return "immediate return";
      });

      expect(result).toEqual({ type: "Ok", value: "immediate return" });
    });

    it("should handle single operation generators", () => {
      const result = safe(function* () {
        const value = yield ok(42);
        return value * 2;
      });

      expect(result).toEqual({ type: "Ok", value: 84 });
    });

    it("should handle different error types", () => {
      const numberError = safe(function* () {
        const value = yield err(404);
        return value;
      });

      expect(numberError).toEqual({ type: "Err", error: 404 });

      const objectError = safe(function* () {
        const value = yield err({ code: 500, message: "Server error" });
        return value;
      });

      expect(objectError).toEqual({
        type: "Err",
        error: { code: 500, message: "Server error" },
      });
    });

    it("should handle generators that throw regular errors", () => {
      expect(() => {
        safe(function* () {
          yield ok("step1");
          throw new Error("Generator threw an error");
          yield ok("step2");
          return "done";
        });
      }).toThrow("Generator threw an error");
    });

    it("should handle cleanup on early exit", () => {
      const cleanup = vi.fn();

      const result = safe(function* () {
        try {
          const value1 = yield ok("step1");
          const value2 = yield err("failed");
          const value3 = yield ok("step3");
          return { value1, value2, value3 };
        } finally {
          cleanup();
        }
      });

      expect(result).toEqual({ type: "Err", error: "failed" });
      expect(cleanup).toHaveBeenCalled();
    });

    it("should work with nested function calls", () => {
      const getUserById = (id: number) =>
        id > 0 ? ok({ id, name: `User${id}` }) : err("Invalid user ID");

      const getPostsByUser = (user: { id: number }) =>
        ok([{ id: 1, title: "Post 1", authorId: user.id }]);

      const getCommentsForPost = (post: { id: number }) =>
        ok([{ id: 1, text: "Comment 1", postId: post.id }]);

      const result = safe(function* () {
        const user = yield getUserById(1);
        const posts = yield getPostsByUser(user);
        const comments = yield getCommentsForPost(posts[0]);

        return {
          user: user.name,
          postTitle: posts[0].title,
          commentCount: comments.length,
        };
      });

      expect(result).toEqual({
        type: "Ok",
        value: {
          user: "User1",
          postTitle: "Post 1",
          commentCount: 1,
        },
      });
    });
  });

  describe("safeAsync()", () => {
    it("should execute successful async generator operations", async () => {
      const fetchUser = async (id: number) => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return ok({ id, name: "John" });
      };

      const fetchProfile = async (user: { id: number }) => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return ok({ userId: user.id, bio: "Developer" });
      };

      const result = await safeAsync(async function* () {
        const user = yield await fetchUser(1);
        const profile = yield await fetchProfile(user);
        return { user, profile };
      });

      expect(result).toEqual({
        type: "Ok",
        value: {
          user: { id: 1, name: "John" },
          profile: { userId: 1, bio: "Developer" },
        },
      });
    });

    it("should early exit on first async error", async () => {
      const fetchUser = async (id: number) => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return id > 0 ? ok({ id, name: "John" }) : err("Invalid ID");
      };

      const fetchProfile = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return ok({ bio: "Developer" });
      });

      const result = await safeAsync(async function* () {
        const user = yield await fetchUser(-1); // This will fail
        const profile = yield await fetchProfile(user); // Should not execute
        return { user, profile };
      });

      expect(result).toEqual({ type: "Err", error: "Invalid ID" });
      expect(fetchProfile).not.toHaveBeenCalled();
    });

    it("should handle mixed sync and async operations", async () => {
      const syncOp = (value: string) => ok(value.toUpperCase());
      const asyncOp = async (value: string) => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return ok(value + "!");
      };

      const result = await safeAsync(async function* () {
        const sync = yield syncOp("hello");
        const async = yield await asyncOp(sync);
        return async;
      });

      expect(result).toEqual({ type: "Ok", value: "HELLO!" });
    });

    it("should handle async generators that throw", async () => {
      await expect(async () => {
        await safeAsync(async function* () {
          yield await Promise.resolve(ok("step1"));
          throw new Error("Async generator threw");
          yield await Promise.resolve(ok("step2"));
          return "done";
        });
      }).rejects.toThrow("Async generator threw");
    });

    it("should handle async cleanup on early exit", async () => {
      const cleanup = vi.fn();

      const result = await safeAsync(async function* () {
        try {
          const value1 = yield await Promise.resolve(ok("step1"));
          const value2 = yield await Promise.resolve(err("failed"));
          const value3 = yield await Promise.resolve(ok("step3"));
          return { value1, value2, value3 };
        } finally {
          cleanup();
        }
      });

      expect(result).toEqual({ type: "Err", error: "failed" });
      expect(cleanup).toHaveBeenCalled();
    });

    it("should work with real async patterns like fetch", async () => {
      // Simulate fetch-like operations
      const fetchData = async (url: string): Promise<Result<any, string>> => {
        await new Promise((resolve) => setTimeout(resolve, 1));

        if (url === "/users/1") {
          return ok({ id: 1, name: "John" });
        } else if (url === "/profiles/1") {
          return ok({ userId: 1, bio: "Developer" });
        } else {
          return err("Not found");
        }
      };

      const result = await safeAsync(async function* () {
        const user = yield await fetchData("/users/1");
        const profile = yield await fetchData("/profiles/1");

        return {
          name: user.name,
          bio: profile.bio,
        };
      });

      expect(result).toEqual({
        type: "Ok",
        value: { name: "John", bio: "Developer" },
      });

      // Test failure case
      const failResult = await safeAsync(async function* () {
        const user = yield await fetchData("/users/999"); // Not found
        const profile = yield await fetchData("/profiles/1");
        return { user, profile };
      });

      expect(failResult).toEqual({ type: "Err", error: "Not found" });
    });

    it("should preserve async operation timing", async () => {
      const delays = [10, 5, 15];
      const operations = delays.map((delay, i) => async () => {
        await new Promise((resolve) => setTimeout(resolve, delay));
        return ok(`result${i}`);
      });

      const start = Date.now();
      const result = await safeAsync(async function* () {
        const result0 = yield await operations[0]();
        const result1 = yield await operations[1]();
        const result2 = yield await operations[2]();
        return [result0, result1, result2];
      });
      const elapsed = Date.now() - start;

      expect(result).toEqual({
        type: "Ok",
        value: ["result0", "result1", "result2"],
      });
      expect(elapsed).toBeGreaterThanOrEqual(30); // Should wait for all operations
    });
  });

  describe("yieldFn()", () => {
    it("should return the same Result it receives", () => {
      const okResult = ok("test");
      const errResult = err("error");

      expect(yieldFn(okResult)).toBe(okResult);
      expect(yieldFn(errResult)).toBe(errResult);
    });

    it("should work in generator context", () => {
      const getUser = (id: number) =>
        id > 0 ? ok({ id, name: "John" }) : err("Invalid ID");

      const result = safe(function* () {
        const user = yield* yieldFn(getUser(1));
        return user.name;
      });

      expect(result).toEqual({ type: "Ok", value: "John" });

      const errorResult = safe(function* () {
        const user = yield* yieldFn(getUser(-1));
        return user.name;
      });

      expect(errorResult).toEqual({ type: "Err", error: "Invalid ID" });
    });

    it("should make generator syntax cleaner", () => {
      const operation1 = () => ok("step1");
      const operation2 = () => ok("step2");

      // Using yieldFn for cleaner syntax
      const withYieldFn = safe(function* () {
        const result1 = yield* yieldFn(operation1());
        const result2 = yield* yieldFn(operation2());
        return result1 + result2;
      });

      // Without yieldFn (standard approach)
      const withoutYieldFn = safe(function* () {
        const result1 = yield operation1();
        const result2 = yield operation2();
        return result1 + result2;
      });

      expect(withYieldFn).toEqual({ type: "Ok", value: "step1step2" });
      expect(withoutYieldFn).toEqual({ type: "Ok", value: "step1step2" });
      expect(withYieldFn).toEqual(withoutYieldFn);
    });
  });

  describe("zip()", () => {
    it("should combine two successful Results into tuple", () => {
      const result1 = ok("hello");
      const result2 = ok(42);

      const zipped = zip(result1, result2);
      expect(zipped).toEqual({ type: "Ok", value: ["hello", 42] });
    });

    it("should return first error if first Result fails", () => {
      const result1 = err("first error");
      const result2 = ok(42);

      const zipped = zip(result1, result2);
      expect(zipped).toEqual({ type: "Err", error: "first error" });
    });

    it("should return second error if first succeeds but second fails", () => {
      const result1 = ok("hello");
      const result2 = err("second error");

      const zipped = zip(result1, result2);
      expect(zipped).toEqual({ type: "Err", error: "second error" });
    });

    it("should return first error if both fail", () => {
      const result1 = err("first error");
      const result2 = err("second error");

      const zipped = zip(result1, result2);
      expect(zipped).toEqual({ type: "Err", error: "first error" });
    });

    it("should work with different value types", () => {
      const stringResult = ok("text");
      const numberResult = ok(123);
      const boolResult = ok(true);
      const objectResult = ok({ id: 1 });

      expect(zip(stringResult, numberResult)).toEqual({
        type: "Ok",
        value: ["text", 123],
      });

      expect(zip(boolResult, objectResult)).toEqual({
        type: "Ok",
        value: [true, { id: 1 }],
      });
    });

    it("should work with different error types", () => {
      const stringError = err("string error");
      const numberError = err(404);
      const objectError = err({ code: 500 });

      expect(zip(stringError, numberError)).toEqual({
        type: "Err",
        error: "string error",
      });

      expect(zip(ok("success"), objectError)).toEqual({
        type: "Err",
        error: { code: 500 },
      });
    });

    it("should be useful for validation scenarios", () => {
      const validateName = (name: string) =>
        name.length > 0 ? ok(name) : err("Name required");

      const validateAge = (age: number) =>
        age >= 0 && age <= 120 ? ok(age) : err("Invalid age");

      // Both valid
      const validUser = zip(validateName("John"), validateAge(25));
      expect(validUser).toEqual({ type: "Ok", value: ["John", 25] });

      // Name invalid
      const invalidName = zip(validateName(""), validateAge(25));
      expect(invalidName).toEqual({ type: "Err", error: "Name required" });

      // Age invalid
      const invalidAge = zip(validateName("John"), validateAge(150));
      expect(invalidAge).toEqual({ type: "Err", error: "Invalid age" });

      // Both invalid - returns first error
      const bothInvalid = zip(validateName(""), validateAge(150));
      expect(bothInvalid).toEqual({ type: "Err", error: "Name required" });
    });

    it("should preserve reference equality", () => {
      const obj1 = { id: 1 };
      const obj2 = { id: 2 };
      const result1 = ok(obj1);
      const result2 = ok(obj2);

      const zipped = zip(result1, result2);
      expect(zipped).toEqual({
        type: "Ok",
        value: [obj1, obj2],
      });
    });
  });

  describe("apply()", () => {
    it("should apply a function to a value when both are successful", () => {
      const addFn = ok((x: number) => x + 10);
      const value = ok(5);

      const result = apply(addFn, value);
      expect(result).toEqual({ type: "Ok", value: 15 });
    });

    it("should return function error if function Result fails", () => {
      const fnError = err("Function error");
      const value = ok(5);

      const result = apply(fnError, value);
      expect(result).toEqual({ type: "Err", error: "Function error" });
    });

    it("should return value error if value Result fails", () => {
      const addFn = ok((x: number) => x + 10);
      const valueError = err("Value error");

      const result = apply(addFn, valueError);
      expect(result).toEqual({ type: "Err", error: "Value error" });
    });

    it("should return function error if both fail", () => {
      const fnError = err("Function error");
      const valueError = err("Value error");

      const result = apply(fnError, valueError);
      expect(result).toEqual({ type: "Err", error: "Function error" });
    });

    it("should work with curried functions", () => {
      const add = ok((x: number) => (y: number) => x + y);
      const value1 = ok(5);
      const value2 = ok(3);

      // First application
      const partiallyApplied = apply(add, value1);
      expect(partiallyApplied).toEqual({
        type: "Ok",
        value: expect.any(Function),
      });

      // Second application - need to avoid accessing .value
      const final = apply(partiallyApplied, value2);
      expect(final).toEqual({ type: "Ok", value: 8 });
    });

    it("should work with complex function transformations", () => {
      interface User {
        name: string;
        age: number;
      }

      const createUser = ok((name: string) => (age: number) => ({ name, age }));
      const nameResult = ok("John");
      const ageResult = ok(25);

      const userWithName = apply(createUser, nameResult);
      const fullUser = apply(userWithName, ageResult);
      expect(fullUser).toEqual({
        type: "Ok",
        value: { name: "John", age: 25 },
      });
    });

    it("should work with validation functions", () => {
      const parseNumber = (s: string): Result<number, string> => {
        const num = parseInt(s);
        return isNaN(num) ? err("Not a number") : ok(num);
      };

      const add = ok((x: number) => (y: number) => x + y);

      // Success case
      const result1 = apply(apply(add, parseNumber("5")), parseNumber("3"));
      expect(result1).toEqual({ type: "Ok", value: 8 });

      // Failure case - first parse fails
      const result2 = apply(apply(add, parseNumber("abc")), parseNumber("3"));
      expect(result2).toEqual({ type: "Err", error: "Not a number" });

      // Failure case - second parse fails
      const result3 = apply(apply(add, parseNumber("5")), parseNumber("xyz"));
      expect(result3).toEqual({ type: "Err", error: "Not a number" });
    });

    it("should work with different function types", () => {
      // String manipulation
      const upperCase = ok((s: string) => s.toUpperCase());
      const text = ok("hello");

      expect(apply(upperCase, text)).toEqual({ type: "Ok", value: "HELLO" });

      // Object transformation
      const addId = ok((name: string) => ({ id: Math.random(), name }));
      const name = ok("John");

      const userResult = apply(addId, name);
      expect(userResult).toEqual({
        type: "Ok",
        value: {
          id: expect.any(Number),
          name: "John",
        },
      });

      // Array operations
      const double = ok((arr: number[]) => arr.map((x) => x * 2));
      const numbers = ok([1, 2, 3]);

      expect(apply(double, numbers)).toEqual({ type: "Ok", value: [2, 4, 6] });
    });

    it("should maintain type safety", () => {
      // This test primarily validates TypeScript compilation
      const stringToNumber = ok((s: string) => s.length);
      const stringValue = ok("hello");

      const result = apply(stringToNumber, stringValue);
      expect(result).toEqual({ type: "Ok", value: 5 });
    });
  });

  describe("Integration Tests", () => {
    it("should work together in complex workflows", () => {
      // Combine multiple patterns for a user registration workflow
      const validateEmail = (email: string) =>
        email.includes("@") ? ok(email) : err("Invalid email");

      const validatePassword = (password: string) =>
        password.length >= 8 ? ok(password) : err("Password too short");

      const createUser = ok((email: string) => (password: string) => ({
        id: Math.random(),
        email,
        password: "***masked***",
      }));

      // Using zip for parallel validation + apply for construction
      const registerUser = (email: string, password: string) => {
        const validations = zip(
          validateEmail(email),
          validatePassword(password),
        );

        if (isErr(validations)) {
          return validations;
        }

        return apply(
          apply(createUser, ok(validations.value[0])),
          ok(validations.value[1]),
        );
      };

      // Success case
      const success = registerUser("test@example.com", "password123");
      expect(success).toEqual({
        type: "Ok",
        value: {
          id: expect.any(Number),
          email: "test@example.com",
          password: "***masked***",
        },
      });

      // Email validation failure
      const emailFail = registerUser("invalid-email", "password123");
      expect(emailFail).toEqual({ type: "Err", error: "Invalid email" });

      // Password validation failure
      const passwordFail = registerUser("test@example.com", "short");
      expect(passwordFail).toEqual({
        type: "Err",
        error: "Password too short",
      });
    });

    it("should work with safe() and zip() together", () => {
      const fetchUserData = (id: number) =>
        id > 0 ? ok({ id, name: "John" }) : err("Invalid user ID");

      const fetchUserSettings = (id: number) =>
        id > 0
          ? ok({ theme: "dark", notifications: true })
          : err("Invalid settings ID");

      const getUserProfile = (userId: number) =>
        safe(function* () {
          // Use zip to fetch both user data and settings in parallel conceptually
          const combined = zip(
            fetchUserData(userId),
            fetchUserSettings(userId),
          );
          const [userData, settings] = yield combined;

          return {
            profile: {
              ...userData,
              settings,
            },
          };
        });

      const success = getUserProfile(1);
      expect(success).toEqual({
        type: "Ok",
        value: {
          profile: {
            id: 1,
            name: "John",
            settings: { theme: "dark", notifications: true },
          },
        },
      });

      const failure = getUserProfile(-1);
      expect(failure).toEqual({ type: "Err", error: "Invalid user ID" });
    });

    it("should work with safeAsync() and apply() together", async () => {
      const fetchData = async (
        endpoint: string,
      ): Promise<Result<any, string>> => {
        await new Promise((resolve) => setTimeout(resolve, 1));

        if (endpoint === "/user") {
          return ok({ name: "John", age: 25 });
        } else if (endpoint === "/preferences") {
          return ok({ theme: "dark" });
        } else {
          return err("Endpoint not found");
        }
      };

      const mergeUserData = ok((user: any) => (preferences: any) => ({
        ...user,
        preferences,
      }));

      const result = await safeAsync(async function* () {
        const user = yield await fetchData("/user");
        const preferences = yield await fetchData("/preferences");

        // Use apply to merge the data
        const merger = yield apply(mergeUserData, ok(user));
        const final = yield apply(merger, ok(preferences));

        return final;
      });

      expect(result).toEqual({
        type: "Ok",
        value: {
          name: "John",
          age: 25,
          preferences: { theme: "dark" },
        },
      });
    });

    it("should handle complex real-world scenarios", () => {
      // Simulate a complex data processing pipeline
      interface RawData {
        value: string;
        timestamp: number;
      }

      interface ProcessedData {
        numericValue: number;
        processed: true;
        timestamp: number;
      }

      const validateRawData = (data: RawData) =>
        data.value && data.timestamp > 0 ? ok(data) : err("Invalid raw data");

      const parseValue = (data: RawData) => {
        const num = parseFloat(data.value);
        return isNaN(num) ? err("Cannot parse value") : ok(num);
      };

      const createProcessedData = ok(
        (value: number) =>
          (timestamp: number): ProcessedData => ({
            numericValue: value,
            processed: true,
            timestamp,
          }),
      );

      const processData = (rawData: RawData) =>
        safe(function* () {
          const validated = yield validateRawData(rawData);
          const numericValue = yield parseValue(validated);

          // Use apply to create final processed data
          const creator = yield apply(createProcessedData, ok(numericValue));
          const processed = yield apply(creator, ok(validated.timestamp));

          return processed;
        });

      // Success case
      const validData: RawData = { value: "42.5", timestamp: Date.now() };
      const success = processData(validData);
      expect(success).toEqual({
        type: "Ok",
        value: {
          numericValue: 42.5,
          processed: true,
          timestamp: expect.any(Number),
        },
      });

      // Validation failure
      const invalidData: RawData = { value: "", timestamp: 0 };
      const validationFailure = processData(invalidData);
      expect(validationFailure).toEqual({
        type: "Err",
        error: "Invalid raw data",
      });

      // Parse failure
      const parseFailureData: RawData = {
        value: "not-a-number",
        timestamp: Date.now(),
      };
      const parseFailure = processData(parseFailureData);
      expect(parseFailure).toEqual({
        type: "Err",
        error: "Cannot parse value",
      });
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle generators with no yields", () => {
      const result = safe(function* () {
        // No yields, just immediate return
        return "immediate value";
      });

      expect(result).toEqual({ type: "Ok", value: "immediate value" });
    });

    it("should handle async generators with no yields", async () => {
      const result = await safeAsync(async function* () {
        // No yields, just immediate return
        await new Promise((resolve) => setTimeout(resolve, 1));
        return "immediate async value";
      });

      expect(result).toEqual({ type: "Ok", value: "immediate async value" });
    });

    it("should handle nested Result types", () => {
      const nestedOk = ok(ok("nested"));
      const nestedErr = ok(err("nested error"));

      // zip with nested Results
      const zippedNested = zip(nestedOk, ok("normal"));
      expect(zippedNested).toEqual({
        type: "Ok",
        value: [{ type: "Ok", value: "nested" }, "normal"],
      });

      // apply with nested Results
      const nestedApply = apply(
        ok((x: Result<string, string>) => x),
        nestedErr,
      );
      expect(nestedApply).toEqual({
        type: "Ok",
        value: { type: "Err", error: "nested error" },
      });
    });

    it("should preserve error object references", () => {
      const originalError = new Error("Original error");
      const errorResult = err(originalError);

      const zipped = zip(errorResult, ok("value"));
      expect(zipped).toEqual({ type: "Err", error: originalError });

      const applied = apply(
        ok((x: any) => x),
        errorResult,
      );
      expect(applied).toEqual({ type: "Err", error: originalError });
    });

    it("should handle undefined and null values correctly", () => {
      const nullResult = ok(null);
      const undefinedResult = ok(undefined);

      // zip with null/undefined
      const zippedNull = zip(nullResult, undefinedResult);
      expect(zippedNull).toEqual({ type: "Ok", value: [null, undefined] });

      // apply with null/undefined
      const identityFn = ok((x: any) => x);
      const appliedNull = apply(identityFn, nullResult);
      expect(appliedNull).toEqual({ type: "Ok", value: null });

      const appliedUndefined = apply(identityFn, undefinedResult);
      expect(appliedUndefined).toEqual({ type: "Ok", value: undefined });
    });

    it("should handle large generator chains efficiently", () => {
      const steps = Array.from({ length: 100 }, (_, i) => () => ok(`step${i}`));

      const result = safe(function* () {
        const results = [];
        for (const step of steps) {
          const stepResult = yield step();
          results.push(stepResult);
        }
        return results;
      });

      expect(result).toEqual({
        type: "Ok",
        value: Array.from({ length: 100 }, (_, i) => `step${i}`),
      });
    });

    it("should handle early exit in large chains", () => {
      const steps = Array.from(
        { length: 100 },
        (_, i) => () =>
          i === 50 ? err(`Failed at step ${i}`) : ok(`step${i}`),
      );

      const result = safe(function* () {
        const results = [];
        for (const step of steps) {
          const stepResult = yield step();
          results.push(stepResult);
        }
        return results;
      });

      expect(result).toEqual({ type: "Err", error: "Failed at step 50" });
    });
  });

  describe("Type Safety", () => {
    it("should maintain proper type inference", () => {
      // Test that TypeScript correctly infers types through patterns
      const stringResult: Result<string, number> = ok("hello");
      const numberResult: Result<number, string> = ok(42);

      // zip should preserve both types
      const zipped = zip(stringResult, numberResult);
      expect(zipped).toEqual({
        type: "Ok",
        value: ["hello", 42],
      });

      // apply should work with proper function types
      const lengthFn: Result<(s: string) => number, never> = ok(
        (s: string) => s.length,
      );
      const applied = apply(lengthFn, stringResult);
      expect(applied).toEqual({ type: "Ok", value: 5 });
    });

    it("should work with generic constraints", () => {
      interface HasId {
        id: number;
      }

      const createEntity = <T extends HasId>(baseData: T) => ok(baseData);
      const addTimestamp = ok(<T extends HasId>(entity: T) => ({
        ...entity,
        createdAt: Date.now(),
      }));

      const user = { id: 1, name: "John" };
      const result = apply(addTimestamp, createEntity(user));

      expect(result).toEqual({
        type: "Ok",
        value: {
          id: 1,
          name: "John",
          createdAt: expect.any(Number),
        },
      });
    });
  });
});
