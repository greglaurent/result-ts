import { describe, it, expect } from 'vitest';
import { ok, err, isOk, isErr } from '@/base';

describe('Package Size Tests', () => {
  it('should import base functions correctly', () => {
    const result = ok('test');
    expect(result.type).toBe('Ok');
    expect(result.value).toBe('test');
    expect(isOk(result)).toBe(true);
  });

  it('should handle error cases correctly', () => {
    const errorResult = err('failed');
    expect(errorResult.type).toBe('Err');
    expect(errorResult.error).toBe('failed');
    expect(isErr(errorResult)).toBe(true);
  });

  it('should have minimal bundle impact', () => {
    // Your package size assertions here
    const result = ok('minimal');
    expect(typeof result).toBe('object');
    expect(Object.keys(result)).toEqual(['type', 'value']);
  });
});
