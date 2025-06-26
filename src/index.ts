// Main package - no Zod dependency
import { createBaseResult } from "@/base";

const base = createBaseResult();

export const {
  // Root level
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
  // Namespaces
  iter,
  batch,
  advanced,
  utils,
} = base;

export type { Result, Ok, Err } from "@/base";
