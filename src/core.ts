import { createBaseResult } from "@/base";

const base = createBaseResult();

export const {
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
  iter,
  batch,
  advanced,
  utils,
} = base;

export type { OK, ERR, Result, Ok, Err } from "@/base";
