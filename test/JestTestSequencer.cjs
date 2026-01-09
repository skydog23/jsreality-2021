/**
 * Minimal Jest test sequencer.
 *
 * We keep this local to avoid Jest needing to resolve `@jest/test-sequencer`
 * in environments where access to parts of node_modules may be restricted.
 *
 * Jest expects a class with a `sort(tests)` method that returns the tests in
 * the desired execution order.
 */

class JestTestSequencer {
  /**
   * @param {Array<{path: string}>} tests
   * @returns {Array<{path: string}>}
   */
  sort(tests) {
    // Deterministic, stable order.
    return [...tests].sort((a, b) => String(a.path).localeCompare(String(b.path)));
  }

  /**
   * Optional hook Jest calls so sequencers can cache timings between runs.
   * We don't need this; implement as a no-op for compatibility.
   *
   * @param {Array<{path: string}>} _tests
   * @param {*} _testResults
   */
  cacheResults(_tests, _testResults) {
    // no-op
  }
}

module.exports = JestTestSequencer;


