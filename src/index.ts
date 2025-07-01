// Main entry point - Core essentials only for optimal tree-shaking
// Users get the minimum viable Result library by default

// Re-export all core essentials (11 functions)
export * from "@/core";

/**
 * # result-ts - Performance-First Result Library
 *
 * This is the minimal Result library entry point containing only core essentials.
 * Designed for optimal tree-shaking and bundle size efficiency.
 *
 * ## Quick Start Examples
 *
 * ```typescript
 * import { ok, err, isOk, handle, match } from 'result-ts';
 *
 * // Basic usage
 * const success = ok("Hello world");
 * const failure = err("Something went wrong");
 *
 * // Type-safe checking
 * if (isOk(success)) {
 *   console.log(success.value); // TypeScript knows this is string
 * }
 *
 * // Safe function execution
 * const parseResult = handle(() => JSON.parse(jsonString));
 * // Returns: Result<ParsedData, Error>
 *
 * // Pattern matching
 * const message = match(parseResult, {
 *   Ok: (data) => `Parsed ${Object.keys(data).length} fields`,
 *   Err: (error) => `Parse failed: ${error.message}`
 * });
 * ```
 *
 * ## Bundle Size Optimization
 *
 * result-ts is designed for maximum tree-shaking efficiency:
 *
 * ```typescript
 * // Minimal import - ~55 bytes
 * import { ok } from 'result-ts';
 *
 * // Core essentials - ~107 bytes
 * import { ok, err, isOk } from 'result-ts';
 *
 * // Safe execution - ~332 bytes
 * import { ok, err, handle, handleAsync } from 'result-ts';
 *
 * // Full core features - ~603 bytes
 * import { ok, err, isOk, isErr, handle, unwrap, unwrapOr, match } from 'result-ts';
 * ```
 *
 * ## Module Selection Guide
 *
 * Choose the right layer based on your needs and bundle size requirements:
 *
 * ### Core Only (`result-ts`) - ~55-603 bytes
 * ```typescript
 * import { ok, err, isOk, handle, match } from 'result-ts';
 *
 * // Perfect for:
 * // - Basic Result creation and checking
 * // - Safe function execution
 * // - Pattern matching
 * // - Libraries that want minimal dependencies
 * ```
 *
 * ### Data Transformation (`result-ts/iter`) - +79 bytes
 * ```typescript
 * import { map, andThen, mapAsync } from 'result-ts/iter';
 * // Also includes all core functions
 *
 * // Perfect for:
 * // - Transforming Result values
 * // - Chaining operations
 * // - Async data processing pipelines
 *
 * const userProfile = map(
 *   validateUser(userData),
 *   user => ({ ...user, displayName: `${user.firstName} ${user.lastName}` })
 * );
 * ```
 *
 * ### Array Processing (`result-ts/batch`) - +133 bytes
 * ```typescript
 * import { all, partition, analyze, oks } from 'result-ts/batch';
 * // Also includes all core functions
 *
 * // Perfect for:
 * // - Processing arrays of Results
 * // - Bulk validation operations
 * // - Statistics and error analysis
 * // - Concurrent async operations
 *
 * const userResults = [validateUser(u1), validateUser(u2), validateUser(u3)];
 * const { oks: validUsers, errors } = partition(userResults);
 * const stats = analyze(userResults);
 * console.log(`${stats.okCount}/${stats.total} users valid`);
 * ```
 *
 * ### Debugging & Utilities (`result-ts/utils`) - Similar to core
 * ```typescript
 * import { inspect, tap, fromNullable, toNullable } from 'result-ts/utils';
 * // Also includes all core functions
 *
 * // Perfect for:
 * // - Debugging Result flows
 * // - Side effects (logging, caching)
 * // - Nullable API integration
 * // - Development and troubleshooting
 *
 * const result = tap(
 *   processPayment(amount),
 *   payment => console.log(`✅ Payment ${payment.id} processed`)
 * );
 * ```
 *
 * ### Advanced Patterns (`result-ts/patterns`) - +269 bytes
 * ```typescript
 * import { safe, zip, apply, chain } from 'result-ts/patterns';
 * // Also includes all core functions
 *
 * // Perfect for:
 * // - Generator-based error handling (Rust-style ? operator)
 * // - Applicative patterns
 * // - Complex functional composition
 * // - Advanced Result combinations
 *
 * const userWithProfile = safe(function* () {
 *   const user = yield getUser(id);          // Auto-unwraps or early returns
 *   const profile = yield getProfile(user.id); // Only runs if user succeeded
 *   return { user, profile };                 // Only runs if both succeed
 * });
 * ```
 *
 * ### Schema Validation (`result-ts/schema`) - +189 bytes (+ Zod)
 * ```typescript
 * import { validate, parseJson, validateAsync } from 'result-ts/schema';
 * // Also includes all core functions
 * // Requires: npm install zod
 *
 * // Perfect for:
 * // - Runtime type validation
 * // - API request/response validation
 * // - Form data validation
 * // - JSON parsing with validation
 *
 * const userResult = validate(requestBody, UserSchema);
 * const configResult = parseJson(configFile, ConfigSchema);
 * ```
 *
 * ## Progressive Enhancement Pattern
 *
 * Start small and add layers as needed:
 *
 * ```typescript
 * // 1. Start with core for basic error handling
 * import { ok, err, isOk, handle } from 'result-ts';
 *
 * // 2. Add data transformation when you need it
 * import { map, andThen } from 'result-ts/iter';
 *
 * // 3. Add array processing for bulk operations
 * import { all, partition } from 'result-ts/batch';
 *
 * // 4. Add validation when handling external data
 * import { validate, parseJson } from 'result-ts/schema';
 *
 * // 5. Add advanced patterns for complex flows
 * import { safe, zip } from 'result-ts/patterns';
 * ```
 *
 * ## Cross-Module Integration
 *
 * All layers work seamlessly together:
 *
 * ```typescript
 * import { handle } from 'result-ts';
 * import { map } from 'result-ts/iter';
 * import { all } from 'result-ts/batch';
 * import { validate } from 'result-ts/schema';
 * import { safe } from 'result-ts/patterns';
 *
 * // Complete validation and processing pipeline
 * const processUsers = (userData: unknown[]) => safe(function* () {
 *   // 1. Validate each user
 *   const validations = userData.map(data => validate(data, UserSchema));
 *
 *   // 2. Combine all validations (fail if any invalid)
 *   const allValid = yield all(validations);
 *
 *   // 3. Transform valid users
 *   const enriched = allValid.map(user => ({
 *     ...user,
 *     displayName: `${user.firstName} ${user.lastName}`
 *   }));
 *
 *   // 4. Save to database safely
 *   const saveResult = yield handle(() => database.saveUsers(enriched));
 *
 *   return { users: enriched, saved: saveResult };
 * });
 * ```
 *
 * ## Bundle Analysis
 *
 * | Layer | Incremental Size | Total Size | Use Case |
 * |-------|------------------|------------|----------|
 * | Core only | 55-603 bytes | 55-603 bytes | Basic Result handling |
 * | + Data transformation | +79 bytes | ~143 bytes | Value mapping, chaining |
 * | + Array processing | +133 bytes | ~291 bytes | Bulk operations |
 * | + Advanced patterns | +269 bytes | ~500 bytes | Complex composition |
 * | + Schema validation | +189 bytes | ~245 bytes* | Runtime validation |
 *
 * *Excludes Zod dependency (~13KB gzipped)
 *
 * ## Performance Notes
 *
 * - **Zero-allocation loops**: Manual iteration instead of functional chains
 * - **Single-pass operations**: `analyze()` gets all stats in one iteration
 * - **Early-exit optimizations**: `all()` stops on first error
 * - **Tree-shaking friendly**: Import only what you need
 * - **~2-3x faster**: Than equivalent functional programming chains
 *
 * ## Type Safety
 *
 * All functions maintain full TypeScript type inference:
 *
 * ```typescript
 * const userResult: Result<User, ValidationError> = validateUser(data);
 *
 * if (isOk(userResult)) {
 *   // TypeScript knows userResult.value is User
 *   console.log(userResult.value.email.toLowerCase());
 * }
 *
 * if (isErr(userResult)) {
 *   // TypeScript knows userResult.error is ValidationError
 *   console.log(userResult.error.field, userResult.error.message);
 * }
 * ```
 *
 * For additional functionality, use the specialized entry points:
 * - {@link file://./iter.ts} → Data transformation operations
 * - {@link file://./batch.ts} → Array processing operations
 * - {@link file://./utils.ts} → Debugging and conversion utilities
 * - {@link file://./patterns.ts} → Advanced functional patterns
 * - {@link file://./schema.ts} → Runtime validation with Zod
 */
