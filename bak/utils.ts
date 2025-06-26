// result-ts/utils - Core essentials + utility functions
// Provides debugging, side effects, and conversion utilities

// Core Result creation and type guards
export { ok, err, isOk, isErr } from "@/base";

// Core Result utilities  
export { unwrap, unwrapOr } from "@/base";

// Safe function execution
export { handle, handleAsync, handleWith, handleWithAsync } from "@/base";

// Pattern matching
export { match } from "@/base";

// Utility functions - debugging, side effects, conversions
export { inspect, tap, tapErr, fromNullable, toNullable } from "@/base";

// Types
export type { Result, Ok, Err } from "@/base";

/**
 * This entry point includes core essentials + utility functions.
 * 
 * Use for: debugging, logging, side effects, nullable conversions
 * 
 * Key functions: inspect(), tap(), tapErr(), fromNullable(), toNullable()
 * 
 * Other available layers:
 * - `result-ts` → core essentials only
 * - `result-ts/iter` → core + data transformation
 * - `result-ts/batch` → core + array processing
 * - `result-ts/patterns` → core + advanced patterns
 * - `result-ts/schema` → core + validation with Zod
 */
