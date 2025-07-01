// Direct imports - only what's actually used gets bundled
export { ok, err, isOk, isErr, unwrap, unwrapOr, handle, handleAsync, handleWith, handleWithAsync, match } from "@/base";
export type { Result, Ok, Err } from "@/base";

// Export grouped objects without factory function
import { map, mapAsync, mapErr, mapErrAsync, andThen, andThenAsync, pipe } from "@/base";
import { all, allAsync, allSettledAsync, oks, errs, partition, partitionWith, analyze, findFirst, reduce, first } from "@/base";
import { safe, safeAsync, yieldFn, zip, apply } from "@/base";
import { inspect, tap, tapErr, fromNullable, toNullable } from "@/base";

export const iter = { map, mapAsync, mapErr, mapErrAsync, andThen, andThenAsync, pipe };
export const batch = { all, allAsync, allSettledAsync, oks, errs, partition, partitionWith, analyze, findFirst, reduce, first };
export const advanced = { safe, safeAsync, yieldFn, zip, apply };
export const utils = { inspect, tap, tapErr, fromNullable, toNullable };
