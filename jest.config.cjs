/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: 'node',
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