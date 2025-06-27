# Result TS

> The **Performance-First** Result Library for TypeScript

[![npm version](https://badge.fury.io/js/result-ts.svg)](https://www.npmjs.com/package/result-ts)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/result-ts)](https://bundlephobia.com/package/result-ts)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Why Result TS?** The only Result library built for **performance** without sacrificing **developer experience**.

## ✨ Features

- 🚀 **Performance-First** - Single-pass operations, zero-allocation loops, early-exit optimizations
- 🎯 **Ergonomic Design** - User journey organization from beginner to advanced
- 🔗 **Co-located Async** - `handle`/`handleAsync` right next to each other
- 🌳 **Tree-Shakable** - Import only what you need (starts at **55 bytes**!)
- 🧩 **Modular Architecture** - Organized namespaces: `iter`, `batch`, `patterns`, `utils`
- ✅ **Optional Zod Integration** - Runtime validation when you need it
- 🦀 **Rust-Inspired** - Familiar patterns, TypeScript-native implementation

## 📦 Installation

```bash
# Core library (no dependencies)
npm install result-ts

# Optional: For validation features
npm install zod
```

## 🚀 Quick Start

```typescript
import { ok, err, isOk, handle, iter, batch } from "result-ts";

// Basic usage
function divide(a: number, b: number): Result<number, string> {
  return b === 0 ? err("Division by zero") : ok(a / b);
}

const result = divide(10, 2);
if (isOk(result)) {
  console.log(result.value); // 5 - TypeScript knows this is a number
}

// Safe function execution
const jsonResult = handle(() => JSON.parse(data));
const apiResult = await handleAsync(() =>
  fetch("/api/users").then((r) => r.json()),
);

// High-performance chaining
const transformed = iter.pipe(
  getUserById(1),
  (user) => getProfile(user.id),
  (profile) => enhanceProfile(profile),
);

// Efficient batch operations
const stats = batch.analyze(results); // Single-pass analysis
console.log(`${stats.okCount}/${stats.total} succeeded`);
```

## 🎯 Simple Design

**Beginner (Day 1)** - Core essentials:

```typescript
import { ok, err, isOk, handle } from "result-ts";
```

**Intermediate** - Data transformations:

```typescript
import { iter, batch } from "result-ts";
iter.map(result, transform);
batch.partition(results);
```

**Advanced** - Power features:

```typescript
import { advanced } from "result-ts";
advanced.safe(function* () {
  const user = yield getUser(id);
  const profile = yield getProfile(user.id);
  return { user, profile };
});
```

## ⚡ Performance Advantages

### Single-Pass Operations

```typescript
// ❌ Other libraries: Multiple iterations
const successes = results.filter(isOk).map((r) => r.value); // 2 passes
const errors = results.filter(isErr).map((r) => r.error); // 2 more passes
const hasErrors = errors.length > 0; // Extra work

// ✅ Result TS: Single pass
const stats = batch.analyze(results); // 1 pass gets everything
console.log(`Success rate: ${stats.okCount}/${stats.total}`);
console.log(`Has errors: ${stats.hasErrors}`);
```

### Zero-Allocation Loops

```typescript
// ❌ Other libraries: Function allocations
results.filter((r) => r.type === "Ok").map((r) => r.value); // Creates 2 functions

// ✅ Result TS: Manual loops, faster execution
batch.oks(results); // Zero function allocation
```

### Early-Exit Optimizations

```typescript
// Find first success and first error with early exit
const { firstOk, firstError } = batch.findFirst(results);
```

## 🏗️ API Overview

### 📊 Bundle Size Comparison

| Import Strategy                                            | Bundle Size   | Use Case            |
| ---------------------------------------------------------- | ------------- | ------------------- |
| `import { ok } from 'result-ts'`                           | **55 bytes**  | Single function     |
| `import { ok, err, isOk } from 'result-ts'`                | **107 bytes** | Basic usage         |
| `import { ok, err, handle } from 'result-ts'`              | **207 bytes** | Safe execution      |
| `import { ok, err, handle, isOk, isErr } from 'result-ts'` | **259 bytes** | Core essentials     |
| `import { map, pipe } from 'result-ts/iter'`               | **143 bytes** | Data transformation |
| `import { all, partition } from 'result-ts/batch'`         | **189 bytes** | Array processing    |
| `import { tap, inspect } from 'result-ts/utils'`           | **131 bytes** | Debugging helpers   |
| `import { safe, zip } from 'result-ts/patterns'`           | **325 bytes** | Advanced patterns   |
| `import { validate } from 'result-ts/schema'`              | **245 bytes** | Validation (+ Zod)  |

### Layered Architecture Bundle Sizes

| Layer        | Functions                   | Bundle Size   | Key Features               |
| ------------ | --------------------------- | ------------- | -------------------------- |
| **Core**     | Essential Result operations | **259 bytes** | ok, err, handle, match     |
| **Iter**     | Core + data transformation  | **272 bytes** | map, pipe, andThen         |
| **Utils**    | Core + debugging utilities  | **285 bytes** | inspect, tap, fromNullable |
| **Schema**   | Core + validation with Zod  | **395 bytes** | validate, parseJson        |
| **Batch**    | Core + array processing     | **455 bytes** | all, partition, analyze    |
| **Patterns** | Core + advanced patterns    | **658 bytes** | safe, zip, apply           |

> **Tree-Shaking Excellence:** Our distributed architecture achieves incredible bundle efficiency. Single function imports start at just **55 bytes**!

### Core (Root Level)

```typescript
// Essential functions everyone needs
ok, err, isOk, isErr, unwrap, unwrapOr;
handle, handleAsync, handleWith, handleWithAsync;
match;
```

### `iter` - Iteration Operations / Data Transformation

```typescript
// Transform Results through pipelines
iter.map(result, fn);
iter.mapAsync(promise, fn);
iter.pipe(result, op1, op2, op3); // Performance-optimized chaining
iter.andThen(result, fn);
```

### `batch` - Array Operations

```typescript
// High-performance batch operations
batch.all(results); // Convert Result[] to Result<T[]>
batch.analyze(results); // Single-pass statistics
batch.findFirst(results); // Early-exit first success/error
batch.partitionWith(results); // Enhanced partition with metadata
```

### `patterns` - Advanced Features

```typescript
// Specialized functionality
patterns.safe(generator); // Rust-style ? operator with generators
patterns.zip(resultA, resultB); // Combine two Results
patterns.apply(fn, value); // Applicative pattern
```

### `utils` - Helpers

```typescript
// Development and conversion utilities
utils.inspect(result, onOk, onErr); // Debug Results
utils.fromNullable(value); // Convert nullable to Result
utils.tap(result, fn); // Side effects on success
```

## 🔧 Validation (Optional)

```bash
npm install zod  # Required for validation features
```

```typescript
import { validate, parseJson, resultSchema } from "result-ts/schema";

// Core validation
const userResult = validate(data, userSchema);
const asyncResult = await validateAsync(data, userSchema);

// Schema builders
const userResultSchema = resultSchema(userSchema, z.string());

// JSON parsing with validation
const parsed = parseJson(jsonString, userSchema);
```

## 📚 Examples

### Error Handling Patterns

```typescript
const processUser = (id: number) =>
  iter.pipe(
    getUserById(id),
    (user) => validateUser(user),
    (user) => enrichUserData(user),
    (user) => saveUser(user),
  );

// Pattern matching
const message = match(result, {
  Ok: (value) => `Success: ${value}`,
  Err: (error) => `Failed: ${error}`,
});
```

### Async Operations

```typescript
// Handle async operations safely
const apiResult = await handleAsync(async () => {
  const response = await fetch("/api/data");
  return response.json();
});

// Transform async Results
const processed = await iter.mapAsync(
  fetchUser(id),
  async (user) => await enrichUser(user),
);
```

### Batch Processing

```typescript
const results = await Promise.all([fetchUser(1), fetchUser(2), fetchUser(3)]);

// Get comprehensive stats in one pass
const analysis = batch.analyze(results);
console.log(`Loaded ${analysis.okCount} users, ${analysis.errorCount} failed`);

// Extract successes efficiently
const users = batch.oks(results);
const errors = batch.errs(results);
```

## 📖 Documentation

<!--

- [API Reference](https://your-username.github.io/result-ts/)
- [Performance Guide](./docs/performance.md)
- [Migration from other libraries](./docs/migration.md)
- [Advanced Patterns](./docs/patterns.md)

## 🤝 Contributing

Contributions welcome! Please read our [Contributing Guide](./CONTRIBUTING.md).
-->

## 📄 License

MIT © [Gregory Laurent](https://github.com/your-username)

---

**Built for developers who want both performance and great DX** 🚀
