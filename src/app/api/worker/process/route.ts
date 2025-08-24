import { NextRequest, NextResponse } from "next/server";
import { executeCronCore } from "@/lib/cron/core";
import { ProductionLogger } from "@/lib/cron/loggers";
import {
  getNextPendingJob,
  updateJobStatus,
  retryFailedJob,
} from "@/lib/cron/queue";

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

    // 큐에서 다음 작업 가져오기
    const job = await getNextPendingJob();
    if (!job) {
      return NextResponse.json({
        ok: true,
        message: "No pending jobs",
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`🔄 Processing job ${job.id}: ${job.type}`);

    // 작업 상태를 processing으로 업데이트
    await updateJobStatus(job.id, "processing");

    try {
      // 운영용 로거 사용
      const logger = new ProductionLogger();

      // 공통 크론 로직 실행 (운영 모드)
      const result = await executeCronCore({
        isTestMode: false,
        logger,
      });

      // 작업 완료
      await updateJobStatus(job.id, "completed");

      console.log(`✅ Job ${job.id} completed successfully`);

      return NextResponse.json({
        ok: true,
        message: "Job processed successfully",
        jobId: job.id,
        result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`❌ Job ${job.id} failed:`, error);

      // 작업 실패
      await updateJobStatus(
        job.id,
        "failed",
        error instanceof Error ? error.message : "Unknown error"
      );

      // 재시도 가능한지 확인
      if (job.retry_count < job.max_retries) {
        await retryFailedJob(job.id);
        console.log(
          `🔄 Job ${job.id} queued for retry (${job.retry_count + 1}/${
            job.max_retries
          })`
        );
      }

      return NextResponse.json(
        {
          ok: false,
          error: "Job processing failed",
          jobId: job.id,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Worker error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal worker error" },
      { status: 500 }
    );
  }
}
