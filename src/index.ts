// Main entry point - Core essentials only for optimal tree-shaking
// Users get the minimum viable Result library by default

// Re-export all core essentials (11 functions)
export * from "@/core";

/**
 * This is the minimal Result library entry point.
 *
 * For additional functionality, use layered imports:
 * - `result-ts/iter` → adds data transformation operations
 * - `result-ts/batch` → adds array processing operations
 * - `result-ts/utils` → adds debugging and conversion utilities
 * - `result-ts/patterns` → adds advanced functional patterns
 * - `result-ts/schema` → adds runtime validation with Zod
 */
