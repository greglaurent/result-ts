import { describe, it, expect } from "vitest";
import { ok, err, handle, isOk, isErr, unwrap, match } from "../src";
import { map, andThen, mapErr } from "../src/iter";
import { all, allAsync, partition, analyze, findFirst } from "../src/batch";
import { inspect, tap, tapErr, toNullable } from "../src/utils";
import { validate, parseJson } from "../src/schema";
import { safe, safeAsync, zip, zipWith, chain } from "../src/patterns";
import { z } from "zod";

// Import Result type for type annotations
import type { Result } from "../src/types";

// Test types for cross-module integration
interface User {
  id: number;
  name: string;
  email: string;
  profile?: UserProfile;
}

interface UserProfile {
  bio: string;
  avatar: string;
  preferences: Record<string, unknown>;
}

interface ApiError {
  status: number;
  message: string;
  endpoint: string;
}

interface DbError {
  code: string;
  query: string;
  table: string;
}

interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Schemas for validation tests
const UserSchema = z.object({
  id: z.number().positive(),
  name: z.string().min(1),
  email: z.string().email(),
  profile: z.object({
    bio: z.string(),
    avatar: z.string().url(),
    preferences: z.record(z.unknown()),
  }).optional(),
});

const ApiResponseSchema = z.object({
  data: UserSchema,
  meta: z.object({
    timestamp: z.number(),
    version: z.string(),
  }),
});

// Mock functions for testing
const mockApiCall = (shouldFail = false): Result<User, ApiError> => {
  if (shouldFail) {
    return err({
      status: 404,
      message: "User not found",
      endpoint: "/api/users/123",
    });
  }
  return ok({
    id: 123,
    name: "John Doe",
    email: "john@example.com",
    profile: {
      bio: "Software engineer",
      avatar: "https://example.com/avatar.jpg",
      preferences: { theme: "dark", notifications: true },
    },
  });
};

const mockDbQuery = (shouldFail = false): Result<User[], DbError> => {
  if (shouldFail) {
    return err({
      code: "CONNECTION_TIMEOUT",
      query: "SELECT * FROM users",
      table: "users",
    });
  }
  return ok([
    { id: 1, name: "Alice", email: "alice@example.com" },
    { id: 2, name: "Bob", email: "bob@example.com" },
  ]);
};

const mockJsonData = `[
  {"id": 1, "name": "Alice", "email": "alice@example.com"},
  {"id": 2, "name": "Bob", "email": "bob@example.com"}
]`;

const mockInvalidJsonData = `[
  {"id": "invalid", "name": "", "email": "not-an-email"},
  {"id": 2, "name": "Bob", "email": "bob@example.com"}
]`;

describe("Integration Tests", () => {
  describe("Cross-Module Type Safety", () => {
    it("should maintain type inference across module boundaries", () => {
      // Test: Core -> Iter -> Batch chain
      const apiResult = mockApiCall();
      const transformed = map(apiResult, (user) => user.name);
      const batched = all([transformed, ok("extra")]);

      expect(isOk(batched)).toBe(true);
      if (isOk(batched)) {
        // TypeScript should infer this as [string, string]
        const [userName, extra] = batched.value;
        expect(userName).toBe("John Doe");
        expect(extra).toBe("extra");
      }
    });

    it("should preserve error types through transformation chains", () => {
      // Test: ApiError type preserved through transformations
      const apiResult = mockApiCall(true);
      const transformed = map(apiResult, (user) => user.name);
      const chained = andThen(transformed, (name) => ok(name.toUpperCase()));

      expect(isErr(chained)).toBe(true);
      if (isErr(chained)) {
        // TypeScript should know this is ApiError
        expect(chained.error.status).toBe(404);
        expect(chained.error.endpoint).toBe("/api/users/123");
      }
    });

    it("should work with generic constraints across modules", () => {
      // Test: Structured error types work across modules
      const dbResult: Result<User[], DbError> = mockDbQuery(true);
      const processed = andThen(dbResult, (users) => {
        if (users.length === 0) {
          return err({ code: "NO_RESULTS", query: "processed", table: "users" });
        }
        return ok(users.map(u => u.name));
      });

      expect(isErr(processed)).toBe(true);
      if (isErr(processed)) {
        // Error should maintain DbError structure
        expect(processed.error.code).toBe("CONNECTION_TIMEOUT");
        expect(processed.error.table).toBe("users");
      }
    });

    it("should work with chain operations across modules", () => {
      // Test: Chain with cross-module operations
      const apiResult = mockApiCall();
      const result = chain(apiResult)
        .then(user => ok(user.name))
        .then(name => ok(name.toUpperCase()))
        .run();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe("JOHN DOE");
      }
    });
  });

  describe("Complex Cross-Module Workflows", () => {
    it("should handle complete data processing pipeline", () => {
      // Test: Core -> Schema -> Iter -> Batch -> Utils pipeline
      const processUserData = (jsonData: string): Result<User[], ValidationError> => {
        const parseResult = parseJson(jsonData, UserSchema);

        if (isErr(parseResult)) {
          return err({
            field: "json",
            message: parseResult.error,
            code: "PARSE_ERROR"
          });
        }

        const data = parseResult.value;
        if (!Array.isArray(data)) {
          return err({ field: "root", message: "Expected array", code: "TYPE_ERROR" });
        }

        const validations = data.map((item, index) => {
          const validation = validate(item, UserSchema);
          return mapErr(validation, (errorMessage) => ({
            field: `users[${index}]`,
            message: errorMessage,
            code: "VALIDATION_ERROR"
          }));
        });

        const allValid = all(validations);
        if (isErr(allValid)) {
          return allValid;
        }

        const processed = tap(allValid, users => console.log(`Processed ${users.length} users`));
        return map(processed, users => users.filter(u => u.id > 0));
      };

      const result = processUserData(mockJsonData);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0].name).toBe("Alice");
      }
    });

    it("should handle error propagation through complex chains", () => {
      // Test: Error types maintained through complex operations
      const processWithErrors = (jsonData: string): Result<User[], string> => {
        const parseResult: Result<unknown, Error> = handle(() => JSON.parse(jsonData));

        if (isErr(parseResult)) {
          const stringError: Result<unknown, string> = mapErr(parseResult, (error: Error) => error.message);
          tapErr(stringError, (error: string) => console.log("Parse error:", error));
          return stringError as Result<User[], string>;
        }

        const data: unknown = parseResult.value;
        if (!Array.isArray(data)) {
          return err("Not an array");
        }

        const validations: Result<User, string>[] = data.map((item: unknown) => validate(item, UserSchema));
        const allResult: Result<User[], string> = all(validations);

        return inspect(allResult,
          (success: User[]) => `Validated ${success.length} users`,
          (error: string) => `Validation failed: ${error}`
        );
      };

      const result = processWithErrors("invalid json");

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toContain("Unexpected token");
      }
    });

    it("should work with async operations across modules", async () => {
      // Test: Async operations work across module boundaries
      const fetchAndProcess = async (userId: number): Promise<Result<{ user: User, processedName: string, related: string }, ApiError>> => {
        return safeAsync(async function* () {
          // Simulate API call
          const apiResponse: User = yield await Promise.resolve(mockApiCall(userId > 100));

          // Transform data
          const userName: Result<string, never> = map(ok(apiResponse), (user: User) => user.name.toUpperCase());
          const userValue: string = yield userName;

          // Batch operation
          const related: [string, string] = yield await allAsync([
            Promise.resolve(ok(userValue)),
            Promise.resolve(ok("RELATED_DATA"))
          ]);

          return {
            user: apiResponse,
            processedName: userValue,
            related: related[1]
          };
        });
      };

      // Test success case
      const successResult = await fetchAndProcess(50);
      expect(isOk(successResult)).toBe(true);
      if (isOk(successResult)) {
        expect(successResult.value.processedName).toBe("JOHN DOE");
        expect(successResult.value.related).toBe("RELATED_DATA");
      }

      // Test error case
      const errorResult = await fetchAndProcess(150);
      expect(isErr(errorResult)).toBe(true);
      if (isErr(errorResult)) {
        expect(errorResult.error.status).toBe(404);
      }
    });
  });

  describe("Pattern Integration", () => {
    it("should work with generator patterns and other modules", () => {
      // Test: safe() pattern with cross-module operations
      const processMultipleUsers = (userIds: number[]): Result<string[], ApiError> => {
        return safe(function* () {
          // Use batch operations within generator
          const apiCalls: Result<User, ApiError>[] = userIds.map((id: number) => mockApiCall(id > 100));
          const allUsers: User[] = yield all(apiCalls);

          // Use iter operations
          const names: string[] = allUsers.map((user: User) => user.name);
          const processed: string[] = yield all(names.map((name: string) => ok(name.toUpperCase())));

          // Use utils for debugging
          const inspected: Result<string[], never> = inspect(ok(processed),
            (names: string[]) => `Processed ${names.length} names`,
            (error: never) => `Failed: ${error}`
          );

          return yield inspected;
        });
      };

      const result = processMultipleUsers([1, 2, 3]);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toEqual(["JOHN DOE", "JOHN DOE", "JOHN DOE"]);
      }

      // Test error propagation
      const errorResult = processMultipleUsers([1, 150, 3]);
      expect(isErr(errorResult)).toBe(true);
      if (isErr(errorResult)) {
        expect(errorResult.error.status).toBe(404);
      }
    });

    it("should work with zip operations across modules", () => {
      // Test: zip with cross-module operations
      const userResult = mockApiCall();
      const dbResult = map(mockDbQuery(), users => users.length);

      const combined = zip(userResult, dbResult);

      expect(isOk(combined)).toBe(true);
      if (isOk(combined)) {
        const [user, count] = combined.value;
        expect(user.name).toBe("John Doe");
        expect(count).toBe(2);
      }
    });

    it("should work with zipWith and transformations", () => {
      // Test: zipWith with iter operations
      const result1 = map(ok("hello"), s => s.toUpperCase());
      const result2 = map(ok("world"), s => s.length);

      const zipped = zipWith(result1, result2, (str, len) => ({ str, len }));

      expect(isOk(zipped)).toBe(true);
      if (isOk(zipped)) {
        expect(zipped.value).toEqual({ str: "HELLO", len: 5 });
      }
    });

    it("should work with fluent chain API", () => {
      // Test: Chain fluent API with cross-module operations
      const result = chain(mockApiCall())
        .then(user => ok(user.email))
        .then(email => validate(email, z.string().email()))
        .then(validEmail => ok(validEmail.split("@")[0]))
        .run();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe("john");
      }
    });
  });

  describe("Schema Integration", () => {
    it("should integrate validation with batch operations", () => {
      // Test: Schema validation with batch processing
      const validateUsers = (userData: unknown[]) => {
        const validations: Result<User, string>[] = userData.map((data: unknown) => validate(data, UserSchema));
        const allValid: Result<User[], string> = all(validations);

        return andThen(allValid, (users: User[]) => {
          const analyzed = analyze(users.map((u: User) => ok(u.email)));
          return ok({
            users,
            emailCount: analyzed.successCount,
            validEmails: analyzed.successes
          });
        });
      };

      const validData: unknown[] = [
        { id: 1, name: "Alice", email: "alice@example.com" },
        { id: 2, name: "Bob", email: "bob@example.com" }
      ];

      const result = validateUsers(validData);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.emailCount).toBe(2);
        expect(result.value.validEmails).toHaveLength(2);
      }
    });

    it("should handle validation errors with error analysis", () => {
      // Test: Schema errors with batch error handling
      const invalidData: unknown[] = [
        { id: "invalid", name: "", email: "not-email" },
        { id: 2, name: "Bob", email: "bob@example.com" }
      ];

      const validations: Result<User, string>[] = invalidData.map((data: unknown) => validate(data, UserSchema));
      const results = partition(validations);

      expect(results.successes).toHaveLength(1);
      expect(results.errors).toHaveLength(1);
      expect(results.successes[0].name).toBe("Bob");
    });

    it("should work with parseJson and complex validation", () => {
      // Test: JSON parsing with nested validation
      const processApiResponse = (jsonStr: string) => {
        return chain(parseJson(jsonStr, UserSchema))
          .then(data => validate(data, ApiResponseSchema))
          .then(response => ok({
            user: response.data,
            timestamp: response.meta.timestamp,
            version: response.meta.version
          }))
          .then(processed => tap(ok(processed), p =>
            console.log(`Processed API response v${p.version}`)
          ))
          .run();
      };

      const validJson = JSON.stringify({
        data: {
          id: 1,
          name: "Alice",
          email: "alice@example.com",
          profile: {
            bio: "Developer",
            avatar: "https://example.com/alice.jpg",
            preferences: { theme: "dark" }
          }
        },
        meta: {
          timestamp: Date.now(),
          version: "1.0.0"
        }
      });

      const result = processApiResponse(validJson);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.user.name).toBe("Alice");
        expect(result.value.version).toBe("1.0.0");
      }
    });
  });

  describe("Utils Integration", () => {
    it("should work with debugging across complex operations", () => {
      const debugLog: string[] = [];

      // Test: Utils functions with complex chains
      const processWithDebugging = (data: unknown[]) => {
        const validationResult = all(data.map(item => validate(item, UserSchema)));

        const inspected = inspect(validationResult,
          users => {
            debugLog.push(`Validated ${users.length} users`);
            return `Success: ${users.length} users`;
          },
          error => {
            debugLog.push(`Validation failed: ${error.message}`);
            return `Error: ${error.message}`;
          }
        );

        const tapped = tap(inspected, users => {
          debugLog.push(`Processing ${users.length} users`);
        });

        const errorTapped = tapErr(tapped, error => {
          debugLog.push(`Error occurred: ${error.message}`);
        });

        return map(errorTapped, users => {
          const filtered = users.filter(u => u.id > 0);
          debugLog.push(`Filtered to ${filtered.length} users`);
          return filtered;
        });
      };

      const validData = [
        { id: 1, name: "Alice", email: "alice@example.com" },
        { id: 2, name: "Bob", email: "bob@example.com" }
      ];

      const result = processWithDebugging(validData);

      expect(isOk(result)).toBe(true);
      expect(debugLog).toContain("Validated 2 users");
      expect(debugLog).toContain("Processing 2 users");
      expect(debugLog).toContain("Filtered to 2 users");
    });

    it("should work with nullable conversion in complex chains", () => {
      // Test: toNullable with cross-module operations
      const processToNullable = (userIds: number[]): string[] | null => {
        const results: Result<User, ApiError>[] = userIds.map((id: number) => mockApiCall(id > 100));
        const combined: Result<User[], ApiError> = all(results);
        const names: Result<string[], ApiError> = map(combined, (users: User[]) => users.map((u: User) => u.name));

        return toNullable(names);
      };

      const successResult = processToNullable([1, 2, 3]);
      expect(successResult).toEqual(["John Doe", "John Doe", "John Doe"]);

      const errorResult = processToNullable([1, 150, 3]);
      expect(errorResult).toBe(null);
    });
  });

  describe("Real-World Scenarios", () => {
    it("should handle complete user onboarding workflow", async () => {
      // Test: Complete workflow combining all modules
      const onboardUser = async (userData: unknown, sendEmail = true): Promise<Result<{ user: User, profile: UserProfile, emailStatus: string, onboardedAt: string }, DbError>> => {
        return safeAsync(async function* () {
          // 1. Validate input data
          const user: User = yield validate(userData, UserSchema);

          // 2. Check if user already exists (simulate async DB call)
          const existingUsers: User[] = yield await Promise.resolve(mockDbQuery());
          const duplicate: Result<User, string> = findFirst(existingUsers.map((u: User) =>
            u.email === user.email ? ok(u) : err("no match")
          ));

          if (isOk(duplicate)) {
            const error: DbError = {
              code: "DUPLICATE_USER",
              query: `email = '${user.email}'`,
              table: "users"
            };
            return err(error);
          }

          // 3. Create user profile
          const profileData: UserProfile = {
            bio: user.profile?.bio || "New user",
            avatar: user.profile?.avatar || "https://example.com/default.jpg",
            preferences: user.profile?.preferences || {}
          };

          // 4. Batch operations for user creation
          const operations: [User, UserProfile, string] = yield await allAsync([
            Promise.resolve(ok({ ...user, id: Date.now() })),
            Promise.resolve(ok(profileData)),
            sendEmail ? Promise.resolve(ok("email-sent")) : Promise.resolve(ok("email-skipped"))
          ]);

          const [createdUser, profile, emailStatus] = operations;

          // 5. Return complete result with debugging
          const result = {
            user: createdUser,
            profile,
            emailStatus,
            onboardedAt: new Date().toISOString()
          };

          inspect(ok(result),
            (result: { user: User, profile: UserProfile, emailStatus: string, onboardedAt: string }) => `User ${result.user.name} onboarded successfully`,
            (error: never) => `Onboarding failed: ${error}`
          );

          return result;
        });
      };

      // Test successful onboarding
      const newUser: unknown = {
        id: 999,
        name: "Charlie",
        email: "charlie@example.com",
        profile: {
          bio: "New developer",
          avatar: "https://example.com/charlie.jpg",
          preferences: { theme: "light" }
        }
      };

      const result = await onboardUser(newUser);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.user.name).toBe("Charlie");
        expect(result.value.emailStatus).toBe("email-sent");
        expect(result.value.onboardedAt).toBeDefined();
      }

      // Test duplicate user
      const duplicateUser: unknown = {
        id: 1000,
        name: "Alice Duplicate",
        email: "alice@example.com" // This email exists in mock data
      };

      const duplicateResult = await onboardUser(duplicateUser);
      expect(isErr(duplicateResult)).toBe(true);
      if (isErr(duplicateResult)) {
        expect(duplicateResult.error.code).toBe("DUPLICATE_USER");
      }
    });

    it("should handle data migration workflow", () => {
      // Test: Complex data migration with error recovery
      const migrateUserData = (oldData: unknown[], newSchema: z.ZodSchema) => {
        return safe(function* () {
          // 1. Parse and validate old data
          const parsed: Result<User, string>[] = oldData.map((item: unknown) => validate(item, UserSchema));
          const partitioned = partition(parsed);

          // 2. Handle validation failures
          if (partitioned.errors.length > 0) {
            console.log(`Found ${partitioned.errors.length} invalid records`);
          }

          // 3. Transform valid data to new format
          const transformed = partitioned.successes.map((user: User) => ({
            ...user,
            migrated: true,
            migratedAt: new Date().toISOString(),
            legacyId: user.id
          }));

          // 4. Validate against new schema
          const revalidated: Result<any, string>[] = transformed.map((item: any) => validate(item, newSchema));
          const finalResults: any[] = yield all(revalidated);

          // 5. Analyze migration results
          const analysis = analyze([
            ...partitioned.successes.map((): Result<string, never> => ok("migrated")),
            ...partitioned.errors.map((): Result<never, string> => err("validation_failed"))
          ]);

          return {
            migratedUsers: finalResults,
            totalProcessed: oldData.length,
            successCount: analysis.successCount,
            errorCount: analysis.errorCount,
            migrationSummary: `${analysis.successCount}/${oldData.length} records migrated successfully`
          };
        });
      };

      const MigratedUserSchema = UserSchema.extend({
        migrated: z.boolean(),
        migratedAt: z.string(),
        legacyId: z.number()
      });

      const oldUserData: unknown[] = [
        { id: 1, name: "Alice", email: "alice@example.com" },
        { id: 2, name: "Bob", email: "bob@example.com" },
        { id: "invalid", name: "", email: "bad-email" }, // This will fail validation
      ];

      const result = migrateUserData(oldUserData, MigratedUserSchema);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.migratedUsers).toHaveLength(2);
        expect(result.value.totalProcessed).toBe(3);
        expect(result.value.successCount).toBe(2);
        expect(result.value.errorCount).toBe(1);
        expect(result.value.migrationSummary).toBe("2/3 records migrated successfully");
      }
    });
  });

  describe("Performance Integration", () => {
    it("should maintain performance characteristics in cross-module usage", () => {
      // Test: Ensure cross-module usage doesn't degrade performance
      const largeBatch: unknown[] = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`
      }));

      const start = performance.now();

      const validationResult: Result<User[], string> = all(largeBatch.map((user: unknown) => validate(user, UserSchema)));
      const transformed: Result<string[], string> = map(validationResult, (users: User[]) => users.map((u: User) => u.name.toUpperCase()));
      const processed: Result<{ names: string[], averageNameLength: number }, string> = andThen(transformed, (names: string[]) => {
        const analysis = analyze(names.map((name: string) => ok(name.length)));
        return ok({
          names,
          averageNameLength: analysis.successCount > 0
            ? analysis.successes.reduce((sum: number, len: number) => sum + len, 0) / analysis.successCount
            : 0
        });
      });
      const final: Result<{ names: string[], averageNameLength: number }, string> = tap(processed, (data: { names: string[], averageNameLength: number }) =>
        console.log(`Processed ${data.names.length} users, avg name length: ${data.averageNameLength}`)
      );

      const end = performance.now();
      const duration = end - start;

      expect(isOk(final)).toBe(true);
      expect(duration).toBeLessThan(100); // Should complete in under 100ms

      if (isOk(final)) {
        expect(final.value.names).toHaveLength(1000);
        expect(final.value.averageNameLength).toBeGreaterThan(0);
      }
    });

    it("should handle early exit optimization across modules", () => {
      // Test: Early exit should work in cross-module chains
      const testData: Result<User, ApiError>[] = Array.from({ length: 1000 }, (_, i) =>
        i === 500 ? mockApiCall(true) : mockApiCall() // Error at index 500
      );

      const start = performance.now();

      const batchResult: Result<User[], ApiError> = all(testData); // Should exit early at index 500
      const mapped: Result<number, ApiError> = map(batchResult, (users: User[]) => users.length);
      const final: Result<number, ApiError> = tap(mapped, (count: number) => console.log(`Processed ${count} users`));

      const end = performance.now();
      const duration = end - start;

      expect(isErr(final)).toBe(true);
      expect(duration).toBeLessThan(50); // Should exit early, much faster than processing all 1000

      if (isErr(final)) {
        expect(final.error.status).toBe(404);
      }
    });
  });
});
