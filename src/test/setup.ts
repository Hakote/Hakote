import { expect } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers);

// Mock environment variables for testing
process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";

// Ensure test environment is properly set
console.log("🧪 Test environment setup complete");
console.log(`  - BASE_URL: ${process.env.NEXT_PUBLIC_BASE_URL}`);
