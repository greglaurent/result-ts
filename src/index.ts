// Main package entry point - no Zod dependency
// Re-export all individual functions from base
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
 * 
 * @example
 * ```typescript
 * import { iter } from 'result-ts';
 * 
 * const result = iter.pipe(
 *   getUserData(id),
 *   user => iter.map(user, u => u.name),
 *   name => validateName(name)
 * );
 * ```
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
 * 
 * @example
 * ```typescript
 * import { batch } from 'result-ts';
 * 
 * const userResults = [getUser(1), getUser(2), getUser(3)];
 * const allUsers = batch.all(userResults);
 * const { oks, errors } = batch.partition(userResults);
 * ```
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
 * 
 * @example
 * ```typescript
 * import { advanced } from 'result-ts';
 * 
 * const result = advanced.safe(function* () {
 *   const user = yield getUser(id);
 *   const profile = yield getProfile(user.id);
 *   return { user, profile };
 * });
 * ```
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
 * 
 * @example
 * ```typescript
 * import { utils } from 'result-ts';
 * 
 * const result = utils.inspect(
 *   processData(),
 *   value => console.log('Success:', value),
 *   error => console.error('Error:', error)
 * );
 * ```
 */
export const utils = {
  inspect,
  tap,
  tapErr,
  fromNullable,
  toNullable,
};
