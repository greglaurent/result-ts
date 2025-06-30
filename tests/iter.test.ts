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
  type Result,
} from "../src/iter";

// ✅ FIXED: Fixed timestamp instead of Date.now()
const FIXED_TIMESTAMP = 1672531200000; // 2023-01-01T00:00:00.000Z

describe("Iteration Operations", () => {
  describe("map()", () => {
    it("should transform success values", () => {
      const result = map(ok(5), (x) => x * 2);
      expect(result).toEqual({ type: "Ok", value: 10 });
    });

    it("should pass through error values unchanged", () => {
      const result = map(err("failed"), (x: number) => x * 2);
      expect(result).toEqual({ type: "Err", error: "failed" });
    });

    it("should handle type transformations", () => {
      const result = map(ok(42), (x) => x.toString());
      expect(result).toEqual({ type: "Ok", value: "42" });
    });

    it("should work with complex transformations", () => {
      interface User {
        id: number;
        name: string;
      }

      const user: User = { id: 1, name: "John" };
      const result = map(ok(user), (u) => ({ ...u, displayName: u.name.toUpperCase() }));

      expect(result.type).toBe("Ok");
      if (isOk(result)) {
        expect(result.value.displayName).toBe("JOHN");
        expect(result.value.id).toBe(1);
      }
    });

    it("should preserve error types", () => {
      const numberError: Result<string, number> = err(404);
      const result = map(numberError, (s: string) => s.length);

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
        // ✅ FIXED: Use Promise.resolve() instead of setTimeout for deterministic async
        await Promise.resolve();
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

    it("should handle complex async data transformations", async () => {
      interface ApiResponse {
        data: { id: number; name: string }[];
        meta: { total: number };
      }

      const apiResponse: ApiResponse = {
        data: [{ id: 1, name: "John" }, { id: 2, name: "Jane" }],
        meta: { total: 2 }
      };

      const result = await mapAsync(Promise.resolve(ok(apiResponse)), async (response) => {
        // ✅ FIXED: Use Promise.resolve() instead of setTimeout for deterministic async
        await Promise.resolve();
        return {
          users: response.data.map(user => user.name),
          count: response.meta.total
        };
      });

      expect(result.type).toBe("Ok");
      if (isOk(result)) {
        expect(result.value.users).toEqual(["John", "Jane"]);
        expect(result.value.count).toBe(2);
      }
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
          timestamp: FIXED_TIMESTAMP, // ✅ FIXED: Use fixed timestamp instead of Date.now()
          message: e.message,
          type: "system_error",
        })),
      ).toEqual({
        type: "Err",
        error: {
          timestamp: FIXED_TIMESTAMP, // ✅ FIXED: Predictable timestamp
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

    it("should work with structured error transformations", () => {
      interface ApiError {
        statusCode: number;
        message: string;
        path: string;
      }

      const simpleError = "validation failed";
      const result = mapErr(err(simpleError), (error): ApiError => ({
        statusCode: 400,
        message: error,
        path: "/api/users"
      }));

      expect(result.type).toBe("Err");
      if (isErr(result)) {
        expect(result.error.statusCode).toBe(400);
        expect(result.error.message).toBe("validation failed");
        expect(result.error.path).toBe("/api/users");
      }
    });
  });

  describe("mapErrAsync()", () => {
    it("should transform error values asynchronously", async () => {
      const promise = Promise.resolve(err("failed"));
      const result = await mapErrAsync(promise, async (error) => ({
        code: 500,
        message: error,
        timestamp: FIXED_TIMESTAMP, // ✅ FIXED: Use fixed timestamp instead of Date.now()
      }));

      expect(result.type).toBe("Err");
      if (isErr(result)) {
        expect(result.error).toEqual({
          code: 500,
          message: "failed",
          timestamp: FIXED_TIMESTAMP, // ✅ FIXED: Predictable timestamp
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
        // ✅ FIXED: Use Promise.resolve() instead of setTimeout for deterministic async
        await Promise.resolve();
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

    it("should handle complex async error processing", async () => {
      interface DetailedError {
        level: string;
        category: string;
        originalMessage: string;
        processedAt: number;
      }

      const result = await mapErrAsync(
        Promise.resolve(err("database connection failed")),
        async (error): Promise<DetailedError> => {
          // ✅ FIXED: Use Promise.resolve() instead of setTimeout for deterministic async
          await Promise.resolve();
          return {
            level: "critical",
            category: "database",
            originalMessage: error,
            processedAt: FIXED_TIMESTAMP // ✅ FIXED: Use fixed timestamp
          };
        }
      );

      expect(result.type).toBe("Err");
      if (isErr(result)) {
        expect(result.error.level).toBe("critical");
        expect(result.error.category).toBe("database");
        expect(result.error.processedAt).toBe(FIXED_TIMESTAMP);
      }
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

      // Chain multiple operations using andThen
      const result1 = andThen(andThen(parseNumber("5"), validatePositive), double);
      expect(result1).toEqual({ type: "Ok", value: 10 });

      // Test failure in chain
      const result2 = andThen(andThen(parseNumber("-5"), validatePositive), double);
      expect(result2).toEqual({ type: "Err", error: "Must be positive" });
    });
  });

  describe("andThenAsync()", () => {
    it("should chain successful async operations", async () => {
      const fetchUser = async (id: number) => {
        // ✅ FIXED: Use Promise.resolve() instead of setTimeout for deterministic async
        await Promise.resolve();
        return ok({ id, name: "John" });
      };

      const fetchUserPosts = async (user: { id: number; name: string }) => {
        // ✅ FIXED: Use Promise.resolve() instead of setTimeout for deterministic async
        await Promise.resolve();
        return ok([`Post by ${user.name}`]);
      };

      const result = await andThenAsync(fetchUser(1), fetchUserPosts);
      expect(result).toEqual({
        type: "Ok",
        value: ["Post by John"],
      });
    });

    it("should short-circuit on first async error", async () => {
      const fetchUser = async () => {
        // ✅ FIXED: Use Promise.resolve() instead of setTimeout for deterministic async
        await Promise.resolve();
        return err("User not found");
      };

      const fetchUserPosts = async () => {
        // ✅ FIXED: Use Promise.resolve() instead of setTimeout for deterministic async
        await Promise.resolve();
        return err("Posts service unavailable");
      };

      const result = await andThenAsync(fetchUser(), fetchUserPosts);
      expect(result).toEqual({
        type: "Err",
        error: "User not found",
      });
    });

    it("should handle subsequent async failures", async () => {
      const fetchUser = async (id: number) => {
        // ✅ FIXED: Use Promise.resolve() instead of setTimeout for deterministic async
        await Promise.resolve();
        return ok({ id, name: "John" });
      };

      const fetchUserPosts = async () => {
        // ✅ FIXED: Use Promise.resolve() instead of setTimeout for deterministic async
        await Promise.resolve();
        return err("Posts service unavailable");
      };

      const result = await andThenAsync(fetchUser(1), fetchUserPosts);
      expect(result).toEqual({
        type: "Err",
        error: "Posts service unavailable",
      });
    });

    it("should work with mixed sync/async operations", async () => {
      const syncOperation = (n: number) => ok(n * 2);
      const asyncOperation = async (n: number) => {
        // ✅ FIXED: Use Promise.resolve() instead of setTimeout for deterministic async
        await Promise.resolve();
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

    it("should handle complex async workflows", async () => {
      interface UserProfile {
        id: number;
        name: string;
        email: string;
      }

      interface UserSettings {
        theme: string;
        notifications: boolean;
      }

      const fetchUserProfile = async (id: number): Promise<Result<UserProfile, string>> => {
        // ✅ FIXED: Use Promise.resolve() instead of setTimeout for deterministic async
        await Promise.resolve();
        return ok({
          id,
          name: "John Doe",
          email: "john@example.com"
        });
      };

      const fetchUserSettings = async (profile: UserProfile): Promise<Result<UserSettings, string>> => {
        // ✅ FIXED: Use Promise.resolve() instead of setTimeout for deterministic async
        await Promise.resolve();
        return ok({
          theme: "dark",
          notifications: true
        });
      };

      const result = await andThenAsync(fetchUserProfile(1), fetchUserSettings);

      expect(result.type).toBe("Ok");
      if (isOk(result)) {
        expect(result.value.theme).toBe("dark");
        expect(result.value.notifications).toBe(true);
      }
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

      interface ProcessedUser {
        id: number;
        displayName: string;
        hasEmail: boolean;
      }

      const users: User[] = [
        { id: 1, name: "John" },
        { id: 2, name: "Jane", email: "jane@example.com" },
      ];

      const processUser = (user: User): Result<ProcessedUser, string> => {
        if (!user.name.trim()) {
          return err("User name cannot be empty");
        }

        return ok({
          id: user.id,
          displayName: user.name.toUpperCase(),
          hasEmail: !!user.email
        });
      };

      const addEmailFlag = (user: ProcessedUser): Result<ProcessedUser, string> => {
        return ok({
          ...user,
          displayName: user.hasEmail
            ? `${user.displayName} (✓)`
            : `${user.displayName} (✗)`
        });
      };

      // Process each user through the pipeline using andThen
      const results = users.map(user =>
        andThen(ok(user), (u) => andThen(processUser(u), addEmailFlag))
      );

      expect(results[0]).toEqual({
        type: "Ok",
        value: {
          id: 1,
          displayName: "JOHN (✗)",
          hasEmail: false
        }
      });

      expect(results[1]).toEqual({
        type: "Ok",
        value: {
          id: 2,
          displayName: "JANE (✓)",
          hasEmail: true
        }
      });
    });

    it("should handle mixed sync/async operations in real workflow", async () => {
      // Simulate an API data processing workflow
      const validateInput = (input: string): Result<string, string> => {
        return input.trim().length > 0 ? ok(input.trim()) : err("Empty input");
      };

      const fetchUserData = async (username: string) => {
        // ✅ FIXED: Use Promise.resolve() instead of setTimeout for deterministic async
        await Promise.resolve();
        return username === "john"
          ? ok({ id: 1, name: "John Doe", role: "admin" })
          : err("User not found");
      };

      const enrichUserData = async (user: { id: number; name: string; role: string }) => {
        // ✅ FIXED: Use Promise.resolve() instead of setTimeout for deterministic async
        await Promise.resolve();
        return ok({
          ...user,
          permissions: user.role === "admin" ? ["read", "write", "delete"] : ["read"]
        });
      };

      // Test successful flow - chain operations using andThen
      const input = "john";
      const validatedInput = validateInput(input);

      const successResult = await (async () => {
        if (isErr(validatedInput)) return validatedInput;
        const userData = await fetchUserData(validatedInput.value);
        return await andThenAsync(Promise.resolve(userData), enrichUserData);
      })();

      expect(successResult.type).toBe("Ok");
      if (isOk(successResult)) {
        expect(successResult.value.name).toBe("John Doe");
        expect(successResult.value.permissions).toEqual(["read", "write", "delete"]);
      }

      // Test failure flow
      const emptyInput = "";
      const invalidatedInput = validateInput(emptyInput);
      expect(invalidatedInput).toEqual({ type: "Err", error: "Empty input" });
    });

    it("should demonstrate error transformation patterns", async () => {
      interface ApiError {
        status: number;
        message: string;
        timestamp: number;
      }

      const simulateApiCall = async (shouldFail: boolean) => {
        // ✅ FIXED: Use Promise.resolve() instead of setTimeout for deterministic async
        await Promise.resolve();
        return shouldFail
          ? err("Network timeout")
          : ok({ data: "success" });
      };

      const transformError = (error: string): ApiError => ({
        status: 500,
        message: error,
        timestamp: FIXED_TIMESTAMP // ✅ FIXED: Use fixed timestamp
      });

      // Test error transformation
      const result = await mapErrAsync(
        simulateApiCall(true),
        async (error) => {
          // ✅ FIXED: Use Promise.resolve() instead of setTimeout for deterministic async
          await Promise.resolve();
          return transformError(error);
        }
      );

      expect(result.type).toBe("Err");
      if (isErr(result)) {
        expect(result.error.status).toBe(500);
        expect(result.error.message).toBe("Network timeout");
        expect(result.error.timestamp).toBe(FIXED_TIMESTAMP);
      }
    });
  });
});
