import { supabaseAdmin } from "@/lib/supabase";
import { sendEmail, sendTestEmail } from "@/lib/sendMail";
import { yyyyMmDdKST, getDayName, nowKST } from "@/lib/date";

export interface CronOptions {
  isTestMode: boolean;
  logger: Logger;
}

export interface CronResult {
  ok: boolean;
  summary: {
    date: string;
    dayOfWeek: string;
    totalSubscribers: number;
    successCount: number;
    failureCount: number;
    isTestMode: boolean;
  };
}

export interface Logger {
  info(message: string): void;
  error(message: string, error?: unknown): void;
  warn(message: string): void;
  test(message: string): void;
}

export interface Subscriber {
  id: string;
  email: string;
  frequency: string;
  unsubscribe_token: string;
  created_at: string;
}

export interface Problem {
  id: string;
  title: string;
  url: string;
  difficulty: string;
  week?: string;
}

export interface SubscriberProgress {
  current_problem_index: number;
  total_problems_sent: number;
}

// 공통 크론 작업 실행 함수
export async function executeCronCore(
  options: CronOptions
): Promise<CronResult> {
  const { isTestMode, logger } = options;

  try {
    // KST 기준 날짜 및 요일 계산
    const todayDate = yyyyMmDdKST();
    const currentDateKST = nowKST();
    const dayOfWeek = currentDateKST.getDay();
    const dayName = getDayName(dayOfWeek);

    logger.info(`🚀 크론 작업 시작: ${todayDate} (${dayName}요일)`);

    // Get all active subscribers
    const { data: allSubscribers, error: subscribersError } =
      await supabaseAdmin
        .from("subscribers")
        .select("id, email, frequency, unsubscribe_token, created_at")
        .eq("is_active", true);

    if (subscribersError) {
      logger.error("Failed to fetch subscribers:", subscribersError);
      throw new Error("Failed to fetch subscribers");
    }

    if (!allSubscribers || allSubscribers.length === 0) {
      logger.info("No active subscribers found");
      return {
        ok: true,
        summary: {
          date: todayDate,
          dayOfWeek: dayName,
          totalSubscribers: 0,
          successCount: 0,
          failureCount: 0,
          isTestMode,
        },
      };
    }

    logger.info(`📊 전체 구독자 수: ${allSubscribers.length}`);

    // 빈도별 구독자 분포 로깅
    const frequencyCounts = {
      "2x": allSubscribers.filter((s) => s.frequency === "2x").length,
      "3x": allSubscribers.filter((s) => s.frequency === "3x").length,
      "5x": allSubscribers.filter((s) => s.frequency === "5x").length,
    };
    logger.info(`📈 빈도별 구독자 분포:`);
    logger.info(`  - 2x (화,목): ${frequencyCounts["2x"]}명`);
    logger.info(`  - 3x (월,수,금): ${frequencyCounts["3x"]}명`);
    logger.info(`  - 5x (평일): ${frequencyCounts["5x"]}명`);

    // Filter subscribers based on frequency and current day (KST 기준)
    const subscribers = allSubscribers.filter((subscriber) => {
      switch (subscriber.frequency) {
        case "2x": // 화, 목 (화요일=2, 목요일=4)
          return dayOfWeek === 2 || dayOfWeek === 4;
        case "3x": // 월, 수, 금 (월요일=1, 수요일=3, 금요일=5)
          return dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5;
        case "5x": // 평일 (월~금)
          return dayOfWeek >= 1 && dayOfWeek <= 5;
        default:
          return false;
      }
    });

    if (subscribers.length === 0) {
      logger.info(`📅 오늘(${dayName}요일) 발송 대상 구독자: 0명`);
      return {
        ok: true,
        summary: {
          date: todayDate,
          dayOfWeek: dayName,
          totalSubscribers: allSubscribers.length,
          successCount: 0,
          failureCount: 0,
          isTestMode,
        },
      };
    }

    logger.info(
      `📅 오늘(${dayName}요일) 발송 대상 구독자 수: ${subscribers.length}`
    );

    // Get all active problems
    const { data: problems, error: problemsError } = await supabaseAdmin
      .from("problems")
      .select("id, title, url, difficulty, week")
      .eq("active", true)
      .order("week", { ascending: true })
      .order("created_at", { ascending: true });

    if (problemsError || !problems || problems.length === 0) {
      logger.error("Failed to fetch problems:", problemsError);
      throw new Error("Failed to fetch problems");
    }

    logger.info(`📚 전체 문제 수: ${problems.length}`);

    let successCount = 0;
    let failureCount = 0;

    // 비동기 병렬 처리로 변경 (빠른 처리)
    logger.info(`⚡ 비동기 병렬 처리 시작...`);

    // 성능 측정 시작
    const startTime = performance.now();
    const startDate = new Date();

    logger.info(`⏱️  처리 시작 시간: ${startDate.toISOString()}`);
    logger.info(`📊 처리 대상: ${subscribers.length}명`);

    const promises = subscribers.map((subscriber) =>
      processSubscriber(subscriber, problems, todayDate, { isTestMode, logger })
        .then((result) => ({
          success: result.success,
          email: subscriber.email,
        }))
        .catch((error) => {
          logger.error(
            `Error processing subscriber ${subscriber.email}:`,
            error
          );
          return { success: false, email: subscriber.email };
        })
    );

    const results = await Promise.allSettled(promises);

    // 성능 측정 완료
    const endTime = performance.now();
    const endDate = new Date();
    const totalTimeMs = endTime - startTime;
    const totalTimeSeconds = (totalTimeMs / 1000).toFixed(2);
    const avgTimePerSubscriber = (totalTimeMs / subscribers.length).toFixed(2);

    logger.info(`⏱️  처리 완료 시간: ${endDate.toISOString()}`);
    logger.info(
      `🚀 총 처리 시간: ${totalTimeSeconds}초 (${totalTimeMs.toFixed(0)}ms)`
    );
    logger.info(`📈 구독자당 평균 처리 시간: ${avgTimePerSubscriber}ms`);
    logger.info(
      `⚡ 처리 속도: ${(subscribers.length / (totalTimeMs / 1000)).toFixed(
        2
      )}명/초`
    );

    // 결과 집계
    for (const result of results) {
      if (result.status === "fulfilled") {
        if (result.value.success) {
          successCount++;
        } else {
          failureCount++;
        }
      } else {
        logger.error("Promise rejected:", result.reason);
        failureCount++;
      }
    }

    logger.info(
      `🎉 크론 작업 완료! 성공: ${successCount}, 실패: ${failureCount}`
    );

    // 성능 요약
    const throughput = (subscribers.length / (totalTimeMs / 1000)).toFixed(2);

    logger.info(`📊 성능 요약:`);
    logger.info(`  ⏱️  총 처리 시간: ${totalTimeSeconds}초`);
    logger.info(`  📈 처리량: ${throughput}명/초`);
    logger.info(
      `  🎯 효율성: ${successCount}/${subscribers.length} (${(
        (successCount / subscribers.length) *
        100
      ).toFixed(1)}%)`
    );

    if (isTestMode) {
      logger.test("🧪 테스트 모드 완료 - DB 변경사항 없음");
    }

    return {
      ok: true,
      summary: {
        date: todayDate,
        dayOfWeek: dayName,
        totalSubscribers: subscribers.length,
        successCount,
        failureCount,
        isTestMode,
      },
    };
  } catch (error) {
    logger.error("Cron job error:", error);
    throw error;
  }
}

// 개별 구독자 처리 함수
async function processSubscriber(
  subscriber: Subscriber,
  problems: Problem[],
  todayDate: string,
  options: CronOptions
): Promise<{ success: boolean }> {
  const { isTestMode, logger } = options;

  try {
    // 테스트 모드가 아닐 때만 delivery 중복 체크
    if (!isTestMode) {
      const { data: existingDelivery } = await supabaseAdmin
        .from("deliveries")
        .select("id")
        .eq("subscriber_id", subscriber.id)
        .eq("send_date", todayDate)
        .single();

      if (existingDelivery) {
        logger.info(`⏭️  이미 전송됨: ${subscriber.email}`);
        return { success: false };
      }
    }

    logger.info(`📧 메일 발송 시도: ${subscriber.email}`);

    // Get subscriber's current progress
    let subscriberProgress: SubscriberProgress | null = null;
    const { data: progress } = await supabaseAdmin
      .from("subscriber_progress")
      .select("current_problem_index, total_problems_sent")
      .eq("subscriber_id", subscriber.id)
      .single();
    subscriberProgress = progress;

    let currentProblemIndex = 0;
    if (subscriberProgress) {
      currentProblemIndex = subscriberProgress.current_problem_index;
    } else if (!isTestMode) {
      // First time subscriber - start from beginning (테스트 모드가 아닐 때만)
      await supabaseAdmin.from("subscriber_progress").insert({
        subscriber_id: subscriber.id,
        current_problem_index: 0,
        total_problems_sent: 0,
      });
    } else {
      // 테스트 모드에서는 새 구독자도 0번째 문제부터 시작한다고 가정
      logger.test(`🧪 새 구독자 ${subscriber.email}: 0번째 문제부터 시작`);
    }

    // Get the next problem for this subscriber
    const selectedProblem = problems[currentProblemIndex % problems.length];
    const problemNumber = currentProblemIndex + 1;

    logger.info(
      `📝 ${subscriber.email}의 ${problemNumber}번째 문제: ${
        selectedProblem.title
      }${selectedProblem.week ? ` (${selectedProblem.week}주차)` : ""}`
    );

    // Create delivery record (테스트 모드가 아닐 때만)
    if (!isTestMode) {
      const { error: deliveryError } = await supabaseAdmin
        .from("deliveries")
        .insert({
          subscriber_id: subscriber.id,
          send_date: todayDate,
          problem_id: selectedProblem.id,
          status: "queued",
        });

      if (deliveryError) {
        logger.error(
          `Failed to create delivery for ${subscriber.email}:`,
          deliveryError
        );
        return { success: false };
      }
    }

    // Send email (테스트 모드에 따라 분기)
    const unsubscribeUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/unsubscribe?token=${subscriber.unsubscribe_token}`;

    const emailResult = isTestMode
      ? await sendTestEmail({
          to: subscriber.email,
          subject: `[하코테] 오늘의 문제: ${selectedProblem.title}`,
          title: selectedProblem.title,
          difficulty: selectedProblem.difficulty,
          url: selectedProblem.url,
          unsubscribeUrl,
        })
      : await sendEmail({
          to: subscriber.email,
          subject: `[하코테] 오늘의 문제: ${selectedProblem.title}`,
          title: selectedProblem.title,
          difficulty: selectedProblem.difficulty,
          url: selectedProblem.url,
          unsubscribeUrl,
        });

    // Update delivery status (테스트 모드가 아닐 때만)
    if (!isTestMode) {
      await supabaseAdmin
        .from("deliveries")
        .update({ status: emailResult.success ? "sent" : "failed" })
        .eq("subscriber_id", subscriber.id)
        .eq("send_date", todayDate);
    }

    logger.info(
      `📧 이메일 전송 결과: ${subscriber.email} - success: ${emailResult.success}`
    );

    if (emailResult.success) {
      logger.info(`✅ 이메일 전송 성공: ${subscriber.email}`);

      // Update subscriber progress (테스트 모드가 아닐 때만)
      if (!isTestMode) {
        let progressError = null;

        if (subscriberProgress) {
          // 기존 데이터가 있으면 update
          const { error } = await supabaseAdmin
            .from("subscriber_progress")
            .update({
              current_problem_index: currentProblemIndex + 1,
              total_problems_sent: subscriberProgress.total_problems_sent + 1,
            })
            .eq("subscriber_id", subscriber.id);
          progressError = error;
        } else {
          // 새 데이터면 insert
          const { error } = await supabaseAdmin
            .from("subscriber_progress")
            .insert({
              subscriber_id: subscriber.id,
              current_problem_index: currentProblemIndex + 1,
              total_problems_sent: 1,
            });
          progressError = error;
        }

        if (progressError) {
          logger.error(
            `❌ subscriber_progress 업데이트 실패: ${subscriber.email}`,
            progressError
          );
        } else {
          logger.info(
            `📊 subscriber_progress 업데이트 성공: ${subscriber.email} (${
              currentProblemIndex + 1
            }번째 문제)`
          );
        }
      } else {
        logger.test(`🧪 테스트 모드: subscriber_progress 업데이트 건너뜀`);
      }

      return { success: true };
    } else {
      logger.error(
        `❌ 이메일 전송 실패: ${subscriber.email}`,
        "error" in emailResult ? emailResult.error : "Unknown error"
      );
      return { success: false };
    }
  } catch (error) {
    logger.error(`Error processing subscriber ${subscriber.email}:`, error);
    return { success: false };
  }
}
