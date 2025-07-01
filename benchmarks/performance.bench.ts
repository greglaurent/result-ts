import { bench, describe } from "vitest";
import { ok, err, isOk, isErr, handle, handleAsync } from "../dist/core.js";
import {
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
} from "../dist/batch.js";
import { map, andThen } from "../dist/iter.js";
import type { Result } from "../dist/types.js";

// =============================================================================
// REALISTIC DATA GENERATORS
// =============================================================================

interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  profile?: {
    bio: string;
    avatar?: string;
    preferences: Record<string, any>;
  };
}

interface ApiResponse<T> {
  data: T;
  meta: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}

interface ValidationError {
  field: string;
  code: string;
  message: string;
}

// Realistic user data generator
const createUserResults = (
  size: number,
  errorRate = 0.15,
): Result<User, ValidationError>[] => {
  const results: Result<User, ValidationError>[] = [];
  for (let i = 0; i < size; i++) {
    if (Math.random() < errorRate) {
      results.push(
        err({
          field: i % 2 === 0 ? "email" : "age",
          code: i % 2 === 0 ? "INVALID_EMAIL" : "AGE_OUT_OF_RANGE",
          message:
            i % 2 === 0 ? "Invalid email format" : "Age must be between 18-100",
        }),
      );
    } else {
      results.push(
        ok({
          id: i,
          name: `User ${i}`,
          email: `user${i}@example.com`,
          age: 20 + (i % 50),
          profile:
            Math.random() > 0.3
              ? {
                  bio: `Bio for user ${i}`,
                  avatar: Math.random() > 0.5 ? `avatar${i}.jpg` : undefined,
                  preferences: {
                    theme: i % 2 === 0 ? "dark" : "light",
                    notifications: Math.random() > 0.3,
                    language: ["en", "es", "fr", "de"][i % 4],
                  },
                }
              : undefined,
        }),
      );
    }
  }
  return results;
};

// API response generator
const createApiResults = (
  size: number,
  errorRate = 0.1,
): Result<ApiResponse<User[]>, { status: number; message: string }>[] => {
  const results: Result<
    ApiResponse<User[]>,
    { status: number; message: string }
  >[] = [];
  for (let i = 0; i < size; i++) {
    if (Math.random() < errorRate) {
      const statusCodes = [400, 401, 403, 404, 429, 500, 502, 503];
      const status = statusCodes[i % statusCodes.length];
      results.push(
        err({
          status,
          message: `HTTP ${status}: ${status === 429 ? "Rate limited" : status >= 500 ? "Server error" : "Client error"}`,
        }),
      );
    } else {
      const batchSize = 5 + (i % 15); // Variable batch sizes
      const users: User[] = Array.from({ length: batchSize }, (_, j) => ({
        id: i * 100 + j,
        name: `Batch ${i} User ${j}`,
        email: `batch${i}.user${j}@example.com`,
        age: 20 + ((i + j) % 50),
      }));

      results.push(
        ok({
          data: users,
          meta: {
            timestamp: new Date().toISOString(),
            requestId: `req-${i}-${Date.now()}`,
            version: "1.0.0",
          },
        }),
      );
    }
  }
  return results;
};

// File processing results
const createFileResults = (
  size: number,
  errorRate = 0.05,
): Result<
  { filename: string; content: string; size: number },
  { filename: string; error: string }
>[] => {
  const results: Result<
    { filename: string; content: string; size: number },
    { filename: string; error: string }
  >[] = [];
  for (let i = 0; i < size; i++) {
    const filename = `file${i}.txt`;
    if (Math.random() < errorRate) {
      const errors = [
        "File not found",
        "Permission denied",
        "Corrupted file",
        "File too large",
      ];
      results.push(
        err({
          filename,
          error: errors[i % errors.length],
        }),
      );
    } else {
      const contentSize = 100 + (i % 1000); // Variable content sizes
      results.push(
        ok({
          filename,
          content: "x".repeat(contentSize), // Simulate file content
          size: contentSize,
        }),
      );
    }
  }
  return results;
};

// Test datasets
const smallUserResults = createUserResults(100);
const mediumUserResults = createUserResults(1000);
const largeUserResults = createUserResults(10000);
const apiResults = createApiResults(500);
const fileResults = createFileResults(1000);

// Legacy comparison data (keeping original for consistency)
const createMixedResults = (
  size: number,
  errorRate = 0.3,
): Result<number, string>[] => {
  const results: Result<number, string>[] = [];
  for (let i = 0; i < size; i++) {
    if (Math.random() < errorRate) {
      results.push(err(`Error ${i}`));
    } else {
      results.push(ok(i));
    }
  }
  return results;
};

const mediumResults = createMixedResults(1000);
const largeResults = createMixedResults(10000);

// =============================================================================
// CORE PERFORMANCE COMPARISONS
// =============================================================================

describe("Single-Pass vs Multiple-Pass Operations", () => {
  bench("✅ batch.analyze() - single pass", () => {
    analyze(largeResults);
  });

  bench("❌ naive multiple passes", () => {
    const total = largeResults.length;
    const okCount = largeResults.filter(isOk).length;
    const errorCount = largeResults.filter(isErr).length;
    const hasErrors = errorCount > 0;
    const isEmpty = total === 0;
  });

  bench("✅ batch.partitionWith() - everything in one pass", () => {
    partitionWith(largeResults);
  });

  bench("❌ functional equivalent to partitionWith", () => {
    const okResults = largeResults.filter(isOk);
    const errResults = largeResults.filter(isErr);
    const oks = okResults.map((r) => r.value);
    const errors = errResults.map((r) => r.error);
    const okCount = oks.length;
    const errorCount = errors.length;
    const total = largeResults.length;
  });
});

describe("Zero-Allocation Loops vs Functional Chains", () => {
  bench("✅ batch.oks() - manual loop", () => {
    oks(mediumResults);
  });

  bench("❌ filter + map chain", () => {
    mediumResults.filter(isOk).map((r) => r.value);
  });

  bench("✅ batch.partition() - single pass", () => {
    partition(mediumResults);
  });

  bench("❌ naive filter twice", () => {
    const oks = mediumResults.filter(isOk).map((r) => r.value);
    const errors = mediumResults.filter(isErr).map((r) => r.error);
  });
});

// =============================================================================
// REAL-WORLD SCENARIOS
// =============================================================================

describe("User Data Processing (Real-World)", () => {
  bench("✅ Process user validation results", () => {
    const stats = analyze(mediumUserResults);
    if (stats.hasErrors) {
      const errors = errs(mediumUserResults);
      const errorsByField = errors.reduce(
        (acc, error) => {
          acc[error.field] = (acc[error.field] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );
    }
    const validUsers = oks(mediumUserResults);
    const adultUsers = validUsers.filter((user) => user.age >= 18);
  });

  bench("❌ Naive user processing", () => {
    const validUsers = mediumUserResults.filter(isOk).map((r) => r.value);
    const errors = mediumUserResults.filter(isErr).map((r) => r.error);
    const errorsByField = errors.reduce(
      (acc, error) => {
        acc[error.field] = (acc[error.field] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    const adultUsers = validUsers.filter((user) => user.age >= 18);
    const hasErrors = errors.length > 0;
  });

  bench("✅ Complex user data extraction", () => {
    const { oks: users, errors } = partition(mediumUserResults);
    const usersWithProfiles = users.filter((u) => u.profile);
    const avgAge = users.reduce((sum, u) => sum + u.age, 0) / users.length;
    const emailDomains = new Set(users.map((u) => u.email.split("@")[1]));
  });

  bench("❌ Naive complex extraction", () => {
    const users = mediumUserResults.filter(isOk).map((r) => r.value);
    const errors = mediumUserResults.filter(isErr).map((r) => r.error);
    const usersWithProfiles = users.filter((u) => u.profile);
    const avgAge = users.reduce((sum, u) => sum + u.age, 0) / users.length;
    const emailDomains = new Set(users.map((u) => u.email.split("@")[1]));
  });
});

describe("API Response Processing (Real-World)", () => {
  bench("✅ Process API batch responses", () => {
    const successfulResponses = oks(apiResults);
    const totalUsers = successfulResponses.reduce(
      (sum, response) => sum + response.data.length,
      0,
    );
    const errors = errs(apiResults);
    const serverErrors = errors.filter((e) => e.status >= 500);
  });

  bench("❌ Naive API processing", () => {
    const successfulResponses = apiResults.filter(isOk).map((r) => r.value);
    const errors = apiResults.filter(isErr).map((r) => r.error);
    const totalUsers = successfulResponses.reduce(
      (sum, response) => sum + response.data.length,
      0,
    );
    const serverErrors = errors.filter((e) => e.status >= 500);
  });

  bench("✅ API error analysis", () => {
    const stats = analyze(apiResults);
    if (stats.hasErrors) {
      const errors = errs(apiResults);
      const errorStats: Record<string, number> = {};
      for (const error of errors) {
        const category =
          error.status >= 500
            ? "server"
            : error.status >= 400
              ? "client"
              : "other";
        errorStats[category] = (errorStats[category] || 0) + 1;
      }
    }
  });
});

describe("File Processing Pipeline (Real-World)", () => {
  bench("✅ File processing with batch operations", () => {
    const { oks: files, errors } = partition(fileResults);
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const largeFiles = files.filter((file) => file.size > 500);
    const errorsByType = errors.reduce(
      (acc, error) => {
        acc[error.error] = (acc[error.error] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  });

  bench("❌ Naive file processing", () => {
    const files = fileResults.filter(isOk).map((r) => r.value);
    const errors = fileResults.filter(isErr).map((r) => r.error);
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const largeFiles = files.filter((file) => file.size > 500);
    const errorsByType = errors.reduce(
      (acc, error) => {
        acc[error.error] = (acc[error.error] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  });
});

// =============================================================================
// ASYNC PERFORMANCE (Real-World)
// =============================================================================

describe("Async Operations (Real-World)", () => {
  const createAsyncUserFetch = (
    id: number,
    delay: number = 1,
  ): Promise<Result<User, string>> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (Math.random() < 0.1) {
          resolve(err(`Failed to fetch user ${id}`));
        } else {
          resolve(
            ok({
              id,
              name: `User ${id}`,
              email: `user${id}@example.com`,
              age: 20 + (id % 50),
            }),
          );
        }
      }, delay);
    });
  };

  bench("✅ allAsync() - concurrent user fetching", async () => {
    const promises = Array.from({ length: 50 }, (_, i) =>
      createAsyncUserFetch(i, 1),
    );
    await allAsync(promises);
  });

  bench("✅ allSettledAsync() - resilient concurrent fetching", async () => {
    const promises = Array.from({ length: 50 }, (_, i) =>
      createAsyncUserFetch(i, 1),
    );
    await allSettledAsync(promises);
  });

  bench("❌ Promise.all with manual error handling", async () => {
    const promises = Array.from({ length: 50 }, (_, i) =>
      createAsyncUserFetch(i, 1).then((result) => ({ result, index: i })),
    );
    const results = await Promise.all(promises);
    const successes = results
      .filter(({ result }) => isOk(result))
      .map(({ result }) => (result as any).value);
    const errors = results
      .filter(({ result }) => isErr(result))
      .map(({ result }) => (result as any).error);
  });
});

// =============================================================================
// INTEGRATION PATTERNS (Real-World)
// =============================================================================

describe("Cross-Module Integration (Real-World)", () => {
  bench("✅ Full validation + processing pipeline", () => {
    // Simulate form validation pipeline
    const results = mediumUserResults;

    // 1. Partition valid/invalid data
    const { oks: validUsers, errors: validationErrors } = partition(results);

    // 2. Transform valid data
    const enhancedUsers = validUsers.map((user) => ({
      ...user,
      displayName: `${user.name} (${user.age})`,
      isAdult: user.age >= 18,
    }));

    // 3. Analyze results
    const stats = analyze(results);

    // 4. Error categorization
    const errorCategories = validationErrors.reduce(
      (acc, error) => {
        acc[error.code] = (acc[error.code] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  });

  bench("❌ Manual pipeline without result-ts", () => {
    const results = mediumUserResults;
    const validUsers: User[] = [];
    const validationErrors: ValidationError[] = [];

    // Manual separation
    for (const result of results) {
      if (isOk(result)) {
        validUsers.push(result.value);
      } else {
        validationErrors.push(result.error);
      }
    }

    // Transform
    const enhancedUsers = validUsers.map((user) => ({
      ...user,
      displayName: `${user.name} (${user.age})`,
      isAdult: user.age >= 18,
    }));

    // Stats
    const total = results.length;
    const okCount = validUsers.length;
    const errorCount = validationErrors.length;
    const hasErrors = errorCount > 0;

    // Error categorization
    const errorCategories = validationErrors.reduce(
      (acc, error) => {
        acc[error.code] = (acc[error.code] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  });
});

// =============================================================================
// MEMORY PRESSURE TESTS
// =============================================================================

describe("Memory Pressure (Large Objects)", () => {
  const createLargeObjectResults = (
    size: number,
  ): Result<{ id: number; data: string }, string>[] => {
    return Array.from({ length: size }, (_, i) => {
      if (i % 10 === 0) {
        return err(`Error ${i}`);
      }
      return ok({
        id: i,
        data: "x".repeat(1000), // 1KB per object
      });
    });
  };

  const largeObjectResults = createLargeObjectResults(1000); // ~1MB total

  bench("✅ batch.oks() with large objects", () => {
    oks(largeObjectResults);
  });

  bench("❌ filter + map with large objects", () => {
    largeObjectResults.filter(isOk).map((r) => r.value);
  });

  bench("✅ batch.analyze() with large objects", () => {
    analyze(largeObjectResults);
  });

  bench("❌ manual analysis with large objects", () => {
    const total = largeObjectResults.length;
    const okCount = largeObjectResults.filter(isOk).length;
    const errorCount = largeObjectResults.filter(isErr).length;
  });
});

// =============================================================================
// EDGE CASE PERFORMANCE
// =============================================================================

describe("Edge Cases Performance", () => {
  const createEdgeCaseResults = () => {
    const results: Result<any, any>[] = [];

    // Mix of null-safe handling
    for (let i = 0; i < 1000; i++) {
      if (i % 5 === 0) {
        results.push(null as any); // Test null handling
      } else if (i % 7 === 0) {
        results.push(undefined as any); // Test undefined handling
      } else if (i % 3 === 0) {
        results.push(err(`Error ${i}`));
      } else {
        results.push(ok(i));
      }
    }

    return results;
  };

  const edgeCaseResults = createEdgeCaseResults();

  bench("✅ batch.oks() with nulls (graceful handling)", () => {
    oks(edgeCaseResults.filter((r) => r != null));
  });

  bench("❌ naive filter with nulls (would break)", () => {
    // Pre-filter to simulate what you'd have to do manually
    const filtered = edgeCaseResults.filter((r) => r != null);
    filtered.filter(isOk).map((r) => r.value);
  });

  bench("✅ batch.analyze() with nulls (graceful handling)", () => {
    analyze(edgeCaseResults.filter((r) => r != null));
  });
});

// =============================================================================
// SCALING TESTS (Updated)
// =============================================================================

describe("Scaling Performance (Real-World Sizes)", () => {
  // Small: typical form validation
  bench("Small dataset (100 items) - analyze", () => {
    analyze(smallUserResults);
  });

  // Medium: API batch processing
  bench("Medium dataset (1,000 items) - analyze", () => {
    analyze(mediumUserResults);
  });

  // Large: bulk data processing
  bench("Large dataset (10,000 items) - analyze", () => {
    analyze(largeUserResults);
  });

  // Partition scaling
  bench("Small dataset (100 items) - partition", () => {
    partition(smallUserResults);
  });

  bench("Medium dataset (1,000 items) - partition", () => {
    partition(mediumUserResults);
  });

  bench("Large dataset (10,000 items) - partition", () => {
    partition(largeUserResults);
  });

  // Combined operations scaling
  bench("Small dataset (100 items) - full pipeline", () => {
    const stats = analyze(smallUserResults);
    if (stats.hasErrors) {
      const { oks: users, errors } = partition(smallUserResults);
      const avgAge = users.reduce((sum, u) => sum + u.age, 0) / users.length;
    }
  });

  bench("Large dataset (10,000 items) - full pipeline", () => {
    const stats = analyze(largeUserResults);
    if (stats.hasErrors) {
      const { oks: users, errors } = partition(largeUserResults);
      const avgAge = users.reduce((sum, u) => sum + u.age, 0) / users.length;
    }
  });
});
