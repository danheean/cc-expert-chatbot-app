/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.ts"],
  moduleFileExtensions: ["ts", "js"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }],
    "^.+\\.js$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  transformIgnorePatterns: ["node_modules/(?!uuid)"],
};
