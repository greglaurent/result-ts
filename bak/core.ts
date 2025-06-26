// Internal core module - not exposed to users
// Contains the minimal essentials that every layer includes
// All layer files re-export from this for consistency

// Core Result creation and type guards
export { ok, err, isOk, isErr } from "@/base";

// Core Result utilities  
export { unwrap, unwrapOr } from "@/base";

// Safe function execution
export { handle, handleAsync, handleWith, handleWithAsync } from "@/base";

// Pattern matching
export { match } from "@/base";

// Types
export type { Result, Ok, Err } from "@/base";

/**
 * This module defines the core essentials (11 functions) included in every layer.
 * 
 * Layer files re-export from this module plus their specific functions:
 * - index.ts → just core (this file)
 * - iter.ts → core + iteration functions
 * - batch.ts → core + batch functions
 * - utils.ts → core + utility functions
 * - patterns.ts → core + advanced patterns
 * - schema.ts → core + validation functions
 * 
 * Benefits:
 * - Single source of truth for core functions
 * - Easy maintenance - update core in one place
 * - Still tree-shakable via individual function imports
 */
