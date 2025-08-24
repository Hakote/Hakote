import { NextResponse } from "next/server";
import {
  enqueueSendTodayJobTest,
  getNextPendingJobTest,
  updateJobStatusTest,
  clearTestQueue,
  getTestQueueStatus,
} from "@/lib/cron/queue";
import { executeCronCore } from "@/lib/cron/core";
import { TestLogger } from "@/lib/cron/loggers";

export async function GET() {
  return NextResponse.json({
    ok: true,
    message:
      "Queue test endpoint is working. Use POST method for queue testing.",
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

    // 요청 본문에서 testDate 가져오기
    let body = {};
    try {
      body = await request.json();
    } catch {
      // JSON 파싱 실패 시 빈 객체 사용
    }

    // 요청 본문 또는 환경변수에서 testDate 가져오기
    const testDate =
      (body as { testDate?: string })?.testDate ||
      process.env.TEST_DATE ||
      null;

    // 환경변수로 설정 (가장 먼저 설정)
    if (testDate) {
      process.env.TEST_DATE = testDate;
      console.log(`🔧 TEST_DATE 환경변수 설정: ${testDate}`);
    }

    const logger = new TestLogger();

    logger.test("🧪 큐 워커 시스템 테스트 시작...");
    logger.test("📋 테스트 단계:");
    logger.test("  1. 작업을 큐에 추가");
    logger.test("  2. 큐에서 작업 가져오기");
    logger.test("  3. 작업 처리 (테스트 모드)");
    logger.test("  4. 작업 상태 업데이트");

    if (testDate) {
      logger.test(`📅 테스트 날짜: ${testDate}`);
    }

    // 환경 변수 상태 확인
    logger.test("🔧 환경 변수 상태:");
    logger.test(`  - NODE_ENV: ${process.env.NODE_ENV}`);
    logger.test(
      `  - WORKER_SECRET: ${
        process.env.WORKER_SECRET ? "설정됨" : "설정되지 않음"
      }`
    );
    logger.test(`  - TEST_DATE: ${process.env.TEST_DATE || "설정되지 않음"}`);

    // 테스트 큐 초기화
    clearTestQueue();
    logger.test("🧹 테스트 큐 초기화 완료");

    // 1단계: 작업을 큐에 추가
    logger.test("🔄 1단계: 작업을 큐에 추가 중...");
    await enqueueSendTodayJobTest();
    logger.test("✅ 작업이 큐에 성공적으로 추가되었습니다!");

    // 2단계: 큐에서 작업 가져오기
    logger.test("🔄 2단계: 큐에서 작업 가져오는 중...");
    const job = await getNextPendingJobTest();

    if (!job) {
      logger.test("❌ 큐에서 작업을 찾을 수 없습니다!");
      return NextResponse.json({
        ok: false,
        error: "No pending job found in queue",
        timestamp: new Date().toISOString(),
      });
    }

    logger.test(`✅ 작업을 찾았습니다: ${job.id} (${job.type})`);

    // 3단계: 작업 상태를 processing으로 업데이트
    logger.test("🔄 3단계: 작업 상태를 processing으로 업데이트 중...");
    await updateJobStatusTest(job.id, "processing");
    logger.test("✅ 작업 상태가 processing으로 업데이트되었습니다!");

    // 4단계: 실제 작업 처리 (테스트 모드)
    logger.test("🔄 4단계: 작업 처리 중... (테스트 모드)");
    const result = await executeCronCore({
      isTestMode: true,
      logger,
    });

    // 5단계: 작업 완료
    logger.test("🔄 5단계: 작업 완료 처리 중...");
    await updateJobStatusTest(job.id, "completed");
    logger.test("✅ 작업이 성공적으로 완료되었습니다!");

    // 큐 상태 확인
    const queueStatus = getTestQueueStatus();
    logger.test(
      `📊 큐 상태: 총 ${queueStatus.total}개, 대기 ${queueStatus.pending}개, 처리중 ${queueStatus.processing}개, 완료 ${queueStatus.completed}개, 실패 ${queueStatus.failed}개`
    );

    return NextResponse.json({
      ok: true,
      message: "Queue worker system test completed successfully",
      jobId: job.id,
      result: {
        ...result,
        summary: {
          ...result.summary,
          mode: "queue-test",
          note: "Queue worker system test - No database changes made in test mode",
          testDate: testDate || null,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Queue test error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
