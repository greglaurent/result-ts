import { describe, it, expect, vi } from "vitest";
import {
  ok,
  err,
  isOk,
  isErr,
  inspect,
  tap,
  tapErr,
  fromNullable,
  toNullable,
} from "../src/utils";
import type { Result } from "../src/types";

describe("Utils Module - Debugging and Conversion Utilities", () => {
  describe("inspect()", () => {
    it("should call onOk callback for successful Results", () => {
      const onOk = vi.fn();
      const onErr = vi.fn();
      const result = ok("hello");

      const returned = inspect(result, onOk, onErr);

      expect(onOk).toHaveBeenCalledWith("hello");
      expect(onOk).toHaveBeenCalledTimes(1);
      expect(onErr).not.toHaveBeenCalled();
      expect(returned).toBe(result); // Should return the same object
    });

    it("should call onErr callback for error Results", () => {
      const onOk = vi.fn();
      const onErr = vi.fn();
      const result = err("failed");

      const returned = inspect(result, onOk, onErr);

      expect(onErr).toHaveBeenCalledWith("failed");
      expect(onErr).toHaveBeenCalledTimes(1);
      expect(onOk).not.toHaveBeenCalled();
      expect(returned).toBe(result); // Should return the same object
    });

    it("should return original Result unchanged", () => {
      const original = ok(42);
      const returned = inspect(original, vi.fn(), vi.fn());

      expect(returned).toBe(original);
      expect(returned).toEqual({ type: "Ok", value: 42 });
    });

    it("should work with only onOk callback provided", () => {
      const onOk = vi.fn();
      const success = ok("test");
      const error = err("failed");

      inspect(success, onOk);
      expect(onOk).toHaveBeenCalledWith("test");

      inspect(error, onOk);
      // Should not throw even though onErr is undefined
      expect(onOk).toHaveBeenCalledTimes(1); // Still only called once
    });

    it("should work with only onErr callback provided", () => {
      const onErr = vi.fn();
      const success = ok("test");
      const error = err("failed");

      inspect(success, undefined, onErr);
      // Should not throw even though onOk is undefined
      expect(onErr).not.toHaveBeenCalled();

      inspect(error, undefined, onErr);
      expect(onErr).toHaveBeenCalledWith("failed");
    });

    it("should work with no callbacks provided", () => {
      const result = ok("test");

      // Should not throw
      expect(() => inspect(result)).not.toThrow();
      expect(() => inspect(result, undefined, undefined)).not.toThrow();

      const returned = inspect(result);
      expect(returned).toBe(result);
    });

    it("should handle different value types in callbacks", () => {
      const values: any[] = [];
      const errors: any[] = [];

      const onOk = (value: any) => values.push(value);
      const onErr = (error: any) => errors.push(error);

      inspect(ok(null), onOk, onErr);
      inspect(ok(undefined), onOk, onErr);
      inspect(ok(0), onOk, onErr);
      inspect(ok(false), onOk, onErr);
      inspect(ok({ id: 1 }), onOk, onErr);
      inspect(ok([1, 2, 3]), onOk, onErr);

      expect(values).toEqual([null, undefined, 0, false, { id: 1 }, [1, 2, 3]]);
      expect(errors).toEqual([]);

      inspect(err(new Error("test")), onOk, onErr);
      inspect(err(404), onOk, onErr);
      inspect(err({ code: 500 }), onOk, onErr);

      expect(errors).toHaveLength(3);
      expect(errors[0]).toBeInstanceOf(Error);
      expect(errors[1]).toBe(404);
      expect(errors[2]).toEqual({ code: 500 });
    });

    it("should be usable for debugging chains", () => {
      const debugLog: string[] = [];

      const result = inspect(
        ok("input"),
        (value) => debugLog.push(`Success: ${value}`),
        (error) => debugLog.push(`Error: ${error}`),
      );

      expect(debugLog).toEqual(["Success: input"]);
      expect(result).toEqual({ type: "Ok", value: "input" });

      const errorResult = inspect(
        err("something failed"),
        (value) => debugLog.push(`Success: ${value}`),
        (error) => debugLog.push(`Error: ${error}`),
      );

      expect(debugLog).toEqual(["Success: input", "Error: something failed"]);
      expect(errorResult).toEqual({ type: "Err", error: "something failed" });
    });
  });

  describe("tap()", () => {
    it("should call function for successful Results", () => {
      const sideEffect = vi.fn();
      const result = ok("hello");

      const returned = tap(result, sideEffect);

      expect(sideEffect).toHaveBeenCalledWith("hello");
      expect(sideEffect).toHaveBeenCalledTimes(1);
      expect(returned).toBe(result); // Should return the same object
    });

    it("should not call function for error Results", () => {
      const sideEffect = vi.fn();
      const result = err("failed");

      const returned = tap(result, sideEffect);

      expect(sideEffect).not.toHaveBeenCalled();
      expect(returned).toBe(result); // Should return the same object
    });

    it("should return original Result unchanged", () => {
      const original = ok(42);
      const returned = tap(original, vi.fn());

      expect(returned).toBe(original);
      expect(returned).toEqual({ type: "Ok", value: 42 });
    });

    it("should work for side effects like logging", () => {
      const logs: string[] = [];
      const logger = (value: any) => logs.push(`Processed: ${value}`);

      tap(ok("data1"), logger);
      tap(err("error1"), logger);
      tap(ok("data2"), logger);

      expect(logs).toEqual(["Processed: data1", "Processed: data2"]);
    });

    it("should work for side effects like caching", () => {
      const cache = new Map<string, any>();
      const cacheValue = (value: { id: string; data: any }) => {
        cache.set(value.id, value.data);
      };

      const user1 = { id: "user1", data: { name: "John" } };
      const user2 = { id: "user2", data: { name: "Jane" } };

      tap(ok(user1), cacheValue);
      tap(err("network error"), cacheValue);
      tap(ok(user2), cacheValue);

      expect(cache.size).toBe(2);
      expect(cache.get("user1")).toEqual({ name: "John" });
      expect(cache.get("user2")).toEqual({ name: "Jane" });
      expect(cache.has("user3")).toBe(false);
    });

    it("should handle different value types", () => {
      const values: any[] = [];
      const collector = (value: any) => values.push(value);

      tap(ok(null), collector);
      tap(ok(undefined), collector);
      tap(ok(0), collector);
      tap(ok(false), collector);
      tap(ok(""), collector);
      tap(ok({ complex: "object" }), collector);
      tap(ok([1, 2, 3]), collector);

      expect(values).toEqual([
        null,
        undefined,
        0,
        false,
        "",
        { complex: "object" },
        [1, 2, 3],
      ]);
    });

    it("should not affect the Result if side effect throws", () => {
      const throwingSideEffect = () => {
        throw new Error("Side effect failed");
      };

      const result = ok("important data");

      // The side effect throws, but the Result should be unchanged
      expect(() => tap(result, throwingSideEffect)).toThrow(
        "Side effect failed",
      );

      // The original result is still valid
      expect(result).toEqual({ type: "Ok", value: "important data" });
    });
  });

  describe("tapErr()", () => {
    it("should call function for error Results", () => {
      const sideEffect = vi.fn();
      const result = err("failed");

      const returned = tapErr(result, sideEffect);

      expect(sideEffect).toHaveBeenCalledWith("failed");
      expect(sideEffect).toHaveBeenCalledTimes(1);
      expect(returned).toBe(result); // Should return the same object
    });

    it("should not call function for successful Results", () => {
      const sideEffect = vi.fn();
      const result = ok("success");

      const returned = tapErr(result, sideEffect);

      expect(sideEffect).not.toHaveBeenCalled();
      expect(returned).toBe(result); // Should return the same object
    });

    it("should return original Result unchanged", () => {
      const original = err("error");
      const returned = tapErr(original, vi.fn());

      expect(returned).toBe(original);
      expect(returned).toEqual({ type: "Err", error: "error" });
    });

    it("should work for error logging", () => {
      const errorLogs: string[] = [];
      const errorLogger = (error: any) => errorLogs.push(`Error: ${error}`);

      tapErr(ok("success"), errorLogger);
      tapErr(err("network timeout"), errorLogger);
      tapErr(err("validation failed"), errorLogger);
      tapErr(ok("another success"), errorLogger);

      expect(errorLogs).toEqual([
        "Error: network timeout",
        "Error: validation failed",
      ]);
    });

    it("should work for error reporting/metrics", () => {
      const errorCounts = new Map<string, number>();
      const countError = (error: string) => {
        errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
      };

      tapErr(err("timeout"), countError);
      tapErr(ok("success"), countError);
      tapErr(err("timeout"), countError);
      tapErr(err("not_found"), countError);
      tapErr(err("timeout"), countError);

      expect(errorCounts.get("timeout")).toBe(3);
      expect(errorCounts.get("not_found")).toBe(1);
      expect(errorCounts.has("success")).toBe(false);
    });

    it("should handle different error types", () => {
      const errors: any[] = [];
      const collector = (error: any) => errors.push(error);

      tapErr(err("string error"), collector);
      tapErr(err(404), collector);
      tapErr(err(new Error("Error object")), collector);
      tapErr(err({ code: 500, message: "Object error" }), collector);
      tapErr(err(null), collector);
      tapErr(err(undefined), collector);

      expect(errors).toHaveLength(6);
      expect(errors[0]).toBe("string error");
      expect(errors[1]).toBe(404);
      expect(errors[2]).toBeInstanceOf(Error);
      expect(errors[3]).toEqual({ code: 500, message: "Object error" });
      expect(errors[4]).toBe(null);
      expect(errors[5]).toBe(undefined);
    });

    it("should not affect the Result if side effect throws", () => {
      const throwingSideEffect = () => {
        throw new Error("Error side effect failed");
      };

      const result = err("original error");

      // The side effect throws, but the Result should be unchanged
      expect(() => tapErr(result, throwingSideEffect)).toThrow(
        "Error side effect failed",
      );

      // The original result is still valid
      expect(result).toEqual({ type: "Err", error: "original error" });
    });
  });

  describe("fromNullable()", () => {
    it("should convert non-null values to Ok Results", () => {
      expect(fromNullable("hello")).toEqual({ type: "Ok", value: "hello" });
      expect(fromNullable(42)).toEqual({ type: "Ok", value: 42 });
      expect(fromNullable(true)).toEqual({ type: "Ok", value: true });
      expect(fromNullable(false)).toEqual({ type: "Ok", value: false });
      expect(fromNullable(0)).toEqual({ type: "Ok", value: 0 });
      expect(fromNullable("")).toEqual({ type: "Ok", value: "" });
      expect(fromNullable([])).toEqual({ type: "Ok", value: [] });
      expect(fromNullable({})).toEqual({ type: "Ok", value: {} });
    });

    it("should convert null to Err Result with default error", () => {
      const result = fromNullable(null);
      expect(result).toEqual({
        type: "Err",
        error: "Value is null or undefined",
      });
    });

    it("should convert undefined to Err Result with default error", () => {
      const result = fromNullable(undefined);
      expect(result).toEqual({
        type: "Err",
        error: "Value is null or undefined",
      });
    });

    it("should use custom error for null values", () => {
      const result = fromNullable(null, "Custom null error");
      expect(result).toEqual({ type: "Err", error: "Custom null error" });
    });

    it("should use custom error for undefined values", () => {
      const result = fromNullable(undefined, "Custom undefined error");
      expect(result).toEqual({ type: "Err", error: "Custom undefined error" });
    });

    it("should handle custom error objects", () => {
      const customError = { code: 404, message: "Not found" };

      expect(fromNullable(null, customError)).toEqual({
        type: "Err",
        error: customError,
      });

      expect(fromNullable(undefined, customError)).toEqual({
        type: "Err",
        error: customError,
      });
    });

    it("should handle Error objects as custom errors", () => {
      const customError = new Error("Value missing");

      expect(fromNullable(null, customError)).toEqual({
        type: "Err",
        error: customError,
      });
    });

    it("should work with array find operations", () => {
      const users = [
        { id: 1, name: "John" },
        { id: 2, name: "Jane" },
      ];

      const found = fromNullable(
        users.find((u) => u.id === 1),
        "User not found",
      );
      expect(found).toEqual({ type: "Ok", value: { id: 1, name: "John" } });

      const notFound = fromNullable(
        users.find((u) => u.id === 99),
        "User not found",
      );
      expect(notFound).toEqual({ type: "Err", error: "User not found" });
    });

    it("should work with Map get operations", () => {
      const cache = new Map([["key1", "value1"]]);

      const hit = fromNullable(cache.get("key1"), "Cache miss");
      expect(hit).toEqual({ type: "Ok", value: "value1" });

      const miss = fromNullable(cache.get("key2"), "Cache miss");
      expect(miss).toEqual({ type: "Err", error: "Cache miss" });
    });

    it("should work with optional object properties", () => {
      interface User {
        id: number;
        email?: string;
      }

      const userWithEmail: User = { id: 1, email: "test@example.com" };
      const userWithoutEmail: User = { id: 2 };

      const emailResult1 = fromNullable(userWithEmail.email, "No email");
      expect(emailResult1).toEqual({ type: "Ok", value: "test@example.com" });

      const emailResult2 = fromNullable(userWithoutEmail.email, "No email");
      expect(emailResult2).toEqual({ type: "Err", error: "No email" });
    });
  });

  describe("toNullable()", () => {
    it("should convert Ok Results to their values", () => {
      expect(toNullable(ok("hello"))).toBe("hello");
      expect(toNullable(ok(42))).toBe(42);
      expect(toNullable(ok(true))).toBe(true);
      expect(toNullable(ok(false))).toBe(false);
      expect(toNullable(ok(0))).toBe(0);
      expect(toNullable(ok(""))).toBe("");
      expect(toNullable(ok([]))).toEqual([]);
      expect(toNullable(ok({}))).toEqual({});
    });

    it("should convert Ok Results with null/undefined values correctly", () => {
      expect(toNullable(ok(null))).toBe(null);
      expect(toNullable(ok(undefined))).toBe(undefined);
    });

    it("should convert Err Results to null", () => {
      expect(toNullable(err("error"))).toBe(null);
      expect(toNullable(err(404))).toBe(null);
      expect(toNullable(err(new Error("test")))).toBe(null);
      expect(toNullable(err({ code: 500 }))).toBe(null);
      expect(toNullable(err(null))).toBe(null);
      expect(toNullable(err(undefined))).toBe(null);
    });

    it("should work well with optional chaining", () => {
      interface User {
        id: number;
        profile?: {
          name: string;
          avatar?: string;
        };
      }

      const getUserAvatar = (user: User): Result<string, string> => {
        if (user.profile?.avatar) {
          return ok(user.profile.avatar);
        }
        return err("No avatar");
      };

      const userWithAvatar: User = {
        id: 1,
        profile: { name: "John", avatar: "avatar.jpg" },
      };
      const userWithoutAvatar: User = { id: 2, profile: { name: "Jane" } };

      const avatar1 = toNullable(getUserAvatar(userWithAvatar));
      expect(avatar1).toBe("avatar.jpg");

      const avatar2 = toNullable(getUserAvatar(userWithoutAvatar));
      expect(avatar2).toBe(null);

      // Can be used in conditional checks
      if (avatar1) {
        expect(avatar1.endsWith(".jpg")).toBe(true);
      }
    });

    it("should preserve object references", () => {
      const obj = { id: 1, name: "test" };
      const array = [1, 2, 3];

      const objResult = toNullable(ok(obj));
      const arrayResult = toNullable(ok(array));

      expect(objResult).toBe(obj); // Same reference
      expect(arrayResult).toBe(array); // Same reference
    });

    it("should work with complex Result chains", () => {
      const processData = (input: string): Result<number, string> => {
        const trimmed = input.trim();
        if (!trimmed) return err("Empty input");

        const num = parseInt(trimmed);
        if (isNaN(num)) return err("Not a number");

        if (num < 0) return err("Negative number");

        return ok(num * 2);
      };

      expect(toNullable(processData("5"))).toBe(10);
      expect(toNullable(processData("  "))).toBe(null);
      expect(toNullable(processData("abc"))).toBe(null);
      expect(toNullable(processData("-5"))).toBe(null);
    });
  });

  describe("Integration Tests", () => {
    it("should work together for debugging workflows", () => {
      const debugLog: string[] = [];
      const errorLog: string[] = [];

      const processUser = (id: number): Result<string, string> => {
        if (id <= 0) return err("Invalid ID");
        if (id > 100) return err("ID too large");
        return ok(`User ${id}`);
      };

      const pipeline = (id: number) => {
        return inspect(
          tap(
            tapErr(processUser(id), (error) =>
              errorLog.push(`Error: ${error}`),
            ),
            (user) => debugLog.push(`Processed: ${user}`),
          ),
          (value) => debugLog.push(`Success: ${value}`),
          (error) => errorLog.push(`Final error: ${error}`),
        );
      };

      // Success case
      const result1 = pipeline(42);
      expect(result1).toEqual({ type: "Ok", value: "User 42" });
      expect(debugLog).toEqual(["Processed: User 42", "Success: User 42"]);
      expect(errorLog).toEqual([]);

      // Error case
      debugLog.length = 0;
      errorLog.length = 0;

      const result2 = pipeline(-1);
      expect(result2).toEqual({ type: "Err", error: "Invalid ID" });
      expect(debugLog).toEqual([]);
      expect(errorLog).toEqual([
        "Error: Invalid ID",
        "Final error: Invalid ID",
      ]);
    });

    it("should work together for nullable conversion workflows", () => {
      interface User {
        id: number;
        name: string;
        email?: string;
      }

      const users: User[] = [
        { id: 1, name: "John", email: "john@example.com" },
        { id: 2, name: "Jane" },
      ];

      const findUserById = (id: number): User | undefined => {
        return users.find((u) => u.id === id);
      };

      const getUserEmail = (id: number): string | null => {
        const userResult = fromNullable(findUserById(id), "User not found");

        if (isErr(userResult)) return null;

        const emailResult = fromNullable(userResult.value.email, "No email");
        return toNullable(emailResult);
      };

      expect(getUserEmail(1)).toBe("john@example.com");
      expect(getUserEmail(2)).toBe(null); // User exists but no email
      expect(getUserEmail(99)).toBe(null); // User doesn't exist
    });

    it("should work with real-world API patterns", () => {
      // Simulate API response handling
      const apiLogs: string[] = [];

      const fetchUserData = (id: number): Result<any, string> => {
        if (id === 1) return ok({ id: 1, name: "John", active: true });
        if (id === 2) return ok({ id: 2, name: "Jane", active: false });
        return err("User not found");
      };

      const processApiCall = (id: number) => {
        return inspect(
          tap(
            tapErr(fetchUserData(id), (error) =>
              apiLogs.push(`API Error for ID ${id}: ${error}`),
            ),
            (user) => apiLogs.push(`API Success for ID ${id}: ${user.name}`),
          ),
          (user) => apiLogs.push(`Processing user: ${user.name}`),
          (error) => apiLogs.push(`Failed to process ID ${id}: ${error}`),
        );
      };

      // Test successful call
      const user1 = processApiCall(1);
      expect(isOk(user1)).toBe(true);
      expect(apiLogs).toContain("API Success for ID 1: John");
      expect(apiLogs).toContain("Processing user: John");

      // Test failed call
      apiLogs.length = 0;
      const user99 = processApiCall(99);
      expect(isErr(user99)).toBe(true);
      expect(apiLogs).toContain("API Error for ID 99: User not found");
      expect(apiLogs).toContain("Failed to process ID 99: User not found");

      // Convert to nullable for optional usage
      const userData1 = toNullable(user1);
      const userData99 = toNullable(user99);

      expect(userData1).toEqual({ id: 1, name: "John", active: true });
      expect(userData99).toBe(null);
    });
  });

  describe("Type Safety", () => {
    it("should maintain type information through utility functions", () => {
      const stringResult: Result<string, number> = ok("hello");
      const numberResult: Result<number, string> = ok(42);

      // inspect should maintain types
      const inspectedString = inspect(stringResult, vi.fn(), vi.fn());
      const inspectedNumber = inspect(numberResult, vi.fn(), vi.fn());

      if (isOk(inspectedString)) {
        expect(typeof inspectedString.value).toBe("string");
      }
      if (isOk(inspectedNumber)) {
        expect(typeof inspectedNumber.value).toBe("number");
      }

      // tap should maintain types
      const tappedString = tap(stringResult, vi.fn());
      const tappedNumber = tap(numberResult, vi.fn());

      if (isOk(tappedString)) {
        expect(typeof tappedString.value).toBe("string");
      }
      if (isOk(tappedNumber)) {
        expect(typeof tappedNumber.value).toBe("number");
      }

      // toNullable should maintain value types
      const nullableString = toNullable(stringResult);
      const nullableNumber = toNullable(numberResult);

      if (nullableString !== null) {
        expect(typeof nullableString).toBe("string");
      }
      if (nullableNumber !== null) {
        expect(typeof nullableNumber).toBe("number");
      }
    });

    it("should work with generic constraints", () => {
      interface HasId {
        id: number;
      }

      const findEntity = <T extends HasId>(
        entities: T[],
        id: number,
      ): Result<T, unknown> => {
        return fromNullable(
          entities.find((e) => e.id === id),
          "Entity not found",
        );
      };

      const users = [
        { id: 1, name: "John" },
        { id: 2, name: "Jane" },
      ];
      const result = findEntity(users, 1);

      if (isOk(result)) {
        expect(result.value.id).toBe(1);
        expect(result.value.name).toBe("John");
      }
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle undefined callbacks gracefully in inspect", () => {
      const result = ok("test");

      // inspect() is designed to handle optional callbacks
      expect(() => inspect(result, undefined, undefined)).not.toThrow();
      expect(() => inspect(result)).not.toThrow();

      const returned = inspect(result, undefined, undefined);
      expect(returned).toBe(result);
    });

    it("should preserve reference equality", () => {
      const obj = { id: 1, data: "test" };
      const result = ok(obj);

      const inspected = inspect(result, vi.fn(), vi.fn());
      const tapped = tap(result, vi.fn());

      expect(inspected).toBe(result);
      expect(tapped).toBe(result);

      if (isOk(inspected)) {
        expect(inspected.value).toBe(obj);
      }
    });

    it("should handle side effects that modify objects", () => {
      const obj = { count: 0 };
      const result = ok(obj);

      const incrementer = (value: { count: number }) => {
        value.count++;
      };

      tap(result, incrementer);

      if (isOk(result)) {
        expect(result.value.count).toBe(1); // Object was mutated
      }
    });

    it("should handle custom error values properly", () => {
      // Test fromNullable with different error types
      expect(fromNullable(null, 404)).toEqual({ type: "Err", error: 404 });
      expect(fromNullable(null, false)).toEqual({ type: "Err", error: false });
      expect(fromNullable(null, { custom: "error" })).toEqual({
        type: "Err",
        error: { custom: "error" },
      });
    });
  });
});
