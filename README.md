# result-ts

A TypeScript-first Result library with a focus on developer experience and with performance in mind.

[![npm version](https://badge.fury.io/js/result-ts.svg)](https://www.npmjs.com/package/result-ts)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/result-ts)](https://bundlephobia.com/package/result-ts)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What is result-ts?

result-ts is a library for handling operations that might fail, inspired by Rust's `Result<T, E>` type. It helps you write safer code by making error handling explicit and composable.

## Installation

```bash
npm install result-ts
```

Optional peer dependency for validation features:

```bash
npm install zod
```

## Basic usage

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

## Safe function execution

```typescript
import { handle, handleAsync } from "result-ts";

// Sync functions
const parseResult = handle(() => JSON.parse(jsonString));

// Async functions  
const apiResult = await handleAsync(async () => {
  const response = await fetch("/api/users");
  return response.json();
});
```

## Working with Results

### Pattern matching

```typescript
import { match } from "result-ts";

const message = match(result, {
  Ok: (value) => `Success: ${value}`,
  Err: (error) => `Failed: ${error}`,
});
```

### Transforming values

```typescript
import { iter } from "result-ts";

// Transform success values
const doubled = iter.map(result, x => x * 2);

// Chain operations
const processed = iter.pipe(
  getUserById(1),
  user => validateUser(user),
  user => saveUser(user)
);
```

### Working with arrays

```typescript
import { batch } from "result-ts";

const results = [ok(1), ok(2), err("failed"), ok(4)];

// Convert array of Results to Result of array
const allOrNothing = batch.all(results);

// Separate successes and errors
const { oks, errors } = batch.partition(results);

// Get statistics
const stats = batch.analyze(results);
console.log(`${stats.okCount}/${stats.total} succeeded`);
```

## Advanced patterns

### Generator-based error handling

```typescript
import { patterns } from "result-ts";

// Rust-style ? operator using generators
const userWithProfile = await patterns.safe(async function* () {
  const user = yield getUser(id);          // Auto-unwraps or early returns
  const profile = yield getProfile(user.id); // Only runs if user succeeded
  return { user, profile };                 // Only runs if both succeed
});
```

### Validation with Zod

```typescript
import { validate, parseJson } from "result-ts/schema";
import { z } from "zod";

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
});

// Validate data
const userResult = validate(data, UserSchema);

// Parse and validate JSON
const parsed = parseJson(jsonString, UserSchema);
```

## API Reference

### Core functions

- **`ok(value)`** - Create a successful Result
- **`err(error)`** - Create an error Result  
- **`isOk(result)`** - Type guard for success
- **`isErr(result)`** - Type guard for error
- **`handle(fn)`** - Safely execute a function
- **`handleAsync(fn)`** - Safely execute an async function
- **`match(result, handlers)`** - Pattern match on Result
- **`unwrap(result)`** - Extract value or throw
- **`unwrapOr(result, defaultValue)`** - Extract value or return default

### Namespaced modules

#### `iter` - Data transformation

- **`map(result, fn)`** - Transform success values
- **`mapAsync(promise, fn)`** - Transform async Results
- **`pipe(result, ...fns)`** - Chain operations
- **`andThen(result, fn)`** - Flat map operation

#### `batch` - Array operations

- **`all(results)`** - Convert `Result[]` to `Result<T[]>`
- **`partition(results)`** - Separate successes and errors
- **`analyze(results)`** - Get statistics in single pass
- **`oks(results)`** - Extract all success values
- **`errs(results)`** - Extract all errors

#### `patterns` - Advanced features

- **`safe(generator)`** - Generator-based error handling
- **`zip(resultA, resultB)`** - Combine two Results
- **`apply(fn, ...results)`** - Applicative pattern

#### `utils` - Helpers

- **`inspect(result, onOk, onErr)`** - Debug Results
- **`tap(result, fn)`** - Side effects on success  
- **`fromNullable(value)`** - Convert nullable to Result

#### `schema` - Validation (requires Zod)

- **`validate(data, schema)`** - Validate with Zod schema
- **`validateAsync(data, schema)`** - Async validation
- **`parseJson(json, schema)`** - Parse and validate JSON

## Tree-shaking and bundle size

result-ts is built with tree-shaking in mind. You can import only what you need:

```typescript
// Minimal import - ~55 bytes
import { ok } from "result-ts";

// Core essentials - ~259 bytes  
import { ok, err, isOk, handle } from "result-ts";

// Modular imports
import { iter } from "result-ts/iter";
import { batch } from "result-ts/batch";
import { validate } from "result-ts/schema";
```

result-ts is optimized for performance with:

- **Single-pass operations** - `batch.analyze()` gets all stats in one iteration
- **Zero-allocation loops** - Manual loops instead of function chains where it matters
- **Early-exit optimizations** - Stop processing as soon as possible

### Bundle size

| Import                                          | Bundle Size | Use Case             |
| ----------------------------------------------- | ----------- | -------------------- |
| `import { ok } from "result-ts"`                | **55 bytes** | Single function      |
| `import { ok, err, isOk } from "result-ts"`     | **107 bytes** | Basic usage          |
| `import { ok, err, handle } from "result-ts"`   | **207 bytes** | Safe execution       |
| `import { iter } from "result-ts/iter"`         | **143 bytes** | Data transformation  |
| `import { batch } from "result-ts/batch"`       | **189 bytes** | Array processing     |
| `import { patterns } from "result-ts/patterns"` | **325 bytes** | Advanced patterns    |
| `import { validate } from "result-ts/schema"`   | **245 bytes** | Validation (+ Zod)   |

The modular architecture means you only pay for what you use.

## Why result-ts?

- **Type-safe error handling** - Make errors explicit and handled
- **Composable operations** - Chain and transform Results cleanly  
- **Performance-focused** - Optimized for real-world usage
- **Tree-shakable** - Only bundle what you use
- **TypeScript-first** - Excellent IntelliSense and type inference
- **Rust-inspired** - Familiar patterns for Rust developers

## License

MIT
