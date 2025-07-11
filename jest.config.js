/** @type {import('jest').Config} */
export default {
    transform: {},
    testEnvironment: 'node',
    testMatch: [
        '**/src-core/**/__tests__/**/*.js',
        '**/src-core/**/*.test.js'
    ],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
    }
}; 