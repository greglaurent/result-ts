// Core constants and types - Foundation for all Result operations
// Single source of truth for Result type system

// Core constants
export const OK = "Ok" as const;
export const ERR = "Err" as const;

// Core type definitions
export interface Ok<T> {
  type: typeof OK;
  value: T;
}

export interface Err<E> {
  type: typeof ERR;
  error: E;
}

export type Result<T, E = Error> = Ok<T> | Err<E>;

// Export the constant types for external use
export type OK = typeof OK;
export type ERR = typeof ERR;
