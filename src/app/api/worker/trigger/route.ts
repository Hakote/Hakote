import { NextRequest, NextResponse } from "next/server";
import { getNextPendingJob } from "@/lib/cron/queue";

export async function POST(request: NextRequest) {
  try {
    // 워커 시크릿 확인
    const workerSecret = request.headers.get("x-worker-secret");
    if (workerSecret !== process.env.WORKER_SECRET) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 큐에 대기 중인 작업이 있는지 확인
    const pendingJob = await getNextPendingJob();

    if (!pendingJob) {
      return NextResponse.json({
        ok: true,
        message:
          "No pending jobs - job may have been processed by another worker",
        timestamp: new Date().toISOString(),
      });
    }

    // 워커 프로세스 API 호출 (재시도 로직 포함)
    const workerUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/worker/process`;
    const maxRetries = 3;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Worker process 호출 시도 ${attempt}/${maxRetries}...`);

        const response = await fetch(workerUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-worker-secret": process.env.WORKER_SECRET!,
          },
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Worker process 성공 (시도 ${attempt})`);
          return NextResponse.json({
            ok: true,
            message: "Worker triggered successfully",
            result,
            timestamp: new Date().toISOString(),
          });
        } else {
          throw new Error(`Worker failed with status: ${response.status}`);
        }
      } catch (error) {
        lastError = error;
        console.error(
          `Failed to trigger worker (attempt ${attempt}/${maxRetries}):`,
          error
        );

        if (attempt < maxRetries) {
          // 지수 백오프: 1초, 2초, 4초
          const delay = Math.pow(2, attempt - 1) * 1000;
          console.log(`Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // 모든 재시도 실패
    console.error("Failed to trigger worker after all retries");
    const errorMessage =
      lastError instanceof Error ? lastError.message : "Unknown error";
    return NextResponse.json(
      {
        ok: false,
        error: `Failed to trigger worker after ${maxRetries} attempts: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  } catch (error) {
    console.error("Worker trigger error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal worker trigger error" },
      { status: 500 }
    );
  }
}
