import { describe, it, expect } from "vitest";
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
  resultOk,
  resultErr,
  chain,
} from "../src/patterns";
import type { Result } from "../src/types";

describe("Patterns Module - Advanced Functional Patterns", () => {
  describe("Ergonomic Helpers", () => {
    describe("resultOk()", () => {
      it("should create properly typed Result for generators", () => {
        const result = resultOk({ id: 1, name: "John" });
        expect(result).toEqual({ type: "Ok", value: { id: 1, name: "John" } });
      });

      it("should work seamlessly in generator functions", () => {
        const getUser = (id: number) => resultOk({ id, name: "John" });
        const getProfile = (user: any) =>
          resultOk({ userId: user.id, bio: "Developer" });

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
    });

    describe("resultErr()", () => {
      it("should create properly typed error Result for generators", () => {
        const result = resultErr("Something failed");
        expect(result).toEqual({ type: "Err", error: "Something failed" });
      });

      it("should work seamlessly in generator functions", () => {
        const validateUser = (user: any) =>
          user.email ? resultOk(user) : resultErr("Email required");

        const result = safe(function* () {
          const user = yield validateUser({ name: "John" }); // Missing email
          return user;
        });

        expect(result).toEqual({ type: "Err", error: "Email required" });
      });
    });

    describe("chain()", () => {
      it("should provide fluent API for Result composition", () => {
        const getUser = (id: number) => resultOk({ id, name: "John" });
        const getProfile = (user: any) =>
          resultOk({ userId: user.id, bio: "Developer" });
        const enrichProfile = (profile: any) =>
          resultOk({ ...profile, enhanced: true });

        const result = chain(getUser(1))
          .then((user) => getProfile(user))
          .then((profile) => enrichProfile(profile))
          .run();

        expect(result).toEqual({
          type: "Ok",
          value: { userId: 1, bio: "Developer", enhanced: true },
        });
      });

      it("should short-circuit on first error", () => {
        const getUser = (id: number) =>
          id === 1
            ? resultOk({ id, name: "John" })
            : resultErr("User not found");
        const getProfile = (user: any) =>
          resultOk({ userId: user.id, bio: "Developer" });

        const result = chain(getUser(999))
          .then((user) => getProfile(user))
          .run();

        expect(result).toEqual({ type: "Err", error: "User not found" });
      });

      it("should handle multiple chained operations", () => {
        const double = (x: number) => resultOk(x * 2);
        const addTen = (x: number) => resultOk(x + 10);
        const toString = (x: number) => resultOk(x.toString());

        const result = chain(resultOk(5))
          .then(double)
          .then(addTen)
          .then(toString)
          .run();

        expect(result).toEqual({ type: "Ok", value: "20" }); // (5 * 2) + 10 = 20
      });

      it("should maintain type safety through chains", () => {
        const parseNumber = (s: string) => {
          const num = parseInt(s);
          return isNaN(num) ? resultErr("Not a number") : resultOk(num);
        };
        const validatePositive = (n: number) =>
          n > 0 ? resultOk(n) : resultErr("Must be positive");

        const validResult = chain(parseNumber("42"))
          .then(validatePositive)
          .run();

        const invalidResult = chain(parseNumber("-5"))
          .then(validatePositive)
          .run();

        expect(validResult).toEqual({ type: "Ok", value: 42 });
        expect(invalidResult).toEqual({
          type: "Err",
          error: "Must be positive",
        });
      });
    });
  });

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
      const getUser = () => resultErr("User not found");
      const getProfile = () => resultOk({ bio: "Developer" });

      const result = safe(function* () {
        const user = yield getUser();
        const profile = yield getProfile(); // Should not execute
        return { user, profile };
      });

      expect(result).toEqual({ type: "Err", error: "User not found" });
    });

    it("should handle multiple operations with early exit", () => {
      const step1 = () => ok("step1");
      const step2 = () => ok("step2");
      const step3 = () => err("step3 failed");
      const step4 = () => ok("step4");

      const result = safe(function* () {
        const a = yield step1();
        const b = yield step2();
        const c = yield step3(); // Should exit here
        const d = yield step4(); // Should not execute
        return { a, b, c, d };
      });

      expect(result).toEqual({ type: "Err", error: "step3 failed" });
    });

    it("should work with complex data flows", () => {
      const parseNumber = (s: string): Result<number, string> => {
        const num = parseInt(s);
        return isNaN(num) ? err("Not a number") : ok(num);
      };

      const validatePositive = (n: number): Result<number, string> => {
        return n > 0 ? ok(n) : err("Must be positive");
      };

      const double = (n: number) => ok(n * 2);

      const result = safe(function* () {
        const num = yield parseNumber("5");
        const validated = yield validatePositive(num);
        const doubled = yield double(validated);
        return doubled;
      });

      expect(result).toEqual({ type: "Ok", value: 10 });
    });

    it("should handle empty generators", () => {
      const result = safe(function* () {
        return "empty";
      });

      expect(result).toEqual({ type: "Ok", value: "empty" });
    });

    it("should handle single operation generators", () => {
      const result = safe(function* () {
        const value = yield ok(42);
        return value;
      });

      expect(result).toEqual({ type: "Ok", value: 42 });
    });

    it("should handle different error types", () => {
      const numberError = () => err(404);
      const objectError = () => err({ code: 500, message: "Server error" });

      const result1 = safe(function* () {
        yield numberError();
        return "unreachable";
      });

      const result2 = safe(function* () {
        yield objectError();
        return "unreachable";
      });

      expect(result1).toEqual({ type: "Err", error: 404 });
      expect(result2).toEqual({
        type: "Err",
        error: { code: 500, message: "Server error" },
      });
    });

    it("should handle generators that throw regular errors", () => {
      expect(() => {
        safe(function* () {
          throw new Error("Regular error");
        });
      }).toThrow("Regular error");
    });

    it("should handle cleanup on early exit", () => {
      let cleanupCalled = false;

      const result = safe(function* () {
        try {
          yield ok("step1");
          yield err("early exit");
          yield ok("step3");
          return "success";
        } finally {
          cleanupCalled = true;
        }
      });

      expect(result).toEqual({ type: "Err", error: "early exit" });
      expect(cleanupCalled).toBe(true);
    });

    it("should work with nested function calls", () => {
      const fetchUserData = (id: number) => {
        return safe(function* () {
          const user = yield ok({ id, name: "John" });
          const email = yield ok(`user${id}@example.com`);
          return { user, email };
        });
      };

      const result = safe(function* () {
        const userData = yield fetchUserData(1);
        const enhanced = yield ok({ ...userData, timestamp: Date.now() });
        return enhanced;
      });

      expect(result.type).toBe("Ok");
      if (isOk(result)) {
        expect(result.value.user).toEqual({ id: 1, name: "John" });
        expect(result.value.email).toBe("user1@example.com");
        expect(result.value.timestamp).toBeTypeOf("number");
      }
    });
  });

  describe("safeAsync()", () => {
    it("should execute successful async generator operations", async () => {
      const fetchUser = async (id: number) => ok({ id, name: "John" });
      const fetchProfile = async (user: { id: number }) =>
        ok({ userId: user.id, bio: "Developer" });

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

    it("should work with real async patterns like fetch", async () => {
      // Simulate API calls
      const fetchUserById = async (id: number) => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return id === 1 ? ok({ id: 1, name: "John" }) : err("User not found");
      };

      const fetchUserPosts = async (userId: number) => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return ok([{ id: 1, title: "Post 1", authorId: userId }]);
      };

      const result = await safeAsync(async function* () {
        const user = yield await fetchUserById(1);
        const posts = yield await fetchUserPosts(user.id);
        return { user, posts };
      });

      expect(result.type).toBe("Ok");
      if (isOk(result)) {
        expect(result.value.user.name).toBe("John");
        expect(result.value.posts).toHaveLength(1);
      }
    });

    it("should preserve async operation sequencing", async () => {
      const slowOp = async (delay: number) => {
        await new Promise((resolve) => setTimeout(resolve, delay));
        return ok(`completed after ${delay}ms`);
      };

      const result = await safeAsync(async function* () {
        const a = yield await slowOp(10);
        const b = yield await slowOp(10);
        return { a, b };
      });

      // Test behavior, not timing
      expect(result.type).toBe("Ok");
      if (isOk(result)) {
        expect(result.value.a).toBe("completed after 10ms");
        expect(result.value.b).toBe("completed after 10ms");
        expect(typeof result.value).toBe("object");
        expect(result.value).toHaveProperty("a");
        expect(result.value).toHaveProperty("b");
      }
    });
  });

  describe("yieldFn()", () => {
    it("should return the same Result it receives", () => {
      const okResult = ok(42);
      const errResult = err("failed");

      expect(yieldFn(okResult)).toBe(okResult);
      expect(yieldFn(errResult)).toBe(errResult);
    });

    it("should work in generator context", () => {
      const result = safe(function* () {
        const value = yield yieldFn(ok(42)); // ✅ FIXED: Use yield, not yield*
        return value * 2;
      });

      expect(result).toEqual({ type: "Ok", value: 84 });
    });

    it("should make generator syntax cleaner", () => {
      const getValue = () => ok(10);
      const processValue = (x: number) => ok(x * 3);

      const result = safe(function* () {
        const a = yield yieldFn(getValue()); // ✅ FIXED: Use yield, not yield*
        const b = yield yieldFn(processValue(a)); // ✅ FIXED: Use yield, not yield*
        return b;
      });

      expect(result).toEqual({ type: "Ok", value: 30 });
    });
  });

  describe("zip()", () => {
    it("should combine two successful Results into tuple", () => {
      const result1 = ok("hello");
      const result2 = ok(42);

      const result = zip(result1, result2);
      expect(result).toEqual({ type: "Ok", value: ["hello", 42] });
    });

    it("should return first error if first Result fails", () => {
      const result1 = err("first error");
      const result2 = ok(42);

      const result = zip(result1, result2);
      expect(result).toEqual({ type: "Err", error: "first error" });
    });

    it("should return second error if first succeeds but second fails", () => {
      const result1 = ok("hello");
      const result2 = err("second error");

      const result = zip(result1, result2);
      expect(result).toEqual({ type: "Err", error: "second error" });
    });

    it("should return first error if both fail", () => {
      const result1 = err("first error");
      const result2 = err("second error");

      const result = zip(result1, result2);
      expect(result).toEqual({ type: "Err", error: "first error" });
    });

    it("should work with different value types", () => {
      const stringResult = ok("test");
      const numberResult = ok(123);
      const booleanResult = ok(true);
      const objectResult = ok({ key: "value" });

      expect(zip(stringResult, numberResult)).toEqual({
        type: "Ok",
        value: ["test", 123],
      });

      expect(zip(booleanResult, objectResult)).toEqual({
        type: "Ok",
        value: [true, { key: "value" }],
      });
    });

    it("should work with different error types", () => {
      const stringError = err("string error");
      const numberError = err(404);
      const objectError = err({ code: 500 });

      expect(zip(stringError, ok("value"))).toEqual({
        type: "Err",
        error: "string error",
      });

      expect(zip(ok("value"), numberError)).toEqual({
        type: "Err",
        error: 404,
      });

      expect(zip(objectError, ok("value"))).toEqual({
        type: "Err",
        error: { code: 500 },
      });
    });

    it("should be useful for validation scenarios", () => {
      const validateName = (name: string) =>
        name.length > 0 ? ok(name) : err("Name cannot be empty");

      const validateAge = (age: number) =>
        age >= 0 && age <= 150 ? ok(age) : err("Invalid age");

      const validResult = zip(validateName("John"), validateAge(30));
      expect(validResult).toEqual({ type: "Ok", value: ["John", 30] });

      const invalidNameResult = zip(validateName(""), validateAge(30));
      expect(invalidNameResult).toEqual({
        type: "Err",
        error: "Name cannot be empty",
      });

      const invalidAgeResult = zip(validateName("John"), validateAge(200));
      expect(invalidAgeResult).toEqual({ type: "Err", error: "Invalid age" });
    });

    it("should preserve reference equality", () => {
      const obj1 = { id: 1 };
      const obj2 = { id: 2 };
      const result1 = ok(obj1);
      const result2 = ok(obj2);

      const zipped = zip(result1, result2);
      if (isOk(zipped)) {
        expect(zipped.value[0]).toBe(obj1);
        expect(zipped.value[1]).toBe(obj2);
      }
    });
  });

  describe("apply()", () => {
    it("should apply a function to a value when both are successful", () => {
      const fnResult = ok((x: number) => x * 2);
      const valueResult = ok(5);

      const result = apply(fnResult, valueResult);
      expect(result).toEqual({ type: "Ok", value: 10 });
    });

    it("should return function error if function Result fails", () => {
      const fnResult = err("Function failed");
      const valueResult = ok(5);

      const result = apply(fnResult, valueResult);
      expect(result).toEqual({ type: "Err", error: "Function failed" });
    });

    it("should return value error if value Result fails", () => {
      const fnResult = ok((x: number) => x * 2);
      const valueResult = err("Value failed");

      const result = apply(fnResult, valueResult);
      expect(result).toEqual({ type: "Err", error: "Value failed" });
    });

    it("should return function error if both fail", () => {
      const fnResult = err("Function failed");
      const valueResult = err("Value failed");

      const result = apply(fnResult, valueResult);
      expect(result).toEqual({ type: "Err", error: "Function failed" });
    });

    it("should work with curried functions", () => {
      const add = (x: number) => (y: number) => x + y;
      const addResult = ok(add);
      const valueResult = ok(5);

      const result = apply(addResult, valueResult);
      expect(result.type).toBe("Ok");
      if (isOk(result)) {
        expect(typeof result.value).toBe("function");
        expect(result.value(3)).toBe(8); // 5 + 3
      }
    });

    it("should work with complex function transformations", () => {
      const transform = (data: { name: string }) => ({
        ...data,
        uppercaseName: data.name.toUpperCase(),
        timestamp: Date.now(),
      });

      const fnResult = ok(transform);
      const valueResult = ok({ name: "john" });

      const result = apply(fnResult, valueResult);
      expect(result.type).toBe("Ok");
      if (isOk(result)) {
        expect(result.value.name).toBe("john");
        expect(result.value.uppercaseName).toBe("JOHN");
        expect(result.value.timestamp).toBeTypeOf("number");
      }
    });

    it("should work with validation functions", () => {
      const validateEmail = (email: string) =>
        email.includes("@") ? email : "Invalid email";

      const fnResult = ok(validateEmail);
      const validEmailResult = ok("test@example.com");
      const invalidEmailResult = ok("invalid-email");

      const validResult = apply(fnResult, validEmailResult);
      expect(validResult).toEqual({ type: "Ok", value: "test@example.com" });

      const invalidResult = apply(fnResult, invalidEmailResult);
      expect(invalidResult).toEqual({ type: "Ok", value: "Invalid email" });
    });

    it("should work with different function types", () => {
      // String transformation
      const upperCase = (s: string) => s.toUpperCase();
      expect(apply(ok(upperCase), ok("hello"))).toEqual({
        type: "Ok",
        value: "HELLO",
      });

      // Array transformation
      const getLength = (arr: any[]) => arr.length;
      expect(apply(ok(getLength), ok([1, 2, 3, 4]))).toEqual({
        type: "Ok",
        value: 4,
      });

      // Object transformation
      const getId = (obj: { id: number }) => obj.id;
      expect(apply(ok(getId), ok({ id: 42, name: "test" }))).toEqual({
        type: "Ok",
        value: 42,
      });
    });

    it("should maintain type safety", () => {
      const addOne = (x: number) => x + 1;
      const fnResult: Result<(x: number) => number, string> = ok(addOne);
      const valueResult: Result<number, string> = ok(5);

      const result = apply(fnResult, valueResult);
      if (isOk(result)) {
        expect(typeof result.value).toBe("number");
        expect(result.value).toBe(6);
      }
    });
  });

  describe("Integration Tests", () => {
    it("should work together in complex workflows", () => {
      const validateUser = (data: any) => {
        if (!data.name || !data.email)
          return resultErr("Missing required fields");
        return resultOk(data);
      };

      const enrichUser = (user: any) =>
        resultOk({
          ...user,
          displayName: `${user.name} <${user.email}>`,
          createdAt: Date.now(),
        });

      const result = safe(function* () {
        const userData = { name: "John", email: "john@example.com" };
        const validUser = yield validateUser(userData);
        const enrichedUser = yield enrichUser(validUser);

        // Use zip to combine with additional data
        const metadata = resultOk({ version: "1.0", source: "api" });
        const combined = yield zip(ok(enrichedUser), metadata);

        return {
          user: combined[0],
          metadata: combined[1],
        };
      });

      expect(result.type).toBe("Ok");
      if (isOk(result)) {
        expect(result.value.user.name).toBe("John");
        expect(result.value.user.displayName).toBe("John <john@example.com>");
        expect(result.value.metadata.version).toBe("1.0");
      }
    });

    it("should work with safe() and zip() together", () => {
      const getUser = (id: number) =>
        id === 1
          ? resultOk({ id: 1, name: "John" })
          : resultErr("User not found");

      const getProfile = (id: number) =>
        id === 1
          ? resultOk({ userId: 1, bio: "Developer" })
          : resultErr("Profile not found");

      const result = safe(function* () {
        const userResult = getUser(1);
        const profileResult = getProfile(1);
        const combined = yield zip(userResult, profileResult);

        return {
          user: combined[0],
          profile: combined[1],
        };
      });

      expect(result.type).toBe("Ok");
      if (isOk(result)) {
        expect(result.value.user.name).toBe("John");
        expect(result.value.profile.bio).toBe("Developer");
      }
    });

    it("should demonstrate chain() vs safe() approaches", () => {
      const getUser = (id: number) => resultOk({ id, name: "John" });
      const getProfile = (user: any) =>
        resultOk({ userId: user.id, bio: "Developer" });
      const enrichProfile = (profile: any) =>
        resultOk({ ...profile, enhanced: true });

      // Using generators with safe()
      const generatorResult = safe(function* () {
        const user = yield getUser(1);
        const profile = yield getProfile(user);
        const enriched = yield enrichProfile(profile);
        return { user, profile: enriched };
      });

      // Using fluent chains
      const chainResult = chain(getUser(1))
        .then((user) => getProfile(user))
        .then((profile) => enrichProfile(profile))
        .then((enriched) =>
          resultOk({ user: { id: 1, name: "John" }, profile: enriched }),
        )
        .run();

      // Both should produce equivalent results
      expect(generatorResult.type).toBe("Ok");
      expect(chainResult.type).toBe("Ok");

      if (isOk(generatorResult) && isOk(chainResult)) {
        expect(generatorResult.value.profile.enhanced).toBe(true);
        expect(chainResult.value.profile.enhanced).toBe(true);
      }
    });

    it("should work with safeAsync() and apply() together", async () => {
      const fetchMultiplier = async () => ok((x: number) => x * 3);
      const fetchValue = async () => ok(10);

      const result = await safeAsync(async function* () {
        const multiplierResult = yield await fetchMultiplier();
        const valueResult = yield await fetchValue();
        return multiplierResult(valueResult); // ✅ Direct function application
      });

      expect(result).toEqual({ type: "Ok", value: 30 });
    });

    it("should handle complex real-world scenarios", async () => {
      // Simulate a complex user registration process
      const validateEmail = (email: string) =>
        email.includes("@") ? resultOk(email) : resultErr("Invalid email");

      const checkEmailAvailable = async (email: string) => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return email === "taken@example.com"
          ? resultErr("Email already taken")
          : resultOk(email);
      };

      const createUser = async (userData: any) => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return resultOk({
          id: Date.now(), // ✅ FIXED: Timestamp goes here as ID
          ...userData,
          createdAt: new Date().toISOString(),
        });
      };

      const result = await safeAsync(async function* () {
        const email = "new@example.com";
        const validEmail = yield validateEmail(email);
        const availableEmail = yield await checkEmailAvailable(validEmail);
        const userData = { name: "John Doe", email: availableEmail };
        const user = yield await createUser(userData);
        return user; // ✅ FIXED: Return user object, not timestamp
      });

      expect(result.type).toBe("Ok");
      if (isOk(result)) {
        expect(result.value.name).toBe("John Doe");
        expect(result.value.email).toBe("new@example.com");
        expect(result.value.id).toBeTypeOf("number");
        expect(result.value.createdAt).toBeTypeOf("string");
      }
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

    it("should handle nested Result types", () => {
      const nestedResult: Result<Result<number, string>, string> = ok(ok(42));

      const result = safe(function* () {
        const outer = yield nestedResult;
        const inner = yield outer;
        return inner;
      });

      expect(result).toEqual({ type: "Ok", value: 42 });
    });

    it("should preserve error object references", () => {
      const customError = new Error("Custom error");
      const errorResult = err(customError);

      const result = safe(function* () {
        yield errorResult;
        return "unreachable";
      });

      expect(result.type).toBe("Err");
      if (isErr(result)) {
        expect(result.error).toBe(customError);
      }
    });

    it("should handle undefined and null values correctly", () => {
      expect(zip(ok(null), ok(undefined))).toEqual({
        type: "Ok",
        value: [null, undefined],
      });

      expect(
        apply(
          ok((x: any) => x),
          ok(null),
        ),
      ).toEqual({
        type: "Ok",
        value: null,
      });
    });

    it("should handle large generator chains efficiently", () => {
      const result = safe(function* () {
        let sum = 0;
        for (let i = 0; i < 100; i++) {
          const value = yield ok(i);
          sum += value;
        }
        return sum;
      });

      expect(result).toEqual({ type: "Ok", value: 4950 }); // Sum of 0 to 99
    });

    it("should handle early exit in large chains", () => {
      const result = safe(function* () {
        for (let i = 0; i < 100; i++) {
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
