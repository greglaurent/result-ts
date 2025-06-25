# Result TS

> The Type-Safe Result Library for TypeScript

[![npm version](https://badge.fury.io/js/result-ts.svg)](https://www.npmjs.com/package/result-ts)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![Documentation](https://img.shields.io/badge/docs-TypeDoc-blue.svg)](https://your-username.github.io/result-ts/)

## Installation

```bash

npm install result-ts

# Optional: For validation features
npm install zod

```

## Features

- 🎯 **Type-Safe Error Handling** - No more `try/catch` soup
- 🧩 **Modular Architecture** - Import only what you need  
- ✅ **Zod Integration** - Optional runtime validation
- 🌳 **Tree-Shakable** - Minimal bundle impact
- 🦀 **Rust-Inspired** - Familiar patterns for Rust developers

## Quick Start

```typescript
import { Result, ok, err, isOk } from 'result-ts';

function divide(a: number, b: number): Result<number, string> {
  return b === 0 ? err("Division by zero") : ok(a / b);
}

const result = divide(10, 2);
if (isOk(result)) {
  console.log(result.value); // 5 - TypeScript sees this is a number.
}
```

## Bundle Sizes

| Import Strategy | Bundle Size (min+gzip) | Dependencies | What's Included |
|----------------|------------------------|--------------|-----------------|
| `import { ok, err, isOk } from 'result-ts/core'` | **~1.2KB** | None | Basic Result operations |
| `import { ok, err, map, andThen } from 'result-ts/core'` | **~2.1KB** | None | Core + functional operations |
| `import { Result } from 'result-ts/core'` | **~3.4KB** | None | Full core factory (no validation) |
| `import { ok, err, parseJson } from 'result-ts'` | **~15.8KB** | Zod | Core + JSON validation only |
| `import { Result } from 'result-ts'` | **~16.2KB** | Zod | Full factory + validation |

### Comparison with Alternatives

| Library | Bundle Size | Modular | Validation |
|---------|-------------|---------|------------|
| **result-ts** (core) | **1.2KB** | ✅ | Optional |
| **result-ts** (full) | **16.2KB** | ✅ | ✅ Zod |

<!--

## Bundle Sizes

| Import Strategy | Bundle Size (min+gzip) | Dependencies | What's Included |
|----------------|------------------------|--------------|-----------------|
| `import { ok, err, isOk } from 'result-ts/core'` | **~1.2KB** | None | Basic Result operations |
| `import { ok, err, map, andThen } from 'result-ts/core'` | **~2.1KB** | None | Core + functional operations |
| `import { Result } from 'result-ts/core'` | **~3.4KB** | None | Full core factory (no validation) |
| `import { ok, err, parseJson } from 'result-ts'` | **~15.8KB** | Zod | Core + JSON validation only |
| `import { Result } from 'result-ts'` | **~16.2KB** | Zod | Full factory + validation |

### Comparison with Alternatives

| Library | Bundle Size | Modular | Validation |
|---------|-------------|---------|------------|
| **result-ts** (core) | **1.2KB** | ✅ | Optional |
| **result-ts** (full) | **16.2KB** | ✅ | ✅ Zod |
| neverthrow | 4.1KB | ❌ | ❌ |
| ts-results | 3.8KB | ❌ | ❌ |
| @trylonai/ts-result | 5.2KB | ❌ | ❌ |
| oxide.ts | 2.9KB | ❌ | ❌ |
-->

### Tree-Shaking Benefits

```typescript
// Lightweight - only imports what you need
import { ok, err, map } from 'result-ts/core';     // ~1.8KB

// vs importing everything
import { Result } from 'neverthrow';                // ~4.1KB (no choice)
```

## API Documentation

📚 Full API Documentation

### Core Functions

ok(value) - Create success Result
err(error) - Create error Result
map(result, fn) - Transform success value

### Examples

Basic Usage
[Link to examples/basic.md]

With Zod Validation
[Link to examples/zod.md]

Pattern Matching
[Link to examples/patterns.md]

## License

MIT © Gregory Laurent
