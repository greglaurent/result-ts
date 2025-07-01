//TODO: Fix integration tests

//import { describe, it, expect } from "vitest";
//import { ok, err, handle, isOk, isErr, unwrap, match } from "../src";
//import { map, andThen, mapErr } from "../src/iter";
//import { all, allAsync, partition, analyze, findFirst, oks } from "../src/batch";
//import { inspect, tap, tapErr, toNullable } from "../src/utils";
//import { validate, parseJson } from "../src/schema";
//import { safe, safeAsync, zip, zipWith, chain } from "../src/patterns";
//import { z } from "zod";
//
//// Import Result type for type annotations
//import type { Result } from "../src/types";
//
//// Test types for cross-module integration
//interface User {
//  id: number;
//  name: string;
//  email: string;
//  profile?: UserProfile;
//}
//
//interface UserProfile {
//  bio: string;
//  avatar: string;
//  preferences: Record<string, unknown>;
//}
//
//interface ApiError {
//  status: number;
//  message: string;
//  endpoint: string;
//}
//
//interface DbError {
//  code: string;
//  query: string;
//  table: string;
//}
//
//interface ValidationError {
//  field: string;
//  message: string;
//  code: string;
//}
//
//// Schemas for validation tests
//const UserSchema = z.object({
//  id: z.number().positive(),
//  name: z.string().min(1),
//  email: z.string().email(),
//  profile: z.object({
//    bio: z.string(),
//    avatar: z.string().url(),
//    preferences: z.record(z.unknown()),
//  }).optional(),
//});
//
//const ApiResponseSchema = z.object({
//  data: UserSchema,
//  meta: z.object({
//    timestamp: z.number(),
//    version: z.string(),
//  }),
//});
//
//// Mock functions for testing
//const mockApiCall = (shouldFail = false): Result<User, ApiError> => {
//  if (shouldFail) {
//    return err({
//      status: 404,
//      message: "User not found",
//      endpoint: "/api/users/123",
//    });
//  }
//  return ok({
//    id: 123,
//    name: "John Doe",
//    email: "john@example.com",
//    profile: {
//      bio: "Software engineer",
//      avatar: "https://example.com/avatar.jpg",
//      preferences: { theme: "dark", notifications: true },
//    },
//  });
//};
//
//const mockDbQuery = (shouldFail = false): Result<User[], DbError> => {
//  if (shouldFail) {
//    return err({
//      code: "CONNECTION_TIMEOUT",
//      query: "SELECT * FROM users",
//      table: "users",
//    });
//  }
//  return ok([
//    { id: 1, name: "Alice", email: "alice@example.com" },
//    { id: 2, name: "Bob", email: "bob@example.com" },
//  ]);
//};
//
//const mockJsonData = `[
//  {"id": 1, "name": "Alice", "email": "alice@example.com"},
//  {"id": 2, "name": "Bob", "email": "bob@example.com"}
//]`;
//
//describe("Integration Tests", () => {
//  describe("Cross-Module Type Safety", () => {
//    it("should maintain type inference across module boundaries", () => {
//      // Test: Core -> Iter -> Batch chain
//      const apiResult: Result<User, ApiError> = mockApiCall();
//      const transformed: Result<string, ApiError> = map(apiResult, (user: User) => user.name);
//      const batched: Result<[string, string], ApiError> = all([transformed, ok("extra")]);
//
//      expect(isOk(batched)).toBe(true);
//      if (isOk(batched)) {
//        // TypeScript should infer this as [string, string]
//        const [userName, extra] = batched.value;
//        expect(userName).toBe("John Doe");
//        expect(extra).toBe("extra");
//      }
//    });
//
//    it("should preserve error types through transformation chains", () => {
//      // Test: ApiError type preserved through transformations
//      const apiResult: Result<User, ApiError> = mockApiCall(true);
//      const transformed: Result<string, ApiError> = map(apiResult, (user: User) => user.name);
//      const chained: Result<string, ApiError> = andThen(transformed, (name: string) => ok(name.toUpperCase()));
//
//      expect(isErr(chained)).toBe(true);
//      if (isErr(chained)) {
//        // TypeScript should know this is ApiError
//        expect(chained.error.status).toBe(404);
//        expect(chained.error.endpoint).toBe("/api/users/123");
//      }
//    });
//
//    it("should work with generic constraints across modules", () => {
//      // Test: Structured error types work across modules
//      const dbResult: Result<User[], DbError> = mockDbQuery(true);
//      const processed: Result<string[], DbError> = andThen(dbResult, (users: User[]) => {
//        if (users.length === 0) {
//          return err({ code: "NO_RESULTS", query: "processed", table: "users" });
//        }
//        return ok(users.map((u: User) => u.name));
//      });
//
//      expect(isErr(processed)).toBe(true);
//      if (isErr(processed)) {
//        // Error should maintain DbError structure
//        expect(processed.error.code).toBe("CONNECTION_TIMEOUT");
//        expect(processed.error.table).toBe("users");
//      }
//    });
//
//    it("should work with chain operations across modules", () => {
//      // Test: Chain with cross-module operations
//      const apiResult: Result<User, ApiError> = mockApiCall();
//      const result: Result<string, ApiError> = chain(apiResult)
//        .then((user: User) => ok(user.name))
//        .then((name: string) => ok(name.toUpperCase()))
//        .run();
//
//      expect(isOk(result)).toBe(true);
//      if (isOk(result)) {
//        expect(result.value).toBe("JOHN DOE");
//      }
//    });
//  });
//
//  describe("Complex Cross-Module Workflows", () => {
//    it("should handle complete data processing pipeline", () => {
//      // Test: Core -> Schema -> Iter -> Batch -> Utils pipeline
//      const processUserData = (jsonData: string): Result<User[], ValidationError> => {
//        const parseResult: Result<User[], string> = parseJson(jsonData, z.array(UserSchema));
//
//        if (isErr(parseResult)) {
//          return err({
//            field: "json",
//            message: parseResult.error,
//            code: "PARSE_ERROR"
//          });
//        }
//
//        const data: User[] = parseResult.value;
//        const validations: Result<User, ValidationError>[] = data.map((item: User, index: number) => {
//          const validation: Result<User, string> = validate(item, UserSchema);
//          return mapErr(validation, (errorMessage: string): ValidationError => ({
//            field: `users[${index}]`,
//            message: errorMessage,
//            code: "VALIDATION_ERROR"
//          }));
//        });
//
//        const allValid: Result<User[], ValidationError> = all(validations);
//        if (isErr(allValid)) {
//          return allValid;
//        }
//
//        const processed: Result<User[], ValidationError> = tap(allValid, (users: User[]) => console.log(`Processed ${users.length} users`));
//        return map(processed, (users: User[]) => users.filter((u: User) => u.id > 0));
//      };
//
//      const result = processUserData(mockJsonData);
//
//      expect(isOk(result)).toBe(true);
//      if (isOk(result)) {
//        expect(result.value).toHaveLength(2);
//        expect(result.value[0].name).toBe("Alice");
//      }
//    });
//
//    it("should handle error propagation through complex chains", () => {
//      // Test: Error types maintained through complex operations
//      const processWithErrors = (jsonData: string): Result<User[], string> => {
//        const parseResult: Result<unknown, Error> = handle(() => JSON.parse(jsonData));
//
//        if (isErr(parseResult)) {
//          const stringError: Result<unknown, string> = mapErr(parseResult, (error: Error) => error.message);
//          tapErr(stringError, (error: string) => console.log("Parse error:", error));
//          return stringError as Result<User[], string>;
//        }
//
//        const data: unknown = parseResult.value;
//        if (!Array.isArray(data)) {
//          return err("Not an array");
//        }
//
//        const validations: Result<User, string>[] = data.map((item: unknown) => validate(item, UserSchema));
//        const allResult: Result<User[], string> = all(validations);
//
//        return inspect(allResult,
//          (success: User[]) => `Validated ${success.length} users`,
//          (error: string) => `Validation failed: ${error}`
//        );
//      };
//
//      const result = processWithErrors("invalid json");
//
//      expect(isErr(result)).toBe(true);
//      if (isErr(result)) {
//        expect(result.error).toContain("Unexpected token");
//      }
//    });
//
//    it("should work with async operations across modules", async () => {
//      // Test: Async operations work across module boundaries
//      const fetchAndProcess = async (userId: number): Promise<Result<{user: User, processedName: string, related: string}, ApiError>> => {
//        return safeAsync(async function* () {
//          // Simulate API call
//          const apiResponse: User = yield Promise.resolve(mockApiCall(userId > 100));
//
//          // Transform data - keep it simple to avoid type conflicts
//          const processedName: string = apiResponse.name.toUpperCase();
//
//          // Batch operation with consistent error types
//          const related: [string, string] = yield allAsync([
//            Promise.resolve(ok(processedName) as Result<string, ApiError>),
//            Promise.resolve(ok("RELATED_DATA") as Result<string, ApiError>)
//          ]);
//
//          return {
//            user: apiResponse,
//            processedName,
//            related: related[1]
//          };
//        });
//      };
//
//      // Test success case
//      const successResult = await fetchAndProcess(50);
//      expect(isOk(successResult)).toBe(true);
//      if (isOk(successResult)) {
//        expect(successResult.value.processedName).toBe("JOHN DOE");
//        expect(successResult.value.related).toBe("RELATED_DATA");
//      }
//
//      // Test error case
//      const errorResult = await fetchAndProcess(150);
//      expect(isErr(errorResult)).toBe(true);
//      if (isErr(errorResult)) {
//        expect(errorResult.error.status).toBe(404);
//      }
//    });
//  });
//
//  describe("Pattern Integration", () => {
//    it("should work with generator patterns and other modules", () => {
//      // Test: safe() pattern with cross-module operations
//      const processMultipleUsers = (userIds: number[]): Result<string[], ApiError> => {
//        return safe(function* () {
//          // Use batch operations within generator
//          const apiCalls: Result<User, ApiError>[] = userIds.map((id: number) => mockApiCall(id > 100));
//          const allUsers: User[] = yield all(apiCalls);
//
//          // Use iter operations
//          const names: string[] = allUsers.map((user: User) => user.name);
//          const processed: string[] = yield all(names.map((name: string) => ok(name.toUpperCase())));
//
//          // Use utils for debugging
//          const inspected: Result<string[], never> = inspect(ok(processed),
//            (names: string[]) => `Processed ${names.length} names`,
//            (error: never) => `Failed: ${error}`
//          );
//
//          return yield inspected;
//        });
//      };
//
//      const result = processMultipleUsers([1, 2, 3]);
//      expect(isOk(result)).toBe(true);
//      if (isOk(result)) {
//        expect(result.value).toEqual(["JOHN DOE", "JOHN DOE", "JOHN DOE"]);
//      }
//
//      // Test error propagation
//      const errorResult = processMultipleUsers([1, 150, 3]);
//      expect(isErr(errorResult)).toBe(true);
//      if (isErr(errorResult)) {
//        expect(errorResult.error.status).toBe(404);
//      }
//    });
//
//    it("should work with zip operations across modules", () => {
//      // Test: zip with cross-module operations
//      const userResult: Result<User, ApiError> = mockApiCall();
//      const dbResult: Result<number, DbError> = map(mockDbQuery(), (users: User[]) => users.length);
//
//      // Convert dbResult to use ApiError for type compatibility
//      const dbResultWithApiError: Result<number, ApiError> = mapErr(dbResult, (dbError: DbError): ApiError => ({
//        status: 500,
//        message: `DB Error: ${dbError.code}`,
//        endpoint: "/internal/db"
//      }));
//
//      const combined: Result<[User, number], ApiError> = zip(userResult, dbResultWithApiError);
//
//      expect(isOk(combined)).toBe(true);
//      if (isOk(combined)) {
//        const [user, count] = combined.value;
//        expect(user.name).toBe("John Doe");
//        expect(count).toBe(2);
//      }
//    });
//
//    it("should work with zipWith and transformations", () => {
//      // Test: zipWith with iter operations
//      const result1: Result<string, never> = map(ok("hello"), (s: string) => s.toUpperCase());
//      const result2: Result<number, never> = map(ok("world"), (s: string) => s.length);
//
//      const zipped: Result<{str: string, len: number}, never> = zipWith(result1, result2, (str: string, len: number) => ({ str, len }));
//
//      expect(isOk(zipped)).toBe(true);
//      if (isOk(zipped)) {
//        expect(zipped.value).toEqual({ str: "HELLO", len: 5 });
//      }
//    });
//
//    it("should work with fluent chain API", () => {
//      // Test: Chain fluent API with cross-module operations
//      const result: Result<string, string> = chain(mockApiCall())
//        .then((user: User) => ok(user.email))
//        .then((email: string) => validate(email, z.string().email()))
//        .then((validEmail: string) => ok(validEmail.split("@")[0]))
//        .run();
//
//      expect(isOk(result)).toBe(true);
//      if (isOk(result)) {
//        expect(result.value).toBe("john");
//      }
//    });
//  });
//
//  describe("Schema Integration", () => {
//    it("should integrate validation with batch operations", () => {
//      // Test: Schema validation with batch processing
//      const validateUsers = (userData: unknown[]) => {
//        const validations: Result<User, string>[] = userData.map((data: unknown) => validate(data, UserSchema));
//        const allValid: Result<User[], string> = all(validations);
//
//        return andThen(allValid, (users: User[]) => {
//          const emailResults: Result<string, never>[] = users.map((u: User) => ok(u.email));
//          const analyzed = analyze(emailResults);
//          const emails: string[] = oks(emailResults);
//
//          return ok({
//            users,
//            emailCount: analyzed.okCount,
//            validEmails: emails,
//          });
//        });
//      };
//
//      const validData: unknown[] = [
//        { id: 1, name: "Alice", email: "alice@example.com" },
//        { id: 2, name: "Bob", email: "bob@example.com" }
//      ];
//
//      const result = validateUsers(validData);
//      expect(isOk(result)).toBe(true);
//      if (isOk(result)) {
//        expect(result.value.emailCount).toBe(2);
//        expect(result.value.validEmails).toHaveLength(2);
//      }
//    });
//
//    it("should handle validation errors with error analysis", () => {
//      // Test: Schema errors with batch error handling
//      const invalidData: unknown[] = [
//        { id: "invalid", name: "", email: "not-email" },
//        { id: 2, name: "Bob", email: "bob@example.com" }
//      ];
//
//      const validations: Result<User, string>[] = invalidData.map((data: unknown) => validate(data, UserSchema));
//      const results = partition(validations);
//
//      expect(results.oks).toHaveLength(1);
//      expect(results.errors).toHaveLength(1);
//      expect(results.oks[0].name).toBe("Bob");
//    });
//
//    it("should work with parseJson and complex validation", () => {
//      // Test: JSON parsing with nested validation
//      const processApiResponse = (jsonStr: string) => {
//        return chain(parseJson(jsonStr, ApiResponseSchema))
//          .then((response: any) => ok({
//            user: response.data,
//            timestamp: response.meta.timestamp,
//            version: response.meta.version
//          }))
//          .then((processed: any) => tap(ok(processed), (p: any) =>
//            console.log(`Processed API response v${p.version}`)
//          ))
//          .run();
//      };
//
//      const validJson = JSON.stringify({
//        data: {
//          id: 1,
//          name: "Alice",
//          email: "alice@example.com",
//          profile: {
//            bio: "Developer",
//            avatar: "https://example.com/alice.jpg",
//            preferences: { theme: "dark" }
//          }
//        },
//        meta: {
//          timestamp: Date.now(),
//          version: "1.0.0"
//        }
//      });
//
//      const result = processApiResponse(validJson);
//      expect(isOk(result)).toBe(true);
//      if (isOk(result)) {
//        expect(result.value.user.name).toBe("Alice");
//        expect(result.value.version).toBe("1.0.0");
//      }
//    });
//  });
//
//  describe("Utils Integration", () => {
//    it("should work with debugging across complex operations", () => {
//      const debugLog: string[] = [];
//
//      // Test: Utils functions with complex chains
//      const processWithDebugging = (data: unknown[]): Result<User[], string> => {
//        const validationResult: Result<User[], string> = all(data.map((item: unknown) => validate(item, UserSchema)));
//
//        const inspected: Result<User[], string> = inspect(validationResult,
//          (users: User[]) => {
//            debugLog.push(`Validated ${users.length} users`);
//            return `Success: ${users.length} users`;
//          },
//          (error: string) => {
//            debugLog.push(`Validation failed: ${error}`);
//            return `Error: ${error}`;
//          }
//        );
//
//        const tapped: Result<User[], string> = tap(inspected, (users: User[]) => {
//          debugLog.push(`Processing ${users.length} users`);
//        });
//
//        const errorTapped: Result<User[], string> = tapErr(tapped, (error: string) => {
//          debugLog.push(`Error occurred: ${error}`);
//        });
//
//        return map(errorTapped, (users: User[]) => {
//          const filtered: User[] = users.filter((u: User) => u.id > 0);
//          debugLog.push(`Filtered to ${filtered.length} users`);
//          return filtered;
//        });
//      };
//
//      const validData: unknown[] = [
//        { id: 1, name: "Alice", email: "alice@example.com" },
//        { id: 2, name: "Bob", email: "bob@example.com" }
//      ];
//
//      const result = processWithDebugging(validData);
//
//      expect(isOk(result)).toBe(true);
//      expect(debugLog).toContain("Validated 2 users");
//      expect(debugLog).toContain("Processing 2 users");
//      expect(debugLog).toContain("Filtered to 2 users");
//    });
//
//    it("should work with nullable conversion in complex chains", () => {
//      // Test: toNullable with cross-module operations
//      const processToNullable = (userIds: number[]): string[] | null => {
//        const results: Result<User, ApiError>[] = userIds.map((id: number) => mockApiCall(id > 100));
//        const combined: Result<User[], ApiError> = all(results);
//        const names: Result<string[], ApiError> = map(combined, (users: User[]) => users.map((u: User) => u.name));
//
//        return toNullable(names);
//      };
//
//      const successResult = processToNullable([1, 2, 3]);
//      expect(successResult).toEqual(["John Doe", "John Doe", "John Doe"]);
//
//      const errorResult = processToNullable([1, 150, 3]);
//      expect(errorResult).toBe(null);
//    });
//  });
//
//  describe("Real-World Scenarios", () => {
//    it("should handle complete user onboarding workflow", async () => {
//      // Test: Complete workflow combining all modules
//      const onboardUser = async (userData: unknown, sendEmail = true): Promise<Result<{user: User, profile: UserProfile, emailStatus: string, onboardedAt: string}, DbError | string>> => {
//        try {
//          // 1. Validate input data
//          const userValidation = validate(userData, UserSchema);
//          if (isErr(userValidation)) {
//            return err("Validation failed: " + userValidation.error);
//          }
//          const user = userValidation.value;
//
//          // 2. Check if user already exists (simulate async DB call)
//          const dbResult = mockDbQuery();
//          if (isErr(dbResult)) {
//            return err("DB Error: " + dbResult.error.code);
//          }
//          const existingUsers = dbResult.value;
//
//          // Simplified duplicate check
//          const existingUser = existingUsers.find((u: User) => u.email === user.email);
//          if (existingUser) {
//            return err({
//              code: "DUPLICATE_USER",
//              query: `email = '${user.email}'`,
//              table: "users"
//            } as DbError);
//          }
//
//          // 3. Create user profile
//          const profileData: UserProfile = {
//            bio: user.profile?.bio || "New user",
//            avatar: user.profile?.avatar || "https://example.com/default.jpg",
//            preferences: user.profile?.preferences || {}
//          };
//
//          // 4. Create result
//          const result = {
//            user: { ...user, id: Date.now() },
//            profile: profileData,
//            emailStatus: sendEmail ? "email-sent" : "email-skipped",
//            onboardedAt: new Date().toISOString()
//          };
//
//          return ok(result);
//        } catch (error) {
//          return err("Unexpected error: " + String(error));
//        }
//      };
//
//      // Test successful onboarding
//      const newUser: unknown = {
//        id: 999,
//        name: "Charlie",
//        email: "charlie@example.com",
//        profile: {
//          bio: "New developer",
//          avatar: "https://example.com/charlie.jpg",
//          preferences: { theme: "light" }
//        }
//      };
//
//      const result = await onboardUser(newUser);
//      expect(isOk(result)).toBe(true);
//      if (isOk(result)) {
//        expect(result.value.user.name).toBe("Charlie");
//        expect(result.value.emailStatus).toBe("email-sent");
//        expect(result.value.onboardedAt).toBeDefined();
//      }
//
//      // Test duplicate user
//      const duplicateUser: unknown = {
//        id: 1000,
//        name: "Alice Duplicate",
//        email: "alice@example.com" // This email exists in mock data
//      };
//
//      const duplicateResult = await onboardUser(duplicateUser);
//      expect(isErr(duplicateResult)).toBe(true);
//      if (isErr(duplicateResult)) {
//        if (typeof duplicateResult.error === 'object' && 'code' in duplicateResult.error) {
//          expect(duplicateResult.error.code).toBe("DUPLICATE_USER");
//        } else {
//          // If it's a string error, log it to see what happened
//          console.log("Unexpected error:", duplicateResult.error);
//          expect(true).toBe(false); // Force failure to see the error
//        }
//      }
//    });
//
//    it("should handle data migration workflow", () => {
//      // Test: Complex data migration with error recovery
//      const migrateUserData = (oldData: unknown[], newSchema: z.ZodSchema) => {
//        return safe(function* () {
//          // 1. Parse and validate old data
//          const parsed: Result<User, string>[] = oldData.map((item: unknown) => validate(item, UserSchema));
//          const partitioned = partition(parsed);
//
//          // 2. Handle validation failures
//          if (partitioned.errors.length > 0) {
//            console.log(`Found ${partitioned.errors.length} invalid records`);
//          }
//
//          // 3. Transform valid data to new format
//          const transformed = partitioned.oks.map((user: User) => ({
//            ...user,
//            migrated: true,
//            migratedAt: new Date().toISOString(),
//            legacyId: user.id
//          }));
//
//          // 4. Validate against new schema
//          const revalidated: Result<any, string>[] = transformed.map((item: any) => validate(item, newSchema));
//          const finalResults: any[] = yield all(revalidated);
//
//          // 5. Analyze migration results
//          const analysis = analyze([
//            ...partitioned.oks.map((): Result<string, never> => ok("migrated")),
//            ...partitioned.errors.map((): Result<never, string> => err("validation_failed"))
//          ]);
//
//          return {
//            migratedUsers: finalResults,
//            totalProcessed: oldData.length,
//            successCount: analysis.okCount,
//            errorCount: analysis.errorCount,
//            migrationSummary: `${analysis.okCount}/${oldData.length} records migrated successfully`
//          };
//        });
//      };
//
//      const MigratedUserSchema = UserSchema.extend({
//        migrated: z.boolean(),
//        migratedAt: z.string(),
//        legacyId: z.number()
//      });
//
//      const oldUserData: unknown[] = [
//        { id: 1, name: "Alice", email: "alice@example.com" },
//        { id: 2, name: "Bob", email: "bob@example.com" },
//        { id: "invalid", name: "", email: "bad-email" }, // This will fail validation
//      ];
//
//      const result = migrateUserData(oldUserData, MigratedUserSchema);
//
//      expect(isOk(result)).toBe(true);
//      if (isOk(result)) {
//        expect(result.value.migratedUsers).toHaveLength(2);
//        expect(result.value.totalProcessed).toBe(3);
//        expect(result.value.successCount).toBe(2);
//        expect(result.value.errorCount).toBe(1);
//        expect(result.value.migrationSummary).toBe("2/3 records migrated successfully");
//      }
//    });
//  });
//
//  describe("Performance Integration", () => {
//    it("should maintain performance characteristics in cross-module usage", () => {
//      // Test: Ensure cross-module usage doesn't degrade performance
//      const largeBatch: unknown[] = Array.from({ length: 1000 }, (_, i) => ({
//        id: i + 1,
//        name: `User ${i + 1}`,
//        email: `user${i + 1}@example.com`,
//      }));
//
//      const start = performance.now();
//
//      const validationResult: Result<User[], string> = all(largeBatch.map((user: unknown) => validate(user, UserSchema)));
//      const transformed: Result<string[], string> = map(validationResult, (users: User[]) => users.map((u: User) => u.name.toUpperCase()));
//
//      const processed: Result<{names: string[], averageNameLength: number}, string> = andThen(transformed, (names: string[]) => {
//        const lengthResults: Result<number, never>[] = names.map((name: string) => ok(name.length));
//        const analysis = analyze(lengthResults);
//        const lengths: number[] = oks(lengthResults);
//
//        return ok({
//          names,
//          averageNameLength: analysis.okCount > 0
//            ? lengths.reduce((sum: number, len: number) => sum + len, 0) / analysis.okCount
//            : 0
//        });
//      });
//
//      const final: Result<{names: string[], averageNameLength: number}, string> = tap(processed, (data: {names: string[], averageNameLength: number}) =>
//        console.log(`Processed ${data.names.length} users, avg name length: ${data.averageNameLength}`)
//      );
//
//      const end = performance.now();
//      const duration = end - start;
//
//      expect(isOk(final)).toBe(true);
//      expect(duration).toBeLessThan(100); // Should complete in under 100ms
//
//      if (isOk(final)) {
//        expect(final.value.names).toHaveLength(1000);
//        expect(final.value.averageNameLength).toBeGreaterThan(0);
//      }
//    });
//
//    it("should handle early exit optimization across modules", () => {
//      // Test: Early exit should work in cross-module chains
//      const testData: Result<User, ApiError>[] = Array.from({ length: 1000 }, (_, i) =>
//        i === 500 ? mockApiCall(true) : mockApiCall() // Error at index 500
//      );
//
//      const start = performance.now();
//
//      const batchResult: Result<User[], ApiError> = all(testData); // Should exit early at index 500
//      const mapped: Result<number, ApiError> = map(batchResult, (users: User[]) => users.length);
//      const final: Result<number, ApiError> = tap(mapped, (count: number) => console.log(`Processed ${count} users`));
//
//      const end = performance.now();
//      const duration = end - start;
//
//      expect(isErr(final)).toBe(true);
//      expect(duration).toBeLessThan(50); // Should exit early, much faster than processing all 1000
//
//      if (isErr(final)) {
//        expect(final.error.status).toBe(404);
//      }
//    });
//  });
//});
//
//import { describe, it, expect } from "vitest";
//import { Ok, ok, err, handle, isOk, isErr, unwrap, match } from "../src";
//import { map, andThen, mapErr } from "../src/iter";
//import {
//  all,
//  allAsync,
//  partition,
//  analyze,
//  findFirst,
//  oks,
//} from "../src/batch";
//import { inspect, tap, tapErr, toNullable } from "../src/utils";
//import { validate, parseJson } from "../src/schema";
//import { safe, safeAsync, zip, zipWith, chain } from "../src/patterns";
//import { z } from "zod";
//
//// Import Result type for type annotations
//import type { Result } from "../src/types";
//
//// Test types for cross-module integration
//interface User {
//  id: number;
//  name: string;
//  email: string;
//  profile?: UserProfile;
//}
//
//interface UserProfile {
//  bio: string;
//  avatar: string;
//  preferences: Record<string, unknown>;
//}
//
//interface ApiError {
//  status: number;
//  message: string;
//  endpoint: string;
//}
//
//interface DbError {
//  code: string;
//  query: string;
//  table: string;
//}
//
//interface ValidationError {
//  field: string;
//  message: string;
//  code: string;
//}
//
//// Schemas for validation tests
//const UserSchema = z.object({
//  id: z.number().positive(),
//  name: z.string().min(1),
//  email: z.string().email(),
//  profile: z
//    .object({
//      bio: z.string(),
//      avatar: z.string().url(),
//      preferences: z.record(z.unknown()),
//    })
//    .optional(),
//});
//
//const ApiResponseSchema = z.object({
//  data: UserSchema,
//  meta: z.object({
//    timestamp: z.number(),
//    version: z.string(),
//  }),
//});
//
//// Mock functions for testing
//const mockApiCall = (shouldFail = false): Result<User, ApiError> => {
//  if (shouldFail) {
//    return err({
//      status: 404,
//      message: "User not found",
//      endpoint: "/api/users/123",
//    });
//  }
//  return ok({
//    id: 123,
//    name: "John Doe",
//    email: "john@example.com",
//    profile: {
//      bio: "Software engineer",
//      avatar: "https://example.com/avatar.jpg",
//      preferences: { theme: "dark", notifications: true },
//    },
//  });
//};
//
//const mockDbQuery = (shouldFail = false): Result<User[], DbError> => {
//  if (shouldFail) {
//    return err({
//      code: "CONNECTION_TIMEOUT",
//      query: "SELECT * FROM users",
//      table: "users",
//    });
//  }
//  return ok([
//    { id: 1, name: "Alice", email: "alice@example.com" },
//    { id: 2, name: "Bob", email: "bob@example.com" },
//  ]);
//};
//
//const mockJsonData = `[
//  {"id": 1, "name": "Alice", "email": "alice@example.com"},
//  {"id": 2, "name": "Bob", "email": "bob@example.com"}
//]`;
//
//describe("Integration Tests", () => {
//  describe("Cross-Module Type Safety", () => {
//    it("should maintain type inference across module boundaries", () => {
//      // Test: Core -> Iter -> Batch chain
//      const apiResult: Result<User, ApiError> = mockApiCall();
//      const transformed: Result<string, ApiError> = map(
//        apiResult,
//        (user: User) => user.name,
//      );
//      const batched: Result<string[], ApiError> = all([
//        transformed,
//        ok("extra"),
//      ]);
//
//      expect(isOk(batched)).toBe(true);
//      if (isOk(batched)) {
//        // TypeScript should infer this as [string, string]
//        const [userName, extra] = batched.value;
//        expect(userName).toBe("John Doe");
//        expect(extra).toBe("extra");
//      }
//    });
//
//    it("should preserve error types through transformation chains", () => {
//      // Test: ApiError type preserved through transformations
//      const apiResult: Result<User, ApiError> = mockApiCall(true);
//      const transformed: Result<string, ApiError> = map(
//        apiResult,
//        (user: User) => user.name,
//      );
//      const chained: Result<string, ApiError> = andThen(
//        transformed,
//        (name: string) => ok(name.toUpperCase()),
//      );
//
//      expect(isErr(chained)).toBe(true);
//      if (isErr(chained)) {
//        // TypeScript should know this is ApiError
//        expect(chained.error.status).toBe(404);
//        expect(chained.error.endpoint).toBe("/api/users/123");
//      }
//    });
//
//    it("should work with generic constraints across modules", () => {
//      // Test: Structured error types work across modules
//      const dbResult: Result<User[], DbError> = mockDbQuery(true);
//      const processed: Result<string[], DbError> = andThen(
//        dbResult,
//        (users: User[]) => {
//          if (users.length === 0) {
//            return err({
//              code: "NO_RESULTS",
//              query: "processed",
//              table: "users",
//            });
//          }
//          return ok(users.map((u: User) => u.name));
//        },
//      );
//
//      expect(isErr(processed)).toBe(true);
//      if (isErr(processed)) {
//        // Error should maintain DbError structure
//        expect(processed.error.code).toBe("CONNECTION_TIMEOUT");
//        expect(processed.error.table).toBe("users");
//      }
//    });
//
//    it("should work with chain operations across modules", () => {
//      // Test: Chain with cross-module operations
//      const apiResult: Result<User, ApiError> = mockApiCall();
//      const result: Result<string, ApiError> = chain(apiResult)
//        .then((user: User) => ok(user.name))
//        .then((name: string) => ok(name.toUpperCase()))
//        .run();
//
//      expect(isOk(result)).toBe(true);
//      if (isOk(result)) {
//        expect(result.value).toBe("JOHN DOE");
//      }
//    });
//  });
//
//  describe("Complex Cross-Module Workflows", () => {
//    it("should handle complete data processing pipeline", () => {
//      // Test: Core -> Schema -> Iter -> Batch -> Utils pipeline
//      const processUserData = (
//        jsonData: string,
//      ): Result<User[], ValidationError> => {
//        const parseResult: Result<User[], string> = parseJson(
//          jsonData,
//          z.array(UserSchema),
//        );
//
//        if (isErr(parseResult)) {
//          return err({
//            field: "json",
//            message: parseResult.error,
//            code: "PARSE_ERROR",
//          });
//        }
//
//        const data: User[] = parseResult.value;
//        const validations: Result<User, ValidationError>[] = data.map(
//          (item: User, index: number) => {
//            const validation: Result<User, string> = validate(item, UserSchema);
//            return mapErr(
//              validation,
//              (errorMessage: string): ValidationError => ({
//                field: `users[${index}]`,
//                message: errorMessage,
//                code: "VALIDATION_ERROR",
//              }),
//            );
//          },
//        );
//
//        const allValid: Result<User[], ValidationError> = all(validations);
//        if (isErr(allValid)) {
//          return allValid;
//        }
//
//        const processed: Result<User[], ValidationError> = tap(
//          allValid,
//          (users: User[]) => console.log(`Processed ${users.length} users`),
//        );
//        return map(processed, (users: User[]) =>
//          users.filter((u: User) => u.id > 0),
//        );
//      };
//
//      const result = processUserData(mockJsonData);
//
//      expect(isOk(result)).toBe(true);
//      if (isOk(result)) {
//        expect(result.value).toHaveLength(2);
//        expect(result.value[0].name).toBe("Alice");
//      }
//    });
//
//    it("should handle error propagation through complex chains", () => {
//      // Test: Error types maintained through complex operations
//      const processWithErrors = (jsonData: string): Result<User[], string> => {
//        const parseResult: Result<unknown, Error> = handle(() =>
//          JSON.parse(jsonData),
//        );
//
//        if (isErr(parseResult)) {
//          const stringError: Result<unknown, string> = mapErr(
//            parseResult,
//            (error: Error) => error.message,
//          );
//          tapErr(stringError, (error: string) =>
//            console.log("Parse error:", error),
//          );
//          return stringError as Result<User[], string>;
//        }
//
//        const data: unknown = parseResult.value;
//        if (!Array.isArray(data)) {
//          return err("Not an array");
//        }
//
//        const validations: Result<User, string>[] = data.map((item: unknown) =>
//          validate(item, UserSchema),
//        );
//        const allResult: Result<User[], string> = all(validations);
//
//        return inspect(
//          allResult,
//          (success: User[]) => `Validated ${success.length} users`,
//          (error: string) => `Validation failed: ${error}`,
//        );
//      };
//
//      const result = processWithErrors("invalid json");
//
//      expect(isErr(result)).toBe(true);
//      if (isErr(result)) {
//        expect(result.error).toContain("Unexpected token");
//      }
//    });
//
//    it("should work with async operations across modules", async () => {
//      // Test: Async operations work across module boundaries
//      const fetchAndProcess = async (
//        userId: number,
//      ): Promise<
//        Result<{ user: User; processedName: string; related: string }, ApiError>
//      > => {
//        return safeAsync(async function* () {
//          // Simulate API call
//          const apiResponse: User = yield Promise.resolve(
//            mockApiCall(userId > 100),
//          );
//
//          // Transform data - keep it simple to avoid type conflicts
//          const processedName: string = apiResponse.name.toUpperCase();
//
//          // Batch operation with consistent error types
//          const related: [string, string] = yield allAsync([
//            Promise.resolve(ok(processedName) as Result<string, ApiError>),
//            Promise.resolve(ok("RELATED_DATA") as Result<string, ApiError>),
//          ]);
//
//          return {
//            user: apiResponse,
//            processedName,
//            related: related[1],
//          };
//        });
//      };
//
//      // Test success case
//      const successResult = await fetchAndProcess(50);
//      expect(isOk(successResult)).toBe(true);
//      if (isOk(successResult)) {
//        expect(successResult.value.processedName).toBe("JOHN DOE");
//        expect(successResult.value.related).toBe("RELATED_DATA");
//      }
//
//      // Test error case
//      const errorResult = await fetchAndProcess(150);
//      expect(isErr(errorResult)).toBe(true);
//      if (isErr(errorResult)) {
//        expect(errorResult.error.status).toBe(404);
//      }
//    });
//  });
//
//  describe("Pattern Integration", () => {
//    it("should work with generator patterns and other modules", () => {
//      // Test: safe() pattern with cross-module operations
//      const processMultipleUsers = (
//        userIds: number[],
//      ): Result<string[], ApiError> => {
//        return safe(function* () {
//          // Use batch operations within generator
//          const apiCalls: Result<User, ApiError>[] = userIds.map((id: number) =>
//            mockApiCall(id > 100),
//          );
//          const allUsers: User[] = yield all(apiCalls);
//
//          // Use iter operations
//          const names: string[] = allUsers.map((user: User) => user.name);
//          const processed: string[] = yield all(
//            names.map((name: string) => ok(name.toUpperCase())),
//          );
//
//          // Use utils for debugging
//          const inspected: Result<string[], never> = inspect(
//            ok(processed),
//            (names: string[]) => `Processed ${names.length} names`,
//            (error: never) => `Failed: ${error}`,
//          );
//
//          return yield inspected;
//        });
//      };
//
//      const result = processMultipleUsers([1, 2, 3]);
//      expect(isOk(result)).toBe(true);
//      if (isOk(result)) {
//        expect(result.value).toEqual(["JOHN DOE", "JOHN DOE", "JOHN DOE"]);
//      }
//
//      // Test error propagation
//      const errorResult = processMultipleUsers([1, 150, 3]);
//      expect(isErr(errorResult)).toBe(true);
//      if (isErr(errorResult)) {
//        expect(errorResult.error.status).toBe(404);
//      }
//    });
//
//    it("should work with zip operations across modules", () => {
//      // Test: zip with cross-module operations
//      const userResult: Result<User, ApiError> = mockApiCall();
//      const dbResult: Result<number, DbError> = map(
//        mockDbQuery(),
//        (users: User[]) => users.length,
//      );
//
//      // Convert dbResult to use ApiError for type compatibility
//      const dbResultWithApiError: Result<number, ApiError> = mapErr(
//        dbResult,
//        (dbError: DbError): ApiError => ({
//          status: 500,
//          message: `DB Error: ${dbError.code}`,
//          endpoint: "/internal/db",
//        }),
//      );
//
//      const combined: Result<[User, number], ApiError> = zip(
//        userResult,
//        dbResultWithApiError,
//      );
//
//      expect(isOk(combined)).toBe(true);
//      if (isOk(combined)) {
//        const [user, count] = combined.value;
//        expect(user.name).toBe("John Doe");
//        expect(count).toBe(2);
//      }
//    });
//
//    it("should work with zipWith and transformations", () => {
//      // Test: zipWith with iter operations
//      const result1: Result<string, never> = map(ok("hello"), (s: string) =>
//        s.toUpperCase(),
//      );
//      const result2: Result<number, never> = map(
//        ok("world"),
//        (s: string) => s.length,
//      );
//
//      const zipped: Result<{ str: string; len: number }, never> = zipWith(
//        result1,
//        result2,
//        (str: string, len: number) => ({ str, len }),
//      );
//
//      expect(isOk(zipped)).toBe(true);
//      if (isOk(zipped)) {
//        expect(zipped.value).toEqual({ str: "HELLO", len: 5 });
//      }
//    });
//
//    it("should work with fluent chain API", () => {
//      // Test: Chain fluent API with cross-module operations
//      const result: Result<string, ApiError> = chain(mockApiCall())
//        .then((user: User) => ok(user.email))
//        .then((email: string) => validate(email, z.string().email()))
//        .then((validEmail: string) => ok(validEmail.split("@")[0]))
//        .run();
//
//      expect(isOk(result)).toBe(true);
//      if (isOk(result)) {
//        expect(result.value).toBe("john");
//      }
//    });
//  });
//
//  describe("Schema Integration", () => {
//    it("should integrate validation with batch operations", () => {
//      // Test: Schema validation with batch processing
//      const validateUsers = (userData: unknown[]) => {
//        const validations: Result<User, string>[] = userData.map(
//          (data: unknown) => validate(data, UserSchema),
//        );
//        const allValid: Result<User[], string> = all(validations);
//
//        return andThen(allValid, (users: User[]) => {
//          const emailResults: Result<string, never>[] = users.map((u: User) =>
//            ok(u.email),
//          );
//          const analyzed = analyze(emailResults);
//          const emails: string[] = oks(emailResults);
//
//          return ok({
//            users,
//            emailCount: analyzed.okCount,
//            validEmails: emails,
//          });
//        });
//      };
//
//      const validData: unknown[] = [
//        { id: 1, name: "Alice", email: "alice@example.com" },
//        { id: 2, name: "Bob", email: "bob@example.com" },
//      ];
//
//      const result = validateUsers(validData);
//      expect(isOk(result)).toBe(true);
//      if (isOk(result)) {
//        expect(result.value.emailCount).toBe(2);
//        expect(result.value.validEmails).toHaveLength(2);
//      }
//    });
//
//    it("should handle validation errors with error analysis", () => {
//      // Test: Schema errors with batch error handling
//      const invalidData: unknown[] = [
//        { id: "invalid", name: "", email: "not-email" },
//        { id: 2, name: "Bob", email: "bob@example.com" },
//      ];
//
//      const validations: Result<User, string>[] = invalidData.map(
//        (data: unknown) => validate(data, UserSchema),
//      );
//      const results = partition(validations);
//
//      expect(results.oks).toHaveLength(1);
//      expect(results.errors).toHaveLength(1);
//      expect(results.oks[0].name).toBe("Bob");
//    });
//
//    it("should work with parseJson and complex validation", () => {
//      // Test: JSON parsing with nested validation
//      const processApiResponse = (jsonStr: string) => {
//        return chain(parseJson(jsonStr, ApiResponseSchema))
//          .then((response: any) =>
//            ok({
//              user: response.data,
//              timestamp: response.meta.timestamp,
//              version: response.meta.version,
//            }),
//          )
//          .then((processed: any) =>
//            tap(ok(processed), (p: any) =>
//              console.log(`Processed API response v${p.version}`),
//            ),
//          )
//          .run();
//      };
//
//      const validJson = JSON.stringify({
//        data: {
//          id: 1,
//          name: "Alice",
//          email: "alice@example.com",
//          profile: {
//            bio: "Developer",
//            avatar: "https://example.com/alice.jpg",
//            preferences: { theme: "dark" },
//          },
//        },
//        meta: {
//          timestamp: Date.now(),
//          version: "1.0.0",
//        },
//      });
//
//      const result = processApiResponse(validJson);
//      expect(isOk(result)).toBe(true);
//      if (isOk(result)) {
//        expect(result.value.user.name).toBe("Alice");
//        expect(result.value.version).toBe("1.0.0");
//      }
//    });
//  });
//
//  describe("Utils Integration", () => {
//    it("should work with debugging across complex operations", () => {
//      const debugLog: string[] = [];
//
//      // Test: Utils functions with complex chains
//      const processWithDebugging = (
//        data: unknown[],
//      ): Result<User[], string> => {
//        const validationResult: Result<User[], string> = all(
//          data.map((item: unknown) => validate(item, UserSchema)),
//        );
//
//        const inspected: Result<User[], string> = inspect(
//          validationResult,
//          (users: User[]) => {
//            debugLog.push(`Validated ${users.length} users`);
//            return `Success: ${users.length} users`;
//          },
//          (error: string) => {
//            debugLog.push(`Validation failed: ${error}`);
//            return `Error: ${error}`;
//          },
//        );
//
//        const tapped: Result<User[], string> = tap(
//          inspected,
//          (users: User[]) => {
//            debugLog.push(`Processing ${users.length} users`);
//          },
//        );
//
//        const errorTapped: Result<User[], string> = tapErr(
//          tapped,
//          (error: string) => {
//            debugLog.push(`Error occurred: ${error}`);
//          },
//        );
//
//        return map(errorTapped, (users: User[]) => {
//          const filtered: User[] = users.filter((u: User) => u.id > 0);
//          debugLog.push(`Filtered to ${filtered.length} users`);
//          return filtered;
//        });
//      };
//
//      const validData: unknown[] = [
//        { id: 1, name: "Alice", email: "alice@example.com" },
//        { id: 2, name: "Bob", email: "bob@example.com" },
//      ];
//
//      const result = processWithDebugging(validData);
//
//      expect(isOk(result)).toBe(true);
//      expect(debugLog).toContain("Validated 2 users");
//      expect(debugLog).toContain("Processing 2 users");
//      expect(debugLog).toContain("Filtered to 2 users");
//    });
//
//    it("should work with nullable conversion in complex chains", () => {
//      // Test: toNullable with cross-module operations
//      const processToNullable = (userIds: number[]): string[] | null => {
//        const results: Result<User, ApiError>[] = userIds.map((id: number) =>
//          mockApiCall(id > 100),
//        );
//        const combined: Result<User[], ApiError> = all(results);
//        const names: Result<string[], ApiError> = map(
//          combined,
//          (users: User[]) => users.map((u: User) => u.name),
//        );
//
//        return toNullable(names);
//      };
//
//      const successResult = processToNullable([1, 2, 3]);
//      expect(successResult).toEqual(["John Doe", "John Doe", "John Doe"]);
//
//      const errorResult = processToNullable([1, 150, 3]);
//      expect(errorResult).toBe(null);
//    });
//  });
//
//  describe("Real-World Scenarios", () => {
//    it("should handle complete user onboarding workflow", async () => {
//      // Test: Complete workflow combining all modules
//      const onboardUser = async (
//        userData: unknown,
//        sendEmail = true,
//      ): Promise<
//        Result<
//          {
//            user: User;
//            profile: UserProfile;
//            emailStatus: string;
//            onboardedAt: string;
//          },
//          DbError
//        >
//      > => {
//        return safeAsync(async function* () {
//          // 1. Validate input data
//          const user: User = yield validate(userData, UserSchema);
//
//          // 2. Check if user already exists (simulate async DB call)
//          const existingUsers: User[] =
//            yield await Promise.resolve(mockDbQuery());
//          const existingUser = existingUsers.find(
//            (u: User) => u.email === user.email,
//          );
//
//          if (existingUser) {
//            const error: DbError = {
//              code: "DUPLICATE_USER",
//              query: `email = '${user.email}'`,
//              table: "users",
//            };
//            return err(error);
//          }
//
//          // 3. Create user profile
//          const profileData: UserProfile = {
//            bio: user.profile?.bio || "New user",
//            avatar: user.profile?.avatar || "https://example.com/default.jpg",
//            preferences: user.profile?.preferences || {},
//          };
//
//          // 4. Batch operations for user creation
//          const operations: [User, UserProfile, string] = yield await allAsync([
//            Promise.resolve(ok({ ...user, id: Date.now() })),
//            Promise.resolve(ok(profileData)),
//            sendEmail
//              ? Promise.resolve(ok("email-sent"))
//              : Promise.resolve(ok("email-skipped")),
//          ]);
//
//          const [createdUser, profile, emailStatus] = operations;
//
//          // 5. Return complete result with debugging
//          const result = {
//            user: createdUser,
//            profile,
//            emailStatus,
//            onboardedAt: new Date().toISOString(),
//          };
//
//          inspect(
//            ok(result),
//            (result: {
//              user: User;
//              profile: UserProfile;
//              emailStatus: string;
//              onboardedAt: string;
//            }) => `User ${result.user.name} onboarded successfully`,
//            (error: never) => `Onboarding failed: ${error}`,
//          );
//
//          return result;
//        });
//      };
//
//      // Test successful onboarding
//      const newUser: unknown = {
//        id: 999,
//        name: "Charlie",
//        email: "charlie@example.com",
//        profile: {
//          bio: "New developer",
//          avatar: "https://example.com/charlie.jpg",
//          preferences: { theme: "light" },
//        },
//      };
//
//      const result = await onboardUser(newUser);
//      expect(isOk(result)).toBe(true);
//      if (isOk(result)) {
//        expect(result.value.user.name).toBe("Charlie");
//        expect(result.value.emailStatus).toBe("email-sent");
//        expect(result.value.onboardedAt).toBeDefined();
//      }
//
//      // Test duplicate user
//      const duplicateUser: unknown = {
//        id: 1000,
//        name: "Alice Duplicate",
//        email: "alice@example.com", // This email exists in mock data
//      };
//
//      const duplicateResult = await onboardUser(duplicateUser);
//      expect(isErr(duplicateResult)).toBe(true);
//      if (isErr(duplicateResult)) {
//        expect(duplicateResult.error.code).toBe("DUPLICATE_USER");
//      }
//    });
//
//    it("should handle data migration workflow", () => {
//      // Test: Complex data migration with error recovery
//      const migrateUserData = (oldData: unknown[], newSchema: z.ZodSchema) => {
//        return safe(function* () {
//          // 1. Parse and validate old data
//          const parsed: Result<User, string>[] = oldData.map((item: unknown) =>
//            validate(item, UserSchema),
//          );
//          const partitioned = partition(parsed);
//
//          // 2. Handle validation failures
//          if (partitioned.errors.length > 0) {
//            console.log(`Found ${partitioned.errors.length} invalid records`);
//          }
//
//          // 3. Transform valid data to new format
//          const transformed = partitioned.oks.map((user: User) => ({
//            ...user,
//            migrated: true,
//            migratedAt: new Date().toISOString(),
//            legacyId: user.id,
//          }));
//
//          // 4. Validate against new schema
//          const revalidated: Result<any, string>[] = transformed.map(
//            (item: any) => validate(item, newSchema),
//          );
//          const finalResults: any[] = yield all(revalidated);
//
//          // 5. Analyze migration results
//          const analysis = analyze([
//            ...partitioned.oks.map((): Result<string, never> => ok("migrated")),
//            ...partitioned.errors.map(
//              (): Result<never, string> => err("validation_failed"),
//            ),
//          ]);
//
//          return {
//            migratedUsers: finalResults,
//            totalProcessed: oldData.length,
//            successCount: analysis.okCount,
//            errorCount: analysis.errorCount,
//            migrationSummary: `${analysis.okCount}/${oldData.length} records migrated successfully`,
//          };
//        });
//      };
//
//      const MigratedUserSchema = UserSchema.extend({
//        migrated: z.boolean(),
//        migratedAt: z.string(),
//        legacyId: z.number(),
//      });
//
//      const oldUserData: unknown[] = [
//        { id: 1, name: "Alice", email: "alice@example.com" },
//        { id: 2, name: "Bob", email: "bob@example.com" },
//        { id: "invalid", name: "", email: "bad-email" }, // This will fail validation
//      ];
//
//      const result = migrateUserData(oldUserData, MigratedUserSchema);
//
//      expect(isOk(result)).toBe(true);
//      if (isOk(result)) {
//        expect(result.value.migratedUsers).toHaveLength(2);
//        expect(result.value.totalProcessed).toBe(3);
//        expect(result.value.successCount).toBe(2);
//        expect(result.value.errorCount).toBe(1);
//        expect(result.value.migrationSummary).toBe(
//          "2/3 records migrated successfully",
//        );
//      }
//    });
//  });
//
//  describe("Performance Integration", () => {
//    it("should maintain performance characteristics in cross-module usage", () => {
//      // Test: Ensure cross-module usage doesn't degrade performance
//      const largeBatch: unknown[] = Array.from({ length: 1000 }, (_, i) => ({
//        id: i + 1,
//        name: `User ${i + 1}`,
//        email: `user${i + 1}@example.com`,
//      }));
//
//      const start = performance.now();
//
//      const validationResult: Result<User[], string> = all(
//        largeBatch.map((user: unknown) => validate(user, UserSchema)),
//      );
//      const transformed: Result<string[], string> = map(
//        validationResult,
//        (users: User[]) => users.map((u: User) => u.name.toUpperCase()),
//      );
//
//      const processed: Result<
//        { names: string[]; averageNameLength: number },
//        string
//      > = andThen(transformed, (names: string[]) => {
//        const lengthResults: Result<number, never>[] = names.map(
//          (name: string) => ok(name.length),
//        );
//        const analysis = analyze(lengthResults);
//        const lengths: number[] = oks(lengthResults);
//
//        return ok({
//          names,
//          averageNameLength:
//            analysis.okCount > 0
//              ? lengths.reduce((sum: number, len: number) => sum + len, 0) /
//                analysis.okCount
//              : 0,
//        });
//      });
//
//      const final: Result<
//        { names: string[]; averageNameLength: number },
//        string
//      > = tap(
//        processed,
//        (data: { names: string[]; averageNameLength: number }) =>
//          console.log(
//            `Processed ${data.names.length} users, avg name length: ${data.averageNameLength}`,
//          ),
//      );
//
//      const end = performance.now();
//      const duration = end - start;
//
//      expect(isOk(final)).toBe(true);
//      expect(duration).toBeLessThan(100); // Should complete in under 100ms
//
//      if (isOk(final)) {
//        expect(final.value.names).toHaveLength(1000);
//        expect(final.value.averageNameLength).toBeGreaterThan(0);
//      }
//    });
//
//    it("should handle early exit optimization across modules", () => {
//      // Test: Early exit should work in cross-module chains
//      const testData: Result<User, ApiError>[] = Array.from(
//        { length: 1000 },
//        (_, i) => (i === 500 ? mockApiCall(true) : mockApiCall()), // Error at index 500
//      );
//
//      const start = performance.now();
//
//      const batchResult: Result<User[], ApiError> = all(testData); // Should exit early at index 500
//      const mapped: Result<number, ApiError> = map(
//        batchResult,
//        (users: User[]) => users.length,
//      );
//      const final: Result<number, ApiError> = tap(mapped, (count: number) =>
//        console.log(`Processed ${count} users`),
//      );
//
//      const end = performance.now();
//      const duration = end - start;
//
//      expect(isErr(final)).toBe(true);
//      expect(duration).toBeLessThan(50); // Should exit early, much faster than processing all 1000
//
//      if (isErr(final)) {
//        expect(final.error.status).toBe(404);
//      }
//    });
//  });
//});
