// Re-export all individual functions from base for convenience
export {
  // Core essentials
  ok,
  err,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
  handle,
  handleAsync,
  handleWith,
  handleWithAsync,
  match,

  // Iteration operations  
  map,
  mapAsync,
  mapErr,
  mapErrAsync,
  andThen,
  andThenAsync,
  pipe,

  // Batch operations
  all,
  allAsync,
  allSettledAsync,
  oks,
  errs,
  partition,
  partitionWith,
  analyze,
  findFirst,
  reduce,
  first,

  // Advanced features
  safe,
  safeAsync,
  yieldFn,
  zip,
  apply,

  // Utilities
  inspect,
  tap,
  tapErr,
  fromNullable,
  toNullable,

  // Factory function for backward compatibility
  createBaseResult,

  // Types
  type Result,
  type Ok,
  type Err,
  type OK,
  type ERR,
} from "@/base";

// Create grouped objects for convenience (zero overhead - just references)
import {
  map,
  mapAsync,
  mapErr,
  mapErrAsync,
  andThen,
  andThenAsync,
  pipe,
  all,
  allAsync,
  allSettledAsync,
  oks,
  errs,
  partition,
  partitionWith,
  analyze,
  findFirst,
  reduce,
  first,
  safe,
  safeAsync,
  yieldFn,
  zip,
  apply,
  inspect,
  tap,
  tapErr,
  fromNullable,
  toNullable,
} from "@/base";

/**
 * Iteration operations for transforming and chaining Results.
 * Contains functions like map, andThen, and pipe for functional composition.
 */
export const iter = {
  map,
  mapAsync,
  mapErr,
  mapErrAsync,
  andThen,
  andThenAsync,
  pipe,
};

/**
 * Batch operations for working with arrays of Results.
 * Contains functions like all, partition, and analyze for bulk processing.
 */
export const batch = {
  all,
  allAsync,
  allSettledAsync,
  oks,
  errs,
  partition,
  partitionWith,
  analyze,
  findFirst,
  reduce,
  first,
};

/**
 * Advanced Result operations including generators and applicative patterns.
 * Contains powerful features like safe generators and functional composition.
 */
export const advanced = {
  safe,
  safeAsync,
  yieldFn,
  zip,
  apply,
};

/**
 * Utility functions for debugging, side effects, and type conversions.
 * Contains helper functions like inspect, tap, and nullable conversions.
 */
export const utils = {
  inspect,
  tap,
  tapErr,
  fromNullable,
  toNullable,
};
