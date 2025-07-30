/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: 'node',
    testMatch: [
        '**/test/**/*.test.js',
        '**/src-core/**/__tests__/**/*.js',
        '**/src-core/**/*.test.js'
    ],
    collectCoverageFrom: [
        'src-core/**/*.js',
        '!src-core/**/__tests__/**',
        '!src-core/**/*.test.js'
    ]
}; 