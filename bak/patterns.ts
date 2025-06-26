// result-ts/patterns - Core essentials + advanced functional patterns
// Provides generator-based error handling and applicative patterns

// Re-export all core essentials (11 functions)
export * from "./core";

// Add advanced patterns - generators, applicative functors, composition
export { safe, safeAsync, yieldFn, zip, apply } from "@/base";

/**
 * This entry point includes core essentials + advanced functional patterns.
 * 
 * Use for: generator-based error handling, applicative patterns, advanced composition
 * 
 * Key functions: safe(), safeAsync(), zip(), apply(), yieldFn()
 * 
 * Advanced features:
 * - safe() → Rust-style ? operator with generators
 * - zip() → combine multiple Results into tuples
 * - apply() → applicative functor patterns
 * 
 * Other available layers:
 * - `result-ts` → core essentials only
 * - `result-ts/iter` → core + data transformation
 * - `result-ts/batch` → core + array processing
 * - `result-ts/utils` → core + debugging utilities
 * - `result-ts/schema` → core + validation with Zod
 */
