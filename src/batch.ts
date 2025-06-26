// result-ts/batch - Core essentials + batch operations
// Provides array processing and bulk Result operations

// Re-export all core essentials (11 functions)
export * from "./core";

// Add batch operations - process arrays of Results efficiently
export { all, allAsync, allSettledAsync, oks, errs, partition, partitionWith, analyze, findFirst, reduce, first } from "@/base";

/**
 * This entry point includes core essentials + batch operations.
 * 
 * Use for: processing arrays of Results, bulk operations, statistics
 * 
 * Key functions: all(), partition(), analyze(), oks(), allAsync()
 * 
 * Other available layers:
 * - `result-ts` → core essentials only
 * - `result-ts/iter` → core + data transformation
 * - `result-ts/utils` → core + debugging utilities
 * - `result-ts/patterns` → core + advanced patterns
 * - `result-ts/schema` → core + validation with Zod
 */
