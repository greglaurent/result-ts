# result-ts

<center>

[![npm version](https://badge.fury.io/js/result-ts.svg)](https://www.npmjs.com/package/result-ts)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/result-ts)](https://bundlephobia.com/package/result-ts)

</center>

**This is an pre-release library.**

The performance-first Result library for TypeScript with comprehensive utilities
and zero overhead.

## What is result-ts?

Rust-style error handling to TypeScript with a focus on **performance**, **type safety**,
and **developer experience**. It provides a comprehensive toolkit for handling operations
that might fail, making error handling explicit and composable.

```typescript
import { ok, err, isOk, handle, match } from "result-ts";

// Transform error-prone operations into safe, composable code
const userResult = handle(() => JSON.parse(userJson));

const message = match(userResult, {
  Ok: (user) => `Welcome, ${user.name}!`,
  Err: (error) => `Invalid data: ${error.message}`,
});
```

## Key Features

- **🚀 Performance-First**: Manual loops, single-pass operations, early-exit optimizations
- **📦 Tree-Shakable**: Modular architecture - import only what you need
- **🛡️ Type-Safe**: Full TypeScript support with excellent type inference
- **🔗 Composable**: Chain operations safely without nested try-catch blocks
- **⚡ Zero-Overhead**: Minimal runtime cost, maximum developer productivity
- **🧩 Comprehensive**: 6 specialized modules covering every use case

## Installation

```bash
npm install result-ts
```

For validation features:

```bash
npm install result-ts zod
```

## Quick Start

### Basic Usage

```typescript
import { ok, err, isOk, isErr } from "result-ts";

// Creating Results
const success = ok("Hello world");
const failure = err("Something went wrong");

// Type-safe checking
if (isOk(success)) {
  console.log(success.value); // TypeScript knows this is string
}

if (isErr(failure)) {
  console.log(failure.error); // TypeScript knows this is string
}
```

### Safe Function Execution

```typescript
import { handle, handleAsync } from "result-ts";

// Synchronous operations
const parseResult = handle(() => JSON.parse(jsonString));

if (isOk(parseResult)) {
  console.log("Parsed:", parseResult.value);
} else {
  console.error("Parse failed:", parseResult.error.message);
}

// Asynchronous operations
const apiResult = await handleAsync(async () => {

  const response = await fetch("/api/users");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  return response.json();
});
```

### Pattern Matching

```typescript
import { match } from "result-ts";

const message = match(result, {
  Ok: (value) => `Success: ${value}`,
  Err: (error) => `Failed: ${error.message}`,
});
```

## Module Guide

### Core (`result-ts`)

Essential Result operations for basic error handling.

```typescript
import { ok, err, isOk, handle, match, unwrap, unwrapOr } from "result-ts";

// Core creation and checking
const result = ok(42);
const error = err("failed");

// Safe execution
const parsed = handle(() => JSON.parse(jsonString));

// Pattern matching
const message = match(parsed, {
  Ok: (data) => `Parsed: ${Object.keys(data).length} fields`,
  Err: (error) => `Parse error: ${error.message}`,
});

// Value extraction
const value = unwrapOr(result, 0); // 42 or 0 if error
```

**When to use**: Basic Result creation, safe function execution, simple error handling.

### Data Transformation (`result-ts/iter`)

Transform and chain Result operations functionally.

```typescript
import { map, andThen, mapAsync, mapErr } from "result-ts/iter";

// Transform success values
const doubled = map(parseNumber("21"), (x) => x * 2); // Ok(42)

// Chain operations that return Results
const validated = andThen(parseNumber("21"), (x) =>
  x > 0 ? ok(x) : err("Must be positive"),
);

// Handle async transformations
const enriched = await mapAsync(fetchUser(id), async (user) => ({
  ...user,
  posts: await fetchUserPosts(user.id),
}));

// Transform errors
const apiError = mapErr(result, (error) => ({
  code: 500,
  message: error.message,
  timestamp: Date.now(),
}));
```

**When to use**: Data pipelines, functional composition, transforming values or errors.

### Array Processing (`result-ts/batch`)

Process arrays of Results efficiently with single-pass algorithms.

```typescript
import { all, partition, analyze, oks, allAsync } from "result-ts/batch";

// Convert array of Results to Result of array
const validationResults = users.map(validateUser);
const allValid = all(validationResults); // Ok([users]) or first error

// Separate successes and errors
const { oks: validUsers, errors } = partition(validationResults);

// Get statistics without extracting values (faster)
const stats = analyze(validationResults);
console.log(`${stats.okCount}/${stats.total} users valid`);

// Handle async operations
const apiCalls = userIds.map((id) => fetchUser(id));
const results = await allAsync(apiCalls); // Fail-fast on first error
```

**When to use**: Bulk validation, parallel async operations, collecting statistics.

### Debugging & Utilities (`result-ts/utils`)

Side effects, debugging, and nullable API integration.

```typescript
import {
  inspect,
  tap,
  tapErr,
  fromNullable,
  toNullable,
} from "result-ts/utils";

// Debug Result flows
const debugged = inspect(
  processPayment(amount),
  (payment) => console.log(`✅ Payment ${payment.id} processed`),
  (error) => console.error(`❌ Payment failed: ${error.message}`),
);

// Side effects on success
const cached = tap(validateUser(data), (user) => cache.set(user.id, user));

// Convert from nullable APIs
const userResult = fromNullable(
  users.find((u) => u.id === targetId),
  "User not found",
);

// Convert to nullable for optional chaining
const email = toNullable(getUserEmail(id))?.toLowerCase();
```

**When to use**: Debugging workflows, logging, caching, integrating with nullable
APIs.

### Advanced Patterns (`result-ts/patterns`)

Generator-based error handling and advanced functional patterns.

```typescript
import { safe, zip, apply, chain } from "result-ts/patterns";

// Rust-style ? operator using generators
const userWithProfile = await safe(async function* () {
  const user = yield await fetchUser(id); // Auto-unwraps or early returns
  const profile = yield await fetchProfile(user.id); // Only runs if user succeeded
  const settings = yield await fetchSettings(profile.id); // Chains safely
  return { user, profile, settings }; // Only runs if all succeed
});

// Combine multiple Results
const combined = zip(validateEmail(email), validatePhone(phone)); // Result<[string, string], ValidationError>

// Applicative patterns
const createUser = ok((name: string) => (email: string) => ({ name, email }));
const result = apply(apply(createUser, nameResult), emailResult);

// Fluent chaining (alternative to generators)
const processed = chain(getUserById(1))
  .then((user) => getProfile(user.id))
  .then((profile) => enrichProfile(profile))
  .run();
```

**When to use**: Complex error handling flows, combining multiple Results, functional
composition.

### Schema Validation (`result-ts/schema`)

Runtime validation with Zod integration.

```typescript
import { validate, parseJson, validateAsync } from "result-ts/schema";
import { z } from "zod";

const UserSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(0).max(150),
});

// Validate data
const userResult = validate(requestBody, UserSchema);
if (isOk(userResult)) {
  // userResult.value is fully typed as User
  console.log(`User: ${userResult.value.name}`);
}

// Parse and validate JSON in one step
const configResult = parseJson(configFile, ConfigSchema);

// Async validation with custom rules
const UserRegistrationSchema = z.object({
  username: z.string().refine(async (username) => {
    return !(await checkUsernameExists(username));
  }, "Username already taken"),
});

const registrationResult = await validateAsync(
  userData,
  UserRegistrationSchema,
);

// Custom error mapping
const result = validateWith(formData, FormSchema, (zodError) => ({
  type: "VALIDATION_ERROR",
  fields: zodError.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  })),
}));
```

**When to use**: API validation, form processing, configuration parsing, type-safe
data validation.

## Real-World Examples

### API Request Handling

```typescript
import { handleAsync, match } from "result-ts";
import { validate } from "result-ts/schema";
import { z } from "zod";

const CreatePostSchema = z.object({
  title: z.string().min(5),
  content: z.string().min(10),
  tags: z.array(z.string()).optional(),
});

app.post("/posts", async (req, res) => {
  const result = await handleAsync(async () => {
    // Validate request body
    const validationResult = validate(req.body, CreatePostSchema);
    if (isErr(validationResult)) {
      throw new Error(`Validation failed: ${validationResult.error}`);
    }

    // Create post
    const post = await createPost(validationResult.value);
    return post;
  });

  const response = match(result, {
    Ok: (post) => res.json({ success: true, post }),
    Err: (error) =>
      res.status(400).json({
        success: false,
        error: error.message,
      }),
  });
});
```

### Batch User Processing

```typescript
import { all, partition, analyze } from "result-ts/batch";
import { safe } from "result-ts/patterns";

const processUserBatch = async (users: UserData[]) => {
  // Validate all users
  const validationResults = users.map((user) => validate(user, UserSchema));
  const stats = analyze(validationResults);

  console.log(`Validation: ${stats.okCount}/${stats.total} users valid`);

  if (stats.hasErrors) {
    const { oks: validUsers, errors } = partition(validationResults);
    console.warn(`Skipping ${errors.length} invalid users`);

    // Process only valid users
    const processedResults = await Promise.all(
      validUsers.map(async (user) => {
        return await safe(async function* () {
          const created = yield await createUser(user);
          const profile = yield await createProfile(created.id);
          const notification = yield await sendWelcomeEmail(created.email);
          return { user: created, profile, notification };
        });
      }),
    );

    const finalStats = analyze(processedResults);
    return {
      processed: finalStats.okCount,
      failed: finalStats.errorCount,
      errors: finalStats.hasErrors ? errs(processedResults) : [],
    };
  }

  // All users valid - process them all
  return all(validationResults).then(async (validUsers) => {
    // Batch process valid users...
  });
};
```

### Configuration Loading

```typescript
import { parseJson, match } from "result-ts/schema";
import { z } from "zod";

const ConfigSchema = z.object({
  database: z.object({
    host: z.string(),
    port: z.number().min(1).max(65535),
    name: z.string(),
  }),
  redis: z.object({
    url: z.string().url(),
  }),
  features: z.object({
    enableCaching: z.boolean(),
    maxRetries: z.number().min(0),
  }),
});

const loadConfig = (configPath: string) => {
  const configResult = handle(() =>
    fs.readFileSync(configPath, "utf8"),
  ).andThen((content) => parseJson(content, ConfigSchema));

  return match(configResult, {
    Ok: (config) => {
      console.log(`✅ Config loaded from ${configPath}`);
      return config;
    },
    Err: (error) => {
      console.error(`❌ Failed to load config: ${error}`);
      process.exit(1);
    },
  });
};
```

## Performance

result-ts is built for performance:

- **Zero-allocation loops**: Manual iteration instead of functional chains where it matters
- **Single-pass operations**: `analyze()` gets all statistics in one iteration
- **Early-exit optimizations**: `all()` stops processing on first error
- **Tree-shaking friendly**: Import only the functions you need
- **Minimal overhead**: Results are simple objects with no prototype chain

### Benchmarks

| Operation                | result-ts   | Functional Equivalent      | Performance |
| ------------------------ | ----------- | -------------------------- | ----------- |
| `analyze(10k results)`   | Single pass | Multiple filter/map calls  | ~3x faster  |
| `partition(10k results)` | Manual loop | `filter().map()` chains    | ~2x faster  |
| `all(1k results)`        | Early exit  | `Promise.all()` equivalent | ~2x faster  |

## Type Safety

result-ts provides excellent TypeScript integration:

```typescript
// Type inference works automatically
const userResult: Result<User, ValidationError> = validateUser(data);

if (isOk(userResult)) {
  // TypeScript knows userResult.value is User
  console.log(userResult.value.email.toLowerCase());
}

if (isErr(userResult)) {
  // TypeScript knows userResult.error is ValidationError
  console.log(userResult.error.field, userResult.error.message);
}

// Generic constraints ensure meaningful error types
function processApiResult<T>(
  result: Result<T, ApiError>, // Error must have structure
): string {
  return match(result, {
    Ok: (data) => `Success: ${JSON.stringify(data)}`,
    Err: (error) => `API Error ${error.status}: ${error.message}`, // Type-safe access
  });
}
```

## Migration

### From throwing functions

```typescript
// Before
try {
  const user = JSON.parse(userJson);
  const profile = await fetchProfile(user.id);
  return { user, profile };
} catch (error) {
  console.error("Failed:", error.message);
  return null;
}

// After
import { handleAsync, safe } from "result-ts";

const result = await safe(async function* () {
  const user = yield handleAsync(() => JSON.parse(userJson));
  const profile = yield await fetchProfile(user.id);
  return { user, profile };
});

return match(result, {
  Ok: (data) => data,
  Err: (error) => {
    console.error("Failed:", error.message);
    return null;
  },
});
```

### From Promise.all patterns

```typescript
// Before
try {
  const users = await Promise.all(userIds.map(fetchUser));
  return users;
} catch (error) {
  console.error("One user failed, all failed:", error);
  return [];
}

// After
import { allAsync, allSettledAsync } from "result-ts/batch";

// Fail-fast (like Promise.all)
const result = await allAsync(userIds.map(fetchUser));

// Or resilient processing
const { oks: users, errors } = await allSettledAsync(userIds.map(fetchUser));
console.log(`Loaded ${users.length} users, ${errors.length} failed`);
return users;
```

## Comparison

### vs. Option/Maybe types

```typescript
// result-ts preserves error information
const result = parseNumber("abc"); // Result<number, string>

// vs. Option<number> - loses information about why it failed

match(result, {
  Ok: (num) => `Got ${num}`,
  Err: (error) => `Parse failed: ${error}`, // Still know why it failed
});
```

### vs. fp-ts/Either

```typescript
// More ergonomic API
import { safe } from "result-ts/patterns";

const user = await safe(async function* () {
  const data = yield fetchUser(id);
  const profile = yield fetchProfile(data.id);
  return { data, profile };
});

// vs. fp-ts chain syntax
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";

const user = await pipe(
  fetchUser(id),
  TE.chain((data) =>
    pipe(
      fetchProfile(data.id),
      TE.map((profile) => ({ data, profile })),
    ),
  ),
)();
```

### vs. throwing exceptions

- **Explicit**: Errors are part of the type system
- **Composable**: Chain operations without try-catch nesting
- **Performance**: No stack unwinding overhead
- **Exhaustive**: TypeScript ensures you handle both cases

## Progressive Enhancement Architecture & Bundle Sizes

Start with core essentials and add layers as needed:

| Layer                                          | Functions              | Bundle Size       | Use Case                              |
| ---------------------------------------------- | ---------------------- | ----------------- | ------------------------------------- |
| **Core** (`result-ts`)                         | 11 essential functions | ~55-331 bytes     | Basic Result handling, safe execution |
| **+ Data Transform** (`result-ts/iter`)        | +4 functions           | ~808 bytes total  | Value mapping, operation chaining     |
| **+ Array Processing** (`result-ts/batch`)     | +10 functions          | ~965 bytes total  | Bulk operations, statistics           |
| **+ Debugging** (`result-ts/utils`)            | +5 functions           | Similar to core   | Side effects, nullable conversion     |
| **+ Advanced Patterns** (`result-ts/patterns`) | +7 functions           | ~1004 bytes total | Generators, applicative patterns      |
| **+ Validation** (`result-ts/schema`)          | +12 functions          | ~556 bytes\*      | Runtime validation with Zod           |

\*Excludes Zod dependency (~13KB gzipped)

### Bundle Size Examples

```typescript
// Minimal - 55 bytes
import { ok } from "result-ts";

// Basic usage - 107 bytes
import { ok, err, isOk } from "result-ts";

// Safe execution - 331 bytes
import { ok, err, handle, match } from "result-ts";

// Data transformation - 808 bytes
import { ok, err, handle, match } from "result-ts";
import { map, andThen } from "result-ts/iter";

// Array processing - 965 bytes
import { ok, err, handle, match } from "result-ts";
import { map, andThen } from "result-ts/iter";
import { all, partition } from "result-ts/batch";

// Advanced patterns - 1004 bytes
import { ok, err, handle, match } from "result-ts";
import { map, andThen } from "result-ts/iter";
import { all, partition } from "result-ts/batch";
import { safe, zip } from "result-ts/patterns";
```

## FAQ

**Q: When should I use result-ts vs exceptions?**

A: Use result-ts for expected errors (validation, network calls, parsing) and exceptions
for unexpected errors (programming bugs, out-of-memory).

**Q: How does this affect bundle size?**

A: result-ts is designed for tree-shaking. Import only what you need -
basic usage adds ~120 bytes.

**Q: Can I mix result-ts with async/await?**

A: Yes! Use `handleAsync()` to convert Promise-based APIs and
`safe()` for complex async flows.

**Q: Do I need to use all modules?**

A: No. Start with core (`result-ts`) and add modules as needed.
Each module includes all previous functionality.

**Q: How does performance compare to try-catch?**

A: Similar or better for success cases, significantly better for
error cases (no stack unwinding).

## Contributing

This is a solo project for now but could be open to contribution. Reach out if you
are interested. Contribution documents and publishing are in the works once the
API stabilizes.

## License

MIT © [Gregory Laurent](https://github.com/greglaurent)

---

**Built with ❤️ for developers who value explicit error handling and type safety.**
