# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-01

### Added

- Initial stable release of result-ts
- Core Result type with Ok/Err variants
- Essential functions: `ok`, `err`, `isOk`, `isErr`, `unwrap`, `unwrapOr`, `handle`, `handleAsync`, `match`
- Data transformation module with `map`, `mapAsync`, `andThen`, `andThenAsync`, `mapErr`, `mapErrAsync`
- Batch processing utilities: `all`, `allAsync`, `allSettledAsync`, `partition`, `analyze`, `oks`, `errs`
- Advanced patterns: `safe`, `safeAsync`, `zip`, `zipWith`, `yieldFn` for generator-based error handling
- Utility functions: `inspect`, `tap`, `tapErr`, `fromNullable`, `toNullable`
- Schema validation integration with Zod support
- Comprehensive TypeScript support with strict type safety
- Zero-overhead abstraction with manual loops and single-pass operations
- Tree-shaking support (97.6% size reduction for partial imports)
- Bundle sizes: 55-1595 bytes depending on features used
- 272 comprehensive tests with 100% coverage
- Performance benchmarks demonstrating 2-10x speedup over functional chains

### Performance

- Single-pass operations in `analyze()` and `partitionWith()`
- Manual loops optimized for zero allocation
- Early-exit patterns in batch operations
- Modular architecture for optimal bundle sizes

### Developer Experience

- Full TypeScript integration with proper type narrowing
- Comprehensive JSDoc documentation
- Runtime validation with descriptive error messages
- Error.cause chaining for debugging
- Multiple entry points for tree-shaking optimization

[1.0.0]: https://github.com/greglaurent/result-ts/releases/tag/v1.0.0

