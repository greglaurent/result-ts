// result-ts/iter - Core essentials + iteration operations
// Provides data transformation and chaining capabilities

// Core Result creation and type guards
export { ok, err, isOk, isErr } from "@/base";

// Core Result utilities  
export { unwrap, unwrapOr } from "@/base";

// Safe function execution
export { handle, handleAsync, handleWith, handleWithAsync } from "@/base";

// Pattern matching
export { match } from "@/base";

// Iteration operations - transform and chain Results
export { map, mapAsync, mapErr, mapErrAsync, andThen, andThenAsync, pipe } from "@/base";

// Types
export type { Result, Ok, Err } from "@/base";

/**
 * This entry point includes core essentials + iteration operations.
 * 
 * Use for: data transformation, chaining, functional composition
 * 
 * Key functions: map(), pipe(), andThen(), mapAsync()
 * 
 * Other available layers:
 * - `result-ts` → core essentials only
 * - `result-ts/batch` → core + array processing
 * - `result-ts/utils` → core + debugging utilities
 * - `result-ts/patterns` → core + advanced patterns
 * - `result-ts/schema` → core + validation with Zod
 */
