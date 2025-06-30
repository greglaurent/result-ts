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

    it("should handle different types", () => {
      const stringResult = map(ok(42), (x) => x.toString());
      expect(stringResult).toEqual({ type: "Ok", value: "42" });

      const boolResult = map(ok("hello"), (s) => s.length > 3);
      expect(boolResult).toEqual({ type: "Ok", value: true });
    });

    it("should handle complex transformations", () => {
      interface User {
        id: number;
        name: string;
      }

      const userResult: Result<User, string> = ok({ id: 1, name: "John" });
      const enhanced = map(userResult, (user) => ({
        ...user,
        displayName: `${user.name} (#${user.id})`,
      }));

      expect(enhanced).toEqual({
        type: "Ok",
        value: { id: 1, name: "John", displayName: "John (#1)" },
      });
    });

    it("should handle null and undefined values", () => {
      const nullResult = map(ok(null), (x) => x === null);
      expect(nullResult).toEqual({ type: "Ok", value: true });

      const undefinedResult = map(ok(undefined), (x) => x === undefined);
      expect(undefinedResult).toEqual({ type: "Ok", value: true });
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

    it("should handle different error types", () => {
      const numberResult = mapErr(err(404), (code) => `Error ${code}`);
      expect(numberResult).toEqual({ type: "Err", error: "Error 404" });

      const objectResult = mapErr(
        err({ type: "network", details: "timeout" }),
        (error) => ({ ...error, timestamp: Date.now() }),
      );
      expect(objectResult.type).toBe("Err");
      if (isErr(objectResult)) {
        expect(objectResult.error.type).toBe("network");
        expect(objectResult.error.details).toBe("timeout");
        expect(typeof objectResult.error.timestamp).toBe("number");
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
      // ✅ FIXED: Remove setTimeout timing dependency
      const promise = Promise.resolve(ok("hello"));
      const result = await mapAsync(promise, async (s) => {
        await Promise.resolve(); // ✅ FIXED: Deterministic async
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

    it("should handle complex async transformations", async () => {
      interface User {
        id: number;
        name: string;
      }

      const promise = Promise.resolve(ok({ id: 1, name: "John" }));
      const result = await mapAsync(promise, async (user: User) => {
        await Promise.resolve(); // Deterministic async
        return {
          ...user,
          email: `${user.name.toLowerCase()}@example.com`,
          verified: true,
        };
      });

      expect(result).toEqual({
        type: "Ok",
        value: {
          id: 1,
          name: "John",
          email: "john@example.com",
          verified: true,
        },
      });
    });
  });

  describe("mapErrAsync()", () => {
    it("should transform error values asynchronously", async () => {
      const promise = Promise.resolve(err("timeout"));
      const result = await mapErrAsync(promise, async (error) => {
        await Promise.resolve(); // ✅ FIXED: Deterministic async
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

    it("should pass through success values unchanged", async () => {
      const promise = Promise.resolve(ok("success"));
      const result = await mapErrAsync(promise, async (error) => {
        await Promise.resolve();
        return { logged: true, originalError: error };
      });
      expect(result).toEqual({ type: "Ok", value: "success" });
    });

    it("should handle complex async error transformations", async () => {
      interface ApiError {
        status: number;
        message: string;
      }

      const promise = Promise.resolve(err({ status: 500, message: "Server error" }));
      const result = await mapErrAsync(promise, async (error: ApiError) => {
        await Promise.resolve(); // Deterministic async
        return {
          ...error,
          logged: true,
          timestamp: new Date('2023-01-01T00:00:00.000Z').toISOString(),
          retryable: error.status >= 500,
        };
      });

      expect(result).toEqual({
        type: "Err",
        error: {
          status: 500,
          message: "Server error",
          logged: true,
          timestamp: "2023-01-01T00:00:00.000Z",
          retryable: true,
        },
      });
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

    it("should handle complex type transformations", () => {
      interface User {
        id: number;
        name: string;
      }

      interface UserProfile {
        user: User;
        email: string;
        preferences: { theme: string };
      }

      const getUser = (id: number): Result<User, string> =>
        id > 0 ? ok({ id, name: "John" }) : err("Invalid ID");

      const buildProfile = (user: User): Result<UserProfile, string> =>
        ok({
          user,
          email: `${user.name.toLowerCase()}@example.com`,
          preferences: { theme: "dark" },
        });

      const result = andThen(getUser(1), buildProfile);
      expect(result).toEqual({
        type: "Ok",
        value: {
          user: { id: 1, name: "John" },
          email: "john@example.com",
          preferences: { theme: "dark" },
        },
      });
    });
  });

  describe("andThenAsync()", () => {
    it("should chain async operations", async () => {
      const fetchUser = async (id: number) =>
        id === 1 ? ok({ id, name: "John" }) : err("User not found");
      const fetchUserPosts = async (user: { id: number }) =>
        ok([{ id: 1, title: "Hello World", authorId: user.id }]);

      const result = await andThenAsync(
        Promise.resolve(ok(1)),
        async (id) => {
          const user = await fetchUser(id);
          if (isErr(user)) return user;
          return await fetchUserPosts(user.value);
        },
      );

      expect(result).toEqual({
        type: "Ok",
        value: [{ id: 1, title: "Hello World", authorId: 1 }],
      });
    });

    it("should handle async chain failures", async () => {
      const fetchUser = async (id: number) => err("User service down");
      const fetchUserPosts = async (user: { id: number }) =>
        err("Posts service unavailable");

      const result = await andThenAsync(Promise.resolve(ok(1)), async (id) => {
        const user = await fetchUser(id);
        if (isErr(user)) return user;
        return await fetchUserPosts(user.value);
      });

      expect(result).toEqual({
        type: "Err",
        error: "User service down",
      });
    });

    it("should handle mixed sync/async operations", async () => {
      // ✅ FIXED: Remove setTimeout timing dependency
      const syncOperation = (n: number) => ok(n * 2);
      const asyncOperation = async (n: number) => {
        await Promise.resolve(); // ✅ FIXED: Deterministic async
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

      // Test behavior: operations compose correctly
      expect(result).toEqual({ type: "Ok", value: 20 }); // (5 * 2) + 10
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(typeof result.value).toBe('number');
        expect(result.value).toBeGreaterThan(15); // Verify computation happened
      }
    });

    it("should handle complex async workflows", async () => {
      interface User {
        id: number;
        name: string;
      }

      interface Post {
        id: number;
        title: string;
        authorId: number;
      }

      const fetchUser = async (id: number): Promise<Result<User, string>> => {
        await Promise.resolve(); // Deterministic async
        return id === 1 ? ok({ id, name: "John" }) : err("User not found");
      };

      const fetchUserPosts = async (userId: number): Promise<Result<Post[], string>> => {
        await Promise.resolve(); // Deterministic async
        return ok([
          { id: 1, title: "First Post", authorId: userId },
          { id: 2, title: "Second Post", authorId: userId },
        ]);
      };

      const result = await andThenAsync(
        Promise.resolve(ok(1)),
        async (id) => {
          const user = await fetchUser(id);
          if (isErr(user)) return user;

          const posts = await fetchUserPosts(user.value.id);
          if (isErr(posts)) return posts;

          return ok({
            user: user.value,
            posts: posts.value,
            postCount: posts.value.length,
          });
        },
      );

      expect(result).toEqual({
        type: "Ok",
        value: {
          user: { id: 1, name: "John" },
          posts: [
            { id: 1, title: "First Post", authorId: 1 },
            { id: 2, title: "Second Post", authorId: 1 },
          ],
          postCount: 2,
        },
      });
    });
  });

  describe("pipe()", () => {
    it("should compose multiple operations", () => {
      const double = (r: Result<number, string>) => map(r, (x) => x * 2);
      const addTen = (r: Result<number, string>) => map(r, (x) => x + 10);
      const toString = (r: Result<number, string>) => map(r, (x) => x.toString());

      const result = pipe(ok(5), double, addTen, toString);
      expect(result).toEqual({ type: "Ok", value: "20" }); // (5 * 2) + 10 = 20
    });

    it("should stop at first error", () => {
      const double = (r: Result<number, string>) => map(r, (x) => x * 2);
      const fail = () => err("processing failed");
      const addTen = (r: Result<number, string>) => map(r, (x) => x + 10);

      const result = pipe(ok(5), double, fail, addTen);
      expect(result).toEqual({ type: "Err", error: "processing failed" });
    });

    it("should handle validation chains", () => {
      const parseNumber = (s: string): Result<number, string> => {
        const num = parseFloat(s);
        return isNaN(num) ? err("Not a number") : ok(num);
      };

      const validatePositive = (r: Result<number, string>) =>
        andThen(r, (n) => (n > 0 ? ok(n) : err("Must be positive")));

      const validateMaximum = (max: number) => (r: Result<number, string>) =>
        andThen(r, (n) => (n <= max ? ok(n) : err(`Must be <= ${max}`)));

      const formatCurrency = (r: Result<number, string>) =>
        map(r, (n) => `$${n.toFixed(2)}`);

      const validResult = pipe(
        parseNumber("49.99"),
        validatePositive,
        validateMaximum(100),
        formatCurrency,
      );

      expect(validResult).toEqual({ type: "Ok", value: "$49.99" });

      const invalidResult = pipe(
        parseNumber("150.00"),
        validatePositive,
        validateMaximum(100),
        formatCurrency,
      );

      expect(invalidResult).toEqual({ type: "Err", error: "Must be <= 100" });
    });

    it("should handle complex data transformations", () => {
      interface RawUser {
        firstName: string;
        lastName: string;
        age: string;
      }

      interface User {
        name: string;
        age: number;
        isAdult: boolean;
      }

      const validateAge = (r: Result<RawUser, string>) =>
        andThen(r, (user) => {
          const age = parseInt(user.age);
          return isNaN(age) ? err("Invalid age") : ok({ ...user, parsedAge: age });
        });

      const transformUser = (r: Result<RawUser & { parsedAge: number }, string>) =>
        map(r, (user): User => ({
          name: `${user.firstName} ${user.lastName}`,
          age: user.parsedAge,
          isAdult: user.parsedAge >= 18,
        }));

      const validateAdult = (r: Result<User, string>) =>
        andThen(r, (user) =>
          user.isAdult ? ok(user) : err("Must be an adult")
        );

      const rawUser: RawUser = {
        firstName: "John",
        lastName: "Doe",
        age: "25",
      };

      const result = pipe(ok(rawUser), validateAge, transformUser, validateAdult);

      expect(result).toEqual({
        type: "Ok",
        value: {
          name: "John Doe",
          age: 25,
          isAdult: true,
        },
      });
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

      const validateUser = (user: User): Result<User, string> => {
        if (!user.email?.includes("@")) return err("Invalid email");
        return ok(user);
      };

      // Process user 1 (no email initially)
      const result1 = pipe(
        findUser(1),
        (r) => andThen(r, addEmail),
        (r) => andThen(r, validateUser),
      );

      expect(result1).toEqual({
        type: "Ok",
        value: { id: 1, name: "John", email: "john@example.com" },
      });

      // Process user 2 (has email)
      const result2 = pipe(
        findUser(2),
        (r) => andThen(r, addEmail),
        (r) => andThen(r, validateUser),
      );

      expect(result2).toEqual({
        type: "Ok",
        value: { id: 2, name: "Jane", email: "jane@example.com" },
      });

      // Process non-existent user
      const result3 = pipe(
        findUser(999),
        (r) => andThen(r, addEmail),
        (r) => andThen(r, validateUser),
      );

      expect(result3).toEqual({ type: "Err", error: "User not found" });
    });

    it("should handle mixed sync/async operations in real workflow", async () => {
      // ✅ FIXED: Remove setTimeout timing dependency
      // Simulate an API data processing workflow
      const validateInput = (input: string): Result<string, string> => {
        return input.trim().length > 0 ? ok(input.trim()) : err("Empty input");
      };

      const fetchUserData = async (username: string) => {
        await Promise.resolve(); // ✅ FIXED: Deterministic async
        const users = {
          "john": { id: 1, name: "John", email: "john@example.com" },
          "jane": { id: 2, name: "Jane", email: "jane@example.com" }
        };
        return users[username as keyof typeof users]
          ? ok(users[username as keyof typeof users])
          : err("User not found");
      };

      const pipeline = pipe(
        ok("  john  "), // Input with whitespace
        (result) => map(result, validateInput),
        (result) => andThenAsync(result, fetchUserData)
      );

      const finalResult = await pipeline;

      // Test behavior: pipeline processes data correctly
      expect(isOk(finalResult)).toBe(true);
      if (isOk(finalResult)) {
        expect(finalResult.value.name).toBe("John");
        expect(finalResult.value.email).toBe("john@example.com");
        expect(finalResult.value.id).toBe(1);
      }
    });

    it("should combine multiple transformations", async () => {
      interface ApiResponse {
        data: { userId: number; score: string };
        metadata: { timestamp: string };
      }

      const parseApiResponse = (raw: string): Result<ApiResponse, string> => {
        try {
          const parsed = JSON.parse(raw);
          return ok(parsed);
        } catch {
          return err("Invalid JSON");
        }
      };

      const validateResponse = (response: ApiResponse): Result<ApiResponse, string> => {
        if (!response.data?.userId) return err("Missing userId");
        if (!response.data?.score) return err("Missing score");
        return ok(response);
      };

      const transformScore = async (response: ApiResponse): Promise<Result<{ userId: number; numericScore: number }, string>> => {
        await Promise.resolve(); // Deterministic async
        const score = parseFloat(response.data.score);
        if (isNaN(score)) return err("Invalid score format");
        return ok({
          userId: response.data.userId,
          numericScore: score,
        });
      };

      const rawJson = JSON.stringify({
        data: { userId: 123, score: "85.5" },
        metadata: { timestamp: "2023-01-01" },
      });

      const result = await pipe(
        parseApiResponse(rawJson),
        (r) => andThen(r, validateResponse),
        (r) => andThenAsync(Promise.resolve(r), transformScore),
      );

      expect(result).toEqual({
        type: "Ok",
        value: { userId: 123, numericScore: 85.5 },
      });
    });
  });

  describe("Type Safety", () => {
    it("should maintain type information through operations", () => {
      const stringResult: Result<string, number> = ok("hello");
      const numberResult: Result<number, string> = ok(42);

      // map should preserve error type
      const mappedString = map(stringResult, (s) => s.length);
      const mappedNumber = map(numberResult, (n) => n.toString());

      if (isOk(mappedString)) {
        expect(typeof mappedString.value).toBe("number");
      }
      if (isOk(mappedNumber)) {
        expect(typeof mappedNumber.value).toBe("string");
      }

      // mapErr should preserve success type
      const mappedErr1 = mapErr(stringResult, (e) => e.toString());
      const mappedErr2 = mapErr(numberResult, (e) => e.toUpperCase());

      if (isOk(mappedErr1)) {
        expect(typeof mappedErr1.value).toBe("string");
      }
      if (isOk(mappedErr2)) {
        expect(typeof mappedErr2.value).toBe("number");
      }
    });

    it("should work with complex generic types", () => {
      interface User {
        id: number;
        name: string;
      }

      interface Post {
        id: number;
        title: string;
        authorId: number;
      }

      const userResult: Result<User, string> = ok({ id: 1, name: "John" });
      const postResult: Result<Post[], string> = ok([
        { id: 1, title: "Hello", authorId: 1 },
      ]);

      // Complex type transformations
      const enrichedUser = andThen(userResult, (user) =>
        map(postResult, (posts) => ({
          user,
          posts: posts.filter((p) => p.authorId === user.id),
          postCount: posts.filter((p) => p.authorId === user.id).length,
        })),
      );

      expect(enrichedUser).toEqual({
        type: "Ok",
        value: {
          user: { id: 1, name: "John" },
          posts: [{ id: 1, title: "Hello", authorId: 1 }],
          postCount: 1,
        },
      });
    });
  });
});
