import { NextResponse } from "next/server";
import { executeCronCore } from "@/lib/cron/core";
import { TestLogger } from "@/lib/cron/loggers";

export async function GET() {
  return NextResponse.json({
    ok: true,
    message:
      "Test cron endpoint is working. Use POST method for test execution.",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  try {
    // 개발 환경에서만 허용
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json(
        { ok: false, error: "Test endpoint only available in development" },
        { status: 403 }
      );
    }

    // 요청 본문에서 testDate 추출
    const body = await request.json();
    const testDate = body?.testDate;

    // testDate가 있으면 환경 변수로 설정
    if (testDate) {
      process.env.TEST_DATE = testDate;
    }

    // 테스트용 로거 사용
    const logger = new TestLogger();

    logger.test("🧪 테스트 크론 작업 시작...");
    logger.test("⚠️  테스트 모드에서는 DB가 변경되지 않습니다!");

    if (testDate) {
      logger.test(`📅 테스트 날짜: ${testDate}`);
    }

    // 환경 변수 상태 확인
    logger.test("🔧 환경 변수 상태:");
    logger.test(`  - NODE_ENV: ${process.env.NODE_ENV}`);
    logger.test(`  - ENABLE_TEST_EMAIL: ${process.env.ENABLE_TEST_EMAIL}`);
    logger.test(
      `  - CRON_SECRET: ${process.env.CRON_SECRET ? "설정됨" : "설정되지 않음"}`
    );
    logger.test(`  - TEST_DATE: ${process.env.TEST_DATE || "설정되지 않음"}`);

    // 공통 크론 로직 실행 (테스트 모드)
    const result = await executeCronCore({
      isTestMode: true,
      logger,
    });

    return NextResponse.json({
      ...result,
      summary: {
        ...result.summary,
        mode: "test",
        note: "No database changes made in test mode",
        testDate: testDate || null,
      },
    });
  } catch (error) {
    console.error("Test cron job error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
