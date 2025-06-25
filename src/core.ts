import { createBaseResult } from '@/base';

const base = createBaseResult();

export const {
  ok,
  err,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
  tryFn,
  tryWith,
  match,
  safeTry,
  yieldFn,
  iter,
  collections,
  utils,
} = base;

export const ResultAsync = base.async;

export type { OK, ERR, Result, Ok, Err } from './base';
