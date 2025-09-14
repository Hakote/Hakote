import { expect } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers);

// Mock environment variables for testing
process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";
// 통합 테스트 기준 날짜 (KST 기준 제어)
process.env.TEST_DATE = process.env.TEST_DATE || "2025-09-14";

// Ensure test environment is properly set
console.log("🧪 Test environment setup complete");
console.log(`  - BASE_URL: ${process.env.NEXT_PUBLIC_BASE_URL}`);
console.log(`  - TEST_DATE: ${process.env.TEST_DATE}`);
