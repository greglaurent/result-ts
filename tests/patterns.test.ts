import { describe, it, expect } from "vitest";
import {
  ok,
  Ok,
  Err,
  err,
  isOk,
  isErr,
  safe,
  safeAsync,
  yieldFn,
  zipWith,
  zip,
  type Result,
} from "../src/patterns";
import { OK } from "@/types";

// ✅ FIXED: Deterministic ID generation instead of Date.now()
let mockIdCounter = 1000;
const resetMockId = () => { mockIdCounter = 1000; };

// ✅ FIXED: Fixed timestamp instead of new Date().toISOString()
const FIXED_TIMESTAMP = '2023-01-01T00:00:00.000Z';

describe("Pattern Operations", () => {
  describe("safe()", () => {
    it("should handle successful generator flows", () => {
      const result = safe(function* () {
        const a = yield ok(1);
        const b = yield ok(2);
        const c = yield ok(3);
        return a + b + c;
      });

      expect(result).toEqual({ type: "Ok", value: 6 });
    });

    it("should stop on first error", () => {
      const result = safe(function* () {
        const a = yield ok(1);
        const b = yield err("failed");
        const c = yield ok(3); // Should not execute
        return a + b + c;
      });

      expect(result).toEqual({ type: "Err", error: "failed" });
    });

    it("should handle empty generators", () => {
      const result = safe(function* () {
        return "immediate return";
      });

      expect(result).toEqual({ type: "Ok", value: "immediate return" });
    });

    it("should handle complex data transformations", () => {
      interface User {
        id: number;
        name: string;
        email: string;
      }

      const validateUser = (data: any): Result<User, string> => {
        if (!data.name) return err("Name is required");
        if (!data.email?.includes("@")) return err("Invalid email");
        return ok({ id: data.id, name: data.name, email: data.email });
      };

      const enrichUser = (user: User): Result<User & { displayName: string }, string> => {
        return ok({
          ...user,
          displayName: `${user.name} <${user.email}>`
        });
      };

      const userData = { id: 1, name: "John Doe", email: "john@example.com" };

      const result = safe(function* () {
        const user = yield validateUser(userData);
        const enrichedUser = yield enrichUser(user);
        return enrichedUser;
      });

      expect(result.type).toBe("Ok");
      if (isOk(result)) {
        expect(result.value.name).toBe("John Doe");
        expect(result.value.displayName).toBe("John Doe <john@example.com>");
      }
    });
  });

  describe("safeAsync()", () => {
    it("should handle successful async generator flows", async () => {
      const result = await safeAsync(async function* () {
        const a = yield await Promise.resolve(ok(1));
        const b = yield await Promise.resolve(ok(2));
        const c = yield await Promise.resolve(ok(3));
        return a + b + c;
      });

      expect(result).toEqual({ type: "Ok", value: 6 });
    });

    it("should stop on first async error", async () => {
      const result = await safeAsync(async function* () {
        const a = yield await Promise.resolve(ok(1));
        const b = yield await Promise.resolve(err("async failed"));
        const c = yield await Promise.resolve(ok(3)); // Should not execute
        return a + b + c;
      });

      expect(result).toEqual({ type: "Err", error: "async failed" });
    });

    it("should handle mixed sync and async operations", async () => {
      const result = await safeAsync(async function* () {
        const syncValue = yield ok(10);
        const asyncValue = yield await Promise.resolve(ok(20));
        return syncValue + asyncValue;
      });

      expect(result).toEqual({ type: "Ok", value: 30 });
    });

    it("should handle realistic async workflow", async () => {
      // Reset ID counter for deterministic results
      resetMockId();

      const validateEmail = (email: string) =>
        email.includes("@") ? ok(email) : err("Invalid email");

      const checkEmailAvailable = async (email: string) => {
        // ✅ FIXED: Use Promise.resolve() instead of setTimeout for deterministic async
        await Promise.resolve();
        return email === "taken@example.com"
          ? err("Email already taken")
          : ok(email);
      };

      const createUser = async (userData: any) => {
        // ✅ FIXED: Use Promise.resolve() instead of setTimeout for deterministic async
        await Promise.resolve();
        return ok({
          id: mockIdCounter++, // ✅ FIXED: Deterministic ID instead of Date.now()
          ...userData,
          createdAt: FIXED_TIMESTAMP, // ✅ FIXED: Fixed timestamp instead of new Date()
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
        expect(result.value.id).toBe(1000); // ✅ FIXED: Predictable ID
        expect(result.value.createdAt).toBe(FIXED_TIMESTAMP); // ✅ FIXED: Predictable timestamp
      }
    });

    it("should handle complex async data flows", async () => {
      const fetchUserById = async (id: number) => {
        // ✅ FIXED: Use Promise.resolve() instead of setTimeout for deterministic async
        await Promise.resolve();
        return id === 1 ? ok({ id: 1, name: "John" }) : err("User not found");
      };

      const fetchUserPosts = async (userId: number) => {
        // ✅ FIXED: Use Promise.resolve() instead of setTimeout for deterministic async
        await Promise.resolve();
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
        expect(result.value.posts[0].authorId).toBe(result.value.user.id);
      }
    });

    it("should handle async operation sequencing correctly", async () => {
      // ✅ FIXED: Test operation sequencing, not timing behavior
      const operations: string[] = [];

      const operation = async (name: string) => {
        // ✅ FIXED: Use Promise.resolve() instead of setTimeout for deterministic async
        await Promise.resolve();
        operations.push(name);
        return ok(`${name} completed`);
      };

      const result = await safeAsync(async function* () {
        const a = yield await operation("first");
        const b = yield await operation("second");
        return { a, b };
      });

      // Test behavior: operations executed in sequence, not timing
      expect(result.type).toBe("Ok");
      if (isOk(result)) {
        expect(result.value.a).toBe("first completed");
        expect(result.value.b).toBe("second completed");
        expect(operations).toEqual(["first", "second"]); // ✅ FIXED: Test sequencing
        expect(typeof result.value).toBe("object");
        expect(result.value).toHaveProperty("a");
        expect(result.value).toHaveProperty("b");
      }
    });
  });

  describe("yieldFn()", () => {
    it("should return the same Result it receives", () => {
      const successResult = ok(42);
      const errorResult = err("failed");

      expect(yieldFn(successResult)).toBe(successResult);
      expect(yieldFn(errorResult)).toBe(errorResult);
    });

    it("should work within safe generators", () => {
      const result = safe(function* () {
        const a = yield yieldFn(ok(1));
        const b = yield yieldFn(ok(2));
        return a + b;
      });

      expect(result).toEqual({ type: "Ok", value: 3 });
    });

    it("should propagate errors within safe generators", () => {
      const result = safe(function* () {
        const a = yield yieldFn(ok(1));
        const b = yield yieldFn(err("failed"));
        return a + b;
      });

      expect(result).toEqual({ type: "Err", error: "failed" });
    });
  });

  describe("zipWith()", () => {
    it("should combine two successful Results with a function", () => {
      const result1 = ok(10);
      const result2 = ok(20);
      const combined = zipWith(result1, result2, (a, b) => a + b);

      expect(combined).toEqual({ type: "Ok", value: 30 });
    });

    it("should return first error if first Result is error", () => {
      const result1: Result<number, string> = err("first error");
      const result2: Result<number, string> = ok(20);
      const combined = zipWith(result1, result2, (a: number, b: number) => a + b);

      expect(combined).toEqual({ type: "Err", error: "first error" });
    });

    it("should return second error if second Result is error", () => {
      const result1 = ok(10);
      const result2 = err("second error");
      const combined = zipWith(result1, result2, (a: number, b: number) => a + b);

      expect(combined).toEqual({ type: "Err", error: "second error" });
    });

    it("should return first error if both Results are errors", () => {
      const result1: Err<string> = err("first error");
      const result2: Err<string> = err("second error");
      const combined = zipWith(result1, result2, (a: number, b: number) => a + b);

      expect(combined).toEqual({ type: "Err", error: "first error" });
    });

    it("should work with different types", () => {
      const numberResult = ok(42);
      const stringResult = ok("hello");
      const combined = zipWith(numberResult, stringResult, (num, str) => `${str}: ${num}`);

      expect(combined).toEqual({ type: "Ok", value: "hello: 42" });
    });
  });

  describe("zip()", () => {
    it("should combine two successful Results into a tuple", () => {
      const result1 = ok("first");
      const result2 = ok("second");
      const combined = zip(result1, result2);

      expect(combined).toEqual({ type: "Ok", value: ["first", "second"] });
    });

    it("should return first error if first Result is error", () => {
      const result1 = err("first error");
      const result2 = ok("second");
      const combined = zip(result1, result2);

      expect(combined).toEqual({ type: "Err", error: "first error" });
    });

    it("should return second error if second Result is error", () => {
      const result1 = ok("first");
      const result2 = err("second error");
      const combined = zip(result1, result2);

      expect(combined).toEqual({ type: "Err", error: "second error" });
    });

    it("should work with different types", () => {
      const numberResult = ok(42);
      const booleanResult = ok(true);
      const combined = zip(numberResult, booleanResult);

      expect(combined).toEqual({ type: "Ok", value: [42, true] });

      if (isOk(combined)) {
        // TypeScript should infer the tuple type
        expect(typeof combined.value[0]).toBe("number");
        expect(typeof combined.value[1]).toBe("boolean");
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

    it("should handle generator cleanup on errors", () => {
      let cleanupCalled = false;

      const result = safe(function* () {
        try {
          const a = yield ok(1);
          const b = yield err("failed");
          return a + b;
        } finally {
          cleanupCalled = true;
        }
      });

      expect(result).toEqual({ type: "Err", error: "failed" });
      expect(cleanupCalled).toBe(true);
    });

    it("should handle async generator cleanup on errors", async () => {
      let cleanupCalled = false;

      const result = await safeAsync(async function* () {
        try {
          const a = yield await Promise.resolve(ok(1));
          const b = yield await Promise.resolve(err("async failed"));
          return a + b;
        } finally {
          cleanupCalled = true;
        }
      });

      expect(result).toEqual({ type: "Err", error: "async failed" });
      expect(cleanupCalled).toBe(true);
    });

    it("should handle thrown exceptions in generators", () => {
      expect(() => {
        safe(function* () {
          yield ok(1);
          throw new Error("Generator exception");
        });
      }).toThrow("Generator exception");
    });

    it("should handle thrown exceptions in async generators", async () => {
      await expect(async () => {
        await safeAsync(async function* () {
          yield await Promise.resolve(ok(1));
          throw new Error("Async generator exception");
        });
      }).rejects.toThrow("Async generator exception");
    });
  });

  describe("Integration Tests", () => {
    it("should work with complex nested operations", async () => {
      // Reset ID counter for predictable results
      resetMockId();

      interface UserData {
        id: number;
        name: string;
        email: string;
        profile?: {
          avatar: string;
          bio: string;
        };
      }

      const validateUserData = (data: any): Result<UserData, string> => {
        if (!data.name) return err("Name required");
        if (!data.email?.includes("@")) return err("Invalid email");
        return ok({ id: data.id, name: data.name, email: data.email });
      };

      const fetchUserProfile = async (userId: number) => {
        // ✅ FIXED: Deterministic async
        await Promise.resolve();
        return ok({
          avatar: `avatar-${userId}.jpg`,
          bio: `Bio for user ${userId}`
        });
      };

      const enrichUserWithProfile = async (user: UserData) => {
        // ✅ FIXED: Deterministic async
        await Promise.resolve();
        return ok({
          ...user,
          id: mockIdCounter++, // ✅ FIXED: Deterministic ID
          profile: {
            avatar: `avatar-${user.id}.jpg`,
            bio: `Bio for ${user.name}`
          }
        });
      };

      const userData = { id: 1, name: "Jane Doe", email: "jane@example.com" };

      const result = await safeAsync(async function* () {
        const validUser = yield validateUserData(userData);
        const profile = yield await fetchUserProfile(validUser.id);
        const enrichedUser = yield await enrichUserWithProfile({
          ...validUser,
          profile
        });
        return enrichedUser;
      });

      expect(result.type).toBe("Ok");
      if (isOk(result)) {
        expect(result.value.name).toBe("Jane Doe");
        expect(result.value.email).toBe("jane@example.com");
        expect(result.value.id).toBe(1000); // ✅ FIXED: Predictable ID
        expect(result.value.profile).toBeDefined();
        expect(result.value.profile?.bio).toBe("Bio for Jane Doe");
      }
    });

    it("should demonstrate real-world error handling patterns", async () => {
      const API_ERRORS = {
        NOT_FOUND: "Resource not found",
        UNAUTHORIZED: "Authentication required",
        RATE_LIMITED: "Too many requests"
      };

      const simulateApiCall = async (endpoint: string, shouldFail = false) => {
        // ✅ FIXED: Deterministic async
        await Promise.resolve();

        if (shouldFail) {
          return err(API_ERRORS.NOT_FOUND);
        }

        return ok({ endpoint, data: `Response from ${endpoint}` });
      };

      // Test successful flow
      const successResult = await safeAsync(async function* () {
        const userCall = yield await simulateApiCall("/users/1");
        const settingsCall = yield await simulateApiCall("/settings");
        return { user: userCall, settings: settingsCall };
      });

      expect(successResult.type).toBe("Ok");

      // Test failure flow
      const failureResult = await safeAsync(async function* () {
        const userCall = yield await simulateApiCall("/users/1");
        const badCall = yield await simulateApiCall("/nonexistent", true);
        return { user: userCall, bad: badCall };
      });

      expect(failureResult.type).toBe("Err");
      expect(failureResult).toEqual({ type: "Err", error: API_ERRORS.NOT_FOUND });
    });
  });
});
