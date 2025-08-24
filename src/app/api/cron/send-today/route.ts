import { NextRequest, NextResponse } from "next/server";
import { enqueueSendTodayJob } from "@/lib/cron/queue";

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

    // 작업을 큐에 추가
    await enqueueSendTodayJob();

    // 즉시 응답 (202 Accepted - 작업이 큐에 추가됨)
    return new Response(
      JSON.stringify({
        ok: true,
        message: "Daily email job queued successfully",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 202,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Failed to queue cron job:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to queue job" },
      { status: 500 }
    );
  }
}
