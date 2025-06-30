import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  isOk,
  isErr,
  validate,
  validateAsync,
  validateWith,
  validateWithAsync,
  resultSchema,
  stringErrorSchema,
  numberErrorSchema,
  structuredErrorSchema,
  parseJson,
  parseJsonAsync,
  parseResult,
  parseResultAsync,
} from "../src/schema";
import type { Result } from "../src/types";

describe("Schema Module - Validation and Parsing", () => {
  // Test schemas
  const UserSchema = z.object({
    id: z.number(),
    name: z.string(),
    email: z.string().email(),
    age: z.number().min(0).max(150),
  });

  const SimpleSchema = z.object({
    value: z.string(),
  });

  const AsyncSchema = z.object({
    email: z
      .string()
      .email()
      .refine(async (email) => {
        // Simulate async validation
        await new Promise((resolve) => setTimeout(resolve, 1));
        return !email.includes("blocked");
      }, "Email is blocked"),
  });

  describe("validate()", () => {
    it("should return Ok for valid data", () => {
      const validUser = {
        id: 1,
        name: "John Doe",
        email: "john@example.com",
        age: 30,
      };

      const result = validate(validUser, UserSchema);
      expect(result).toEqual({ type: "Ok", value: validUser });
    });

    it("should return Err for invalid data", () => {
      const invalidUser = {
        id: "not a number",
        name: "John Doe",
        email: "invalid-email",
        age: -5,
      };

      const result = validate(invalidUser, UserSchema);
      expect(result.type).toBe("Err");
      if (isErr(result)) {
        expect(result.error).toContain("Validation failed:");
        expect(result.error).toContain("Expected number");
      }
    });

    it("should handle missing required fields", () => {
      const incompleteUser = {
        id: 1,
        name: "John Doe",
        // missing email and age
      };

      const result = validate(incompleteUser, UserSchema);
      expect(result.type).toBe("Err");
      if (isErr(result)) {
        expect(result.error).toContain("Validation failed:");
      }
    });

    it("should handle null and undefined inputs", () => {
      expect(validate(null, UserSchema).type).toBe("Err");
      expect(validate(undefined, UserSchema).type).toBe("Err");
    });

    it("should handle primitive types", () => {
      const stringSchema = z.string();

      expect(validate("hello", stringSchema)).toEqual({
        type: "Ok",
        value: "hello",
      });

      expect(validate(123, stringSchema).type).toBe("Err");
    });

    it("should handle complex nested schemas", () => {
      const NestedSchema = z.object({
        user: UserSchema,
        metadata: z.object({
          createdAt: z.string(),
          tags: z.array(z.string()),
        }),
      });

      const validNested = {
        user: {
          id: 1,
          name: "John",
          email: "john@example.com",
          age: 30,
        },
        metadata: {
          createdAt: "2023-01-01",
          tags: ["admin", "verified"],
        },
      };

      const result = validate(validNested, NestedSchema);
      expect(result).toEqual({ type: "Ok", value: validNested });
    });
  });

  describe("validateAsync()", () => {
    it("should return Ok for valid async data", async () => {
      const validEmail = { email: "test@example.com" };

      const result = await validateAsync(validEmail, AsyncSchema);
      expect(result).toEqual({ type: "Ok", value: validEmail });
    });

    it("should return Err for async validation failure", async () => {
      const blockedEmail = { email: "user@blocked.com" };

      const result = await validateAsync(blockedEmail, AsyncSchema);
      expect(result.type).toBe("Err");
      if (isErr(result)) {
        expect(result.error).toContain("Validation failed:");
        expect(result.error).toContain("Email is blocked");
      }
    });

    it("should handle invalid email format in async validation", async () => {
      const invalidEmail = { email: "not-an-email" };

      const result = await validateAsync(invalidEmail, AsyncSchema);
      expect(result.type).toBe("Err");
      if (isErr(result)) {
        expect(result.error).toContain("Validation failed:");
        expect(result.error).toContain("Invalid email");
      }
    });

    it("should work with sync schemas in async context", async () => {
      const validUser = {
        id: 1,
        name: "John",
        email: "john@example.com",
        age: 30,
      };

      const result = await validateAsync(validUser, UserSchema);
      expect(result).toEqual({ type: "Ok", value: validUser });
    });
  });

  describe("validateWith()", () => {
    const customErrorMapper = (zodError: z.ZodError) => ({
      code: 400,
      message: zodError.issues[0]?.message || "Validation failed",
      field: zodError.issues[0]?.path.join(".") || "unknown",
      issueCount: zodError.issues.length,
    });

    it("should return Ok for valid data with custom error mapping", () => {
      const validUser = {
        id: 1,
        name: "John",
        email: "john@example.com",
        age: 30,
      };

      const result = validateWith(validUser, UserSchema, customErrorMapper);
      expect(result).toEqual({ type: "Ok", value: validUser });
    });

    it("should return custom mapped error for invalid data", () => {
      const invalidUser = {
        id: "not a number",
        name: "John",
        email: "john@example.com",
        age: 30,
      };

      const result = validateWith(invalidUser, UserSchema, customErrorMapper);
      expect(result.type).toBe("Err");
      if (isErr(result)) {
        expect(result.error).toMatchObject({
          code: 400,
          message: expect.stringContaining("Expected number"),
          field: "id",
          issueCount: expect.any(Number),
        });
      }
    });

    it("should handle multiple validation errors in custom mapping", () => {
      const invalidUser = {
        id: "not a number",
        name: 123, // should be string
        email: "invalid-email",
        age: -5,
      };

      const result = validateWith(invalidUser, UserSchema, customErrorMapper);
      expect(result.type).toBe("Err");
      if (isErr(result)) {
        expect(result.error.issueCount).toBeGreaterThan(1);
      }
    });

    it("should allow different error types", () => {
      const numberErrorMapper = () => 404;
      const stringErrorMapper = () => "Custom error";
      const objectErrorMapper = (zodError: z.ZodError) =>
        new Error(zodError.message);

      const invalidData = { value: 123 };

      expect(
        validateWith(invalidData, SimpleSchema, numberErrorMapper),
      ).toEqual({
        type: "Err",
        error: 404,
      });

      expect(
        validateWith(invalidData, SimpleSchema, stringErrorMapper),
      ).toEqual({
        type: "Err",
        error: "Custom error",
      });

      const errorResult = validateWith(
        invalidData,
        SimpleSchema,
        objectErrorMapper,
      );
      expect(errorResult.type).toBe("Err");
      if (isErr(errorResult)) {
        expect(errorResult.error).toBeInstanceOf(Error);
      }
    });
  });

  describe("validateWithAsync()", () => {
    const syncErrorMapper = (zodError: z.ZodError) => ({
      timestamp: Date.now(),
      errors: zodError.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });

    it("should return Ok for valid data with async custom error mapping", async () => {
      const validEmail = { email: "test@example.com" };

      const result = await validateWithAsync(
        validEmail,
        AsyncSchema,
        syncErrorMapper,
      );
      expect(result).toEqual({ type: "Ok", value: validEmail });
    });

    it("should return custom mapped error for invalid async data", async () => {
      const invalidEmail = { email: "not-an-email" };

      const result = await validateWithAsync(
        invalidEmail,
        AsyncSchema,
        syncErrorMapper,
      );
      expect(result.type).toBe("Err");
      if (isErr(result)) {
        expect(result.error).toMatchObject({
          timestamp: expect.any(Number),
          errors: expect.arrayContaining([
            expect.objectContaining({
              path: "email",
              message: expect.stringContaining("Invalid email"),
            }),
          ]),
        });
      }
    });

    it("should handle sync error mapper with async validation", async () => {
      const syncStringMapper = (zodError: z.ZodError) =>
        `Sync mapped: ${zodError.message}`;
      const invalidEmail = { email: "blocked@blocked.com" };

      const result = await validateWithAsync(
        invalidEmail,
        AsyncSchema,
        syncStringMapper,
      );
      expect(result.type).toBe("Err");
      if (isErr(result)) {
        expect(typeof result.error).toBe("string");
        expect(result.error).toContain("Sync mapped:");
      }
    });
  });

  describe("resultSchema()", () => {
    it("should validate Ok Results", () => {
      const userResultSchema = resultSchema(UserSchema, z.string());

      const okResult = {
        type: "Ok",
        value: {
          id: 1,
          name: "John",
          email: "john@example.com",
          age: 30,
        },
      };

      const parsed = userResultSchema.parse(okResult);
      expect(parsed).toEqual(okResult);
    });

    it("should validate Err Results", () => {
      const userResultSchema = resultSchema(UserSchema, z.string());

      const errResult = {
        type: "Err",
        error: "User not found",
      };

      const parsed = userResultSchema.parse(errResult);
      expect(parsed).toEqual(errResult);
    });

    it("should reject invalid Result structures", () => {
      const userResultSchema = resultSchema(UserSchema, z.string());

      expect(() =>
        userResultSchema.parse({ type: "Maybe", value: "invalid" }),
      ).toThrow();
      expect(() => userResultSchema.parse({ type: "Ok" })).toThrow(); // missing value
      expect(() => userResultSchema.parse({ type: "Err" })).toThrow(); // missing error
      expect(() => userResultSchema.parse({})).toThrow(); // missing type
    });

    it("should validate nested Result values", () => {
      const userResultSchema = resultSchema(UserSchema, z.string());

      const invalidUserResult = {
        type: "Ok",
        value: {
          id: "not a number",
          name: "John",
          email: "invalid-email",
          age: 30,
        },
      };

      expect(() => userResultSchema.parse(invalidUserResult)).toThrow();
    });

    it("should work with different error types", () => {
      const numberErrorSchema = resultSchema(z.string(), z.number());
      const objectErrorSchema = resultSchema(
        z.string(),
        z.object({ code: z.number() }),
      );

      expect(numberErrorSchema.parse({ type: "Err", error: 404 })).toEqual({
        type: "Err",
        error: 404,
      });

      expect(
        objectErrorSchema.parse({ type: "Err", error: { code: 500 } }),
      ).toEqual({
        type: "Err",
        error: { code: 500 },
      });
    });
  });

  describe("stringErrorSchema()", () => {
    it("should create Result schema with string errors", () => {
      const schema = stringErrorSchema(UserSchema);

      expect(
        schema.parse({
          type: "Ok",
          value: { id: 1, name: "John", email: "john@example.com", age: 30 },
        }),
      ).toBeDefined();
      expect(
        schema.parse({ type: "Err", error: "String error" }),
      ).toBeDefined();
      expect(() => schema.parse({ type: "Err", error: 404 })).toThrow();
    });
  });

  describe("numberErrorSchema()", () => {
    it("should create Result schema with number errors", () => {
      const schema = numberErrorSchema(UserSchema);

      expect(schema.parse({ type: "Err", error: 404 })).toBeDefined();
      expect(() =>
        schema.parse({ type: "Err", error: "String error" }),
      ).toThrow();
    });
  });

  describe("structuredErrorSchema()", () => {
    it("should create Result schema with structured errors", () => {
      const schema = structuredErrorSchema(UserSchema);

      const validStructuredError = {
        type: "Err",
        error: {
          message: "Validation failed",
          code: 400,
        },
      };

      expect(schema.parse(validStructuredError)).toEqual(validStructuredError);

      const minimalStructuredError = {
        type: "Err",
        error: {
          message: "Just a message",
        },
      };

      expect(schema.parse(minimalStructuredError)).toEqual(
        minimalStructuredError,
      );
      expect(() =>
        schema.parse({ type: "Err", error: { code: 400 } }),
      ).toThrow(); // missing message
    });
  });

  describe("parseJson()", () => {
    it("should parse and validate valid JSON", () => {
      const jsonString = JSON.stringify({
        id: 1,
        name: "John",
        email: "john@example.com",
        age: 30,
      });

      const result = parseJson(jsonString, UserSchema);
      expect(result).toEqual({
        type: "Ok",
        value: {
          id: 1,
          name: "John",
          email: "john@example.com",
          age: 30,
        },
      });
    });

    it("should return Err for invalid JSON syntax", () => {
      const invalidJson = '{"id": 1, "name": "John",}'; // trailing comma

      const result = parseJson(invalidJson, UserSchema);
      expect(result.type).toBe("Err");
      if (isErr(result)) {
        expect(result.error).toContain("Invalid JSON:");
      }
    });

    it("should return Err for valid JSON that fails validation", () => {
      const validJsonInvalidData = JSON.stringify({
        id: "not a number",
        name: "John",
        email: "invalid-email",
        age: 30,
      });

      const result = parseJson(validJsonInvalidData, UserSchema);
      expect(result.type).toBe("Err");
      if (isErr(result)) {
        expect(result.error).toContain("Validation failed:");
      }
    });

    it("should handle primitive JSON values", () => {
      expect(parseJson('"hello"', z.string())).toEqual({
        type: "Ok",
        value: "hello",
      });

      expect(parseJson("42", z.number())).toEqual({
        type: "Ok",
        value: 42,
      });

      expect(parseJson("true", z.boolean())).toEqual({
        type: "Ok",
        value: true,
      });

      expect(parseJson("null", z.null())).toEqual({
        type: "Ok",
        value: null,
      });
    });

    it("should handle array JSON", () => {
      const arraySchema = z.array(
        z.object({ id: z.number(), name: z.string() }),
      );
      const jsonArray = JSON.stringify([
        { id: 1, name: "John" },
        { id: 2, name: "Jane" },
      ]);

      const result = parseJson(jsonArray, arraySchema);
      expect(result).toEqual({
        type: "Ok",
        value: [
          { id: 1, name: "John" },
          { id: 2, name: "Jane" },
        ],
      });
    });
  });

  describe("parseJsonAsync()", () => {
    it("should parse and validate JSON with async schema", async () => {
      const jsonString = JSON.stringify({ email: "test@example.com" });

      const result = await parseJsonAsync(jsonString, AsyncSchema);
      expect(result).toEqual({
        type: "Ok",
        value: { email: "test@example.com" },
      });
    });

    it("should return Err for invalid JSON syntax in async context", async () => {
      const invalidJson = '{"email": }';

      const result = await parseJsonAsync(invalidJson, AsyncSchema);
      expect(result.type).toBe("Err");
      if (isErr(result)) {
        expect(result.error).toContain("Invalid JSON:");
      }
    });

    it("should return Err for async validation failure", async () => {
      const jsonString = JSON.stringify({ email: "blocked@blocked.com" });

      const result = await parseJsonAsync(jsonString, AsyncSchema);
      expect(result.type).toBe("Err");
      if (isErr(result)) {
        expect(result.error).toContain("Validation failed:");
        expect(result.error).toContain("Email is blocked");
      }
    });

    it("should work with sync schemas in async context", async () => {
      const jsonString = JSON.stringify({ value: "test" });

      const result = await parseJsonAsync(jsonString, SimpleSchema);
      expect(result).toEqual({
        type: "Ok",
        value: { value: "test" },
      });
    });
  });

  describe("parseResult()", () => {
    it("should parse valid Ok Result JSON", () => {
      const okResultJson = JSON.stringify({
        type: "Ok",
        value: {
          id: 1,
          name: "John",
          email: "john@example.com",
          age: 30,
        },
      });

      const result = parseResult(okResultJson, UserSchema, z.string());
      expect(result.type).toBe("Ok");
      if (isOk(result)) {
        expect(result.value).toEqual({
          type: "Ok",
          value: {
            id: 1,
            name: "John",
            email: "john@example.com",
            age: 30,
          },
        });
      }
    });

    it("should parse valid Err Result JSON", () => {
      const errResultJson = JSON.stringify({
        type: "Err",
        error: "User not found",
      });

      const result = parseResult(errResultJson, UserSchema, z.string());
      expect(result.type).toBe("Ok");
      if (isOk(result)) {
        expect(result.value).toEqual({
          type: "Err",
          error: "User not found",
        });
      }
    });

    it("should return Err for invalid JSON syntax", () => {
      const invalidJson = '{"type": "Ok", "value":}';

      const result = parseResult(invalidJson, UserSchema, z.string());
      expect(result.type).toBe("Err");
      if (isErr(result)) {
        expect(result.error).toContain("Invalid JSON:");
      }
    });

    it("should return Err for invalid Result structure", () => {
      const invalidStructure = JSON.stringify({
        status: "success", // wrong field name
        data: { id: 1, name: "John" },
      });

      const result = parseResult(invalidStructure, UserSchema, z.string());
      expect(result.type).toBe("Err");
      if (isErr(result)) {
        expect(result.error).toContain("Invalid Result structure");
      }
    });

    it("should return Err for invalid Ok Result structure", () => {
      const invalidOkResult = JSON.stringify({
        type: "Ok",
        // missing value field
      });

      const result = parseResult(invalidOkResult, UserSchema, z.string());
      expect(result.type).toBe("Err");
      if (isErr(result)) {
        expect(result.error).toContain(
          "Invalid Ok Result: missing 'value' field",
        );
      }
    });

    it("should return Err for invalid Err Result structure", () => {
      const invalidErrResult = JSON.stringify({
        type: "Err",
        // missing error field
      });

      const result = parseResult(invalidErrResult, UserSchema, z.string());
      expect(result.type).toBe("Err");
      if (isErr(result)) {
        expect(result.error).toContain(
          "Invalid Err Result: missing 'error' field",
        );
      }
    });

    it("should return Err for invalid Result type", () => {
      const invalidType = JSON.stringify({
        type: "Maybe",
        value: "something",
      });

      const result = parseResult(invalidType, UserSchema, z.string());
      expect(result.type).toBe("Err");
      if (isErr(result)) {
        expect(result.error).toContain("Invalid Result type");
        expect(result.error).toContain("expected 'Ok' or 'Err'");
      }
    });

    it("should validate Ok value against schema", () => {
      const invalidValueResult = JSON.stringify({
        type: "Ok",
        value: {
          id: "not a number",
          name: "John",
          email: "invalid-email",
          age: 30,
        },
      });

      const result = parseResult(invalidValueResult, UserSchema, z.string());
      expect(result.type).toBe("Err");
      if (isErr(result)) {
        expect(result.error).toContain("Invalid Ok value:");
      }
    });

    it("should validate Err value against schema", () => {
      const invalidErrorResult = JSON.stringify({
        type: "Err",
        error: 404, // should be string according to schema
      });

      const result = parseResult(invalidErrorResult, UserSchema, z.string());
      expect(result.type).toBe("Err");
      if (isErr(result)) {
        expect(result.error).toContain("Invalid Err value:");
      }
    });
  });

  describe("parseResultAsync()", () => {
    it("should parse valid async Result JSON", async () => {
      const okResultJson = JSON.stringify({
        type: "Ok",
        value: { email: "test@example.com" },
      });

      const result = await parseResultAsync(
        okResultJson,
        AsyncSchema,
        z.string(),
      );
      expect(result.type).toBe("Ok");
      if (isOk(result)) {
        expect(result.value).toEqual({
          type: "Ok",
          value: { email: "test@example.com" },
        });
      }
    });

    it("should handle async validation errors", async () => {
      const invalidValueResult = JSON.stringify({
        type: "Ok",
        value: { email: "blocked@blocked.com" },
      });

      const result = await parseResultAsync(
        invalidValueResult,
        AsyncSchema,
        z.string(),
      );
      expect(result.type).toBe("Err");
      if (isErr(result)) {
        expect(result.error).toContain("Invalid Ok value:");
        expect(result.error).toContain("Email is blocked");
      }
    });

    it("should work with sync schemas in async context", async () => {
      const okResultJson = JSON.stringify({
        type: "Ok",
        value: { value: "test" },
      });

      const result = await parseResultAsync(
        okResultJson,
        SimpleSchema,
        z.string(),
      );
      expect(result.type).toBe("Ok");
      if (isOk(result)) {
        expect(result.value).toEqual({
          type: "Ok",
          value: { value: "test" },
        });
      }
    });
  });

  describe("Integration Tests", () => {
    it("should work with complex real-world validation scenarios", () => {
      const ApiResponseSchema = z.object({
        data: z.array(UserSchema),
        pagination: z.object({
          page: z.number(),
          totalPages: z.number(),
          totalItems: z.number(),
        }),
        meta: z.object({
          requestId: z.string(),
          timestamp: z.string(),
        }),
      });

      const apiResponseJson = JSON.stringify({
        data: [
          { id: 1, name: "John", email: "john@example.com", age: 30 },
          { id: 2, name: "Jane", email: "jane@example.com", age: 25 },
        ],
        pagination: {
          page: 1,
          totalPages: 5,
          totalItems: 100,
        },
        meta: {
          requestId: "req-123",
          timestamp: "2023-01-01T00:00:00Z",
        },
      });

      const result = parseJson(apiResponseJson, ApiResponseSchema);
      expect(result.type).toBe("Ok");
      if (isOk(result)) {
        expect(result.value.data).toHaveLength(2);
        expect(result.value.pagination.totalItems).toBe(100);
      }
    });

    it("should handle nested Result parsing", () => {
      const NestedResultSchema = resultSchema(
        resultSchema(UserSchema, z.string()),
        z.number(),
      );

      const nestedResultJson = JSON.stringify({
        type: "Ok",
        value: {
          type: "Ok",
          value: {
            id: 1,
            name: "John",
            email: "john@example.com",
            age: 30,
          },
        },
      });

      const result = parseResult(
        nestedResultJson,
        resultSchema(UserSchema, z.string()),
        z.number(),
      );
      expect(result.type).toBe("Ok");
    });

    it("should work with validation pipelines", () => {
      const validateAndTransform = (jsonString: string) => {
        const parseResult = parseJson(jsonString, UserSchema);
        if (isErr(parseResult)) return parseResult;

        const user = parseResult.value;
        const transformResult = validate(
          {
            ...user,
            displayName: `${user.name} (${user.age})`,
            isAdult: user.age >= 18,
          },
          UserSchema.extend({
            displayName: z.string(),
            isAdult: z.boolean(),
          }),
        );

        return transformResult;
      };

      const userJson = JSON.stringify({
        id: 1,
        name: "John",
        email: "john@example.com",
        age: 30,
      });

      const result = validateAndTransform(userJson);
      expect(result.type).toBe("Ok");
      if (isOk(result)) {
        expect(result.value.displayName).toBe("John (30)");
        expect(result.value.isAdult).toBe(true);
      }
    });
  });

  describe("Error Handling Edge Cases", () => {
    it("should handle circular JSON structures gracefully", () => {
      // Note: JSON.stringify would throw, but we test the error handling
      const circularJson = '{"a": {"b": {"a": ...}}}'; // Invalid JSON

      const result = parseJson(circularJson, z.object({ a: z.any() }));
      expect(result.type).toBe("Err");
    });

    it("should handle very large validation errors", () => {
      const LargeSchema = z.object({
        field1: z.string(),
        field2: z.string(),
        field3: z.string(),
        // ... many more fields
        field50: z.string(),
      });

      const invalidLargeObject = {};

      const result = validate(invalidLargeObject, LargeSchema);
      expect(result.type).toBe("Err");
      if (isErr(result)) {
        expect(result.error).toContain("Validation failed:");
        expect(result.error.length).toBeGreaterThan(100); // Large error message
      }
    });

    it("should handle custom Zod error messages", () => {
      const CustomSchema = z
        .object({
          password: z.string().min(8, "Password must be at least 8 characters"),
          confirmPassword: z.string(),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: "Passwords don't match",
          path: ["confirmPassword"],
        });

      const invalidData = {
        password: "123",
        confirmPassword: "456",
      };

      const result = validate(invalidData, CustomSchema);
      expect(result.type).toBe("Err");
      if (isErr(result)) {
        expect(result.error).toContain(
          "Password must be at least 8 characters",
        );
      }
    });
  });

  describe("Type Safety", () => {
    it("should maintain type safety through validation", () => {
      const NumberSchema = z.number();

      const result = validate("not a number", NumberSchema);
      expect(result.type).toBe("Err");

      const successResult = validate(42, NumberSchema);
      if (isOk(successResult)) {
        // TypeScript should know this is a number
        expect(typeof successResult.value).toBe("number");
        expect(successResult.value + 1).toBe(43);
      }
    });

    it("should work with complex type inference", () => {
      type User = z.infer<typeof UserSchema>;

      const validateUser = (data: unknown): Result<User, string> => {
        return validate(data, UserSchema);
      };

      const userData = {
        id: 1,
        name: "John",
        email: "john@example.com",
        age: 30,
      };

      const result = validateUser(userData);
      if (isOk(result)) {
        // TypeScript should infer the correct User type
        expect(result.value.name.toUpperCase()).toBe("JOHN");
        expect(result.value.age > 0).toBe(true);
      }
    });
  });
});
