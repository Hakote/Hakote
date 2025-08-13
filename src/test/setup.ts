import { expect, vi } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers);

// Mock environment variables
process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
process.env.RESEND_API_KEY = "test-resend-key";
process.env.EMAIL_FROM = "test@example.com";
process.env.CRON_SECRET = "test-cron-secret";
