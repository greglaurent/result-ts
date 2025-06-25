export type { Result, Ok, Err } from '@/base';

export * from '@/core';

import { Result as ValidResult } from '@/validation';

export const {
  schema,
  string: stringSchema,
  number: numberSchema,
  error: errorSchema,
  parseJson,
  parseResult
} = ValidResult;
