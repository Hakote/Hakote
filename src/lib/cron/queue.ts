import { supabaseAdmin } from "@/lib/supabase";

export interface QueuedJob {
  id: string;
  type: "send-daily-email";
  status: "pending" | "processing" | "completed" | "failed";
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  retry_count: number;
  max_retries: number;
}

// 테스트용 인메모리 큐 (실제 DB 변경 없음)
let testQueue: QueuedJob[] = [];
let testJobIdCounter = 1;

/**
 * 일일 메일 전송 작업을 큐에 추가
 */
export async function enqueueSendTodayJob(): Promise<void> {
  const maxRetries = 3;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { error } = await supabaseAdmin.from("cron_jobs").insert({
        type: "send-daily-email",
        status: "pending",
        retry_count: 0,
        max_retries: 3,
      });

      if (error) {
        throw error;
      }

      console.log("✅ Daily email job queued successfully");
      return; // 성공 시 즉시 반환
    } catch (error) {
      lastError = error;
      console.error(
        `Failed to enqueue job (attempt ${attempt}/${maxRetries}):`,
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
  console.error("Failed to enqueue job after all retries");
  const errorMessage =
    lastError instanceof Error ? lastError.message : "Unknown error";
  throw new Error(
    `Failed to enqueue job after ${maxRetries} attempts: ${errorMessage}`
  );
}

/**
 * 테스트용: 일일 메일 전송 작업을 인메모리 큐에 추가 (DB 변경 없음)
 */
export async function enqueueSendTodayJobTest(): Promise<void> {
  const testJob: QueuedJob = {
    id: `test-job-${testJobIdCounter++}`,
    type: "send-daily-email",
    status: "pending",
    created_at: new Date().toISOString(),
    retry_count: 0,
    max_retries: 3,
  };

  testQueue.push(testJob);
  console.log("✅ Test job queued successfully (in-memory)");
}

/**
 * 큐에서 다음 작업 가져오기
 */
export async function getNextPendingJob(): Promise<QueuedJob | null> {
  const { data, error } = await supabaseAdmin
    .from("cron_jobs")
    .select("*")
    .eq("status", "pending")
    .eq("type", "send-daily-email")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data as QueuedJob;
}

/**
 * 테스트용: 인메모리 큐에서 다음 작업 가져오기 (DB 변경 없음)
 */
export async function getNextPendingJobTest(): Promise<QueuedJob | null> {
  const pendingJob = testQueue.find((job) => job.status === "pending");
  return pendingJob || null;
}

/**
 * 작업 상태 업데이트
 */
export async function updateJobStatus(
  jobId: string,
  status: QueuedJob["status"],
  errorMessage?: string
): Promise<void> {
  const updateData: {
    status: QueuedJob["status"];
    started_at?: string;
    completed_at?: string;
    error_message?: string;
  } = { status };

  if (status === "processing") {
    updateData.started_at = new Date().toISOString();
  } else if (status === "completed" || status === "failed") {
    updateData.completed_at = new Date().toISOString();
    if (errorMessage) {
      updateData.error_message = errorMessage;
    }
  }

  const { error } = await supabaseAdmin
    .from("cron_jobs")
    .update(updateData)
    .eq("id", jobId);

  if (error) {
    console.error("Failed to update job status:", error);
  }
}

/**
 * 테스트용: 인메모리 큐의 작업 상태 업데이트 (DB 변경 없음)
 */
export async function updateJobStatusTest(
  jobId: string,
  status: QueuedJob["status"],
  errorMessage?: string
): Promise<void> {
  const job = testQueue.find((j) => j.id === jobId);
  if (job) {
    job.status = status;

    if (status === "processing") {
      job.started_at = new Date().toISOString();
    } else if (status === "completed" || status === "failed") {
      job.completed_at = new Date().toISOString();
      if (errorMessage) {
        job.error_message = errorMessage;
      }
    }
  }
  console.log(`✅ Test job status updated: ${jobId} -> ${status}`);
}

/**
 * 실패한 작업 재시도
 */
export async function retryFailedJob(jobId: string): Promise<void> {
  const { data: job } = await supabaseAdmin
    .from("cron_jobs")
    .select("retry_count, max_retries")
    .eq("id", jobId)
    .single();

  if (!job) return;

  if (job.retry_count < job.max_retries) {
    await supabaseAdmin
      .from("cron_jobs")
      .update({
        status: "pending",
        retry_count: job.retry_count + 1,
        error_message: null,
      })
      .eq("id", jobId);
  }
}

/**
 * 테스트용: 인메모리 큐 초기화 (테스트 간 격리)
 */
export function clearTestQueue(): void {
  testQueue = [];
  testJobIdCounter = 1;
  console.log("🧹 Test queue cleared");
}

/**
 * 테스트용: 인메모리 큐 상태 확인
 */
export function getTestQueueStatus(): {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
} {
  const total = testQueue.length;
  const pending = testQueue.filter((job) => job.status === "pending").length;
  const processing = testQueue.filter(
    (job) => job.status === "processing"
  ).length;
  const completed = testQueue.filter(
    (job) => job.status === "completed"
  ).length;
  const failed = testQueue.filter((job) => job.status === "failed").length;

  return { total, pending, processing, completed, failed };
}
