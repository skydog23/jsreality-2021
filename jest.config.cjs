/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: 'node',
    // Use a local test sequencer so Jest doesn't need to resolve
    // `@jest/test-sequencer` at runtime (this can fail in sandboxed environments).
    testSequencer: '<rootDir>/test/JestTestSequencer.cjs',
    testMatch: [
        '**/test/**/*.test.js',
        '**/src/**/__tests__/**/*.js',
        '**/src/**/*.test.js'
    ],
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/**/__tests__/**',
        '!src/**/*.test.js'
    ]
}; 