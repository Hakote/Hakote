import { NextRequest, NextResponse } from "next/server";
import { executeCronCore } from "@/lib/cron/core";
import { ProductionLogger } from "@/lib/cron/loggers";

export async function GET() {
  return NextResponse.json({
    ok: true,
    message:
      "Cron endpoint is working. Use POST method with x-cron-secret header for actual execution.",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = request.headers.get("x-cron-secret");
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("🚀 GitHub Action 크론 작업 시작");

    // 운영용 로거 사용
    const logger = new ProductionLogger();

    // 공통 크론 로직 직접 실행 (운영 모드)
    const result = await executeCronCore({
      isTestMode: false,
      logger,
    });

    console.log("✅ GitHub Action 크론 작업 완료");

    return NextResponse.json({
      ok: true,
      message: "Daily email job completed successfully",
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ GitHub Action 크론 작업 실패:", error);
    return NextResponse.json(
      { 
        ok: false, 
        error: "Failed to execute cron job",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
