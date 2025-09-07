import { supabaseAdmin } from "@/lib/supabase";
import { sendEmail, sendTestEmail } from "@/lib/sendMail";
import { yyyyMmDdKST, getDayName, nowKST } from "@/lib/date";

export interface CronOptions {
  isTestMode: boolean;
  logger: Logger;
  progressMap?: Map<string, SubscriptionProgress>;
  deliveryMap?: Map<string, { id: string; status: string }>;
}

export interface CronResult {
  ok: boolean;
  summary: {
    date: string;
    dayOfWeek: string;
    totalSubscribers: number;
    successCount: number;
    failureCount: number;
    alreadySentCount: number; // 이미 전송된 이메일 수
    newlySentCount: number; // 이번 실행에서 새로 전송된 이메일 수
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
  resubscribe_count: number;
  last_resubscribed_at: string | null;
  last_unsubscribed_at: string | null;
}

export interface Subscription {
  id: string;
  subscriber_id: string;
  problem_list_id: string;
  frequency: string;
  is_active: boolean;
  subscriber: Subscriber;
  problem_list: {
    id: string;
    name: string;
  };
}

export interface SubscriptionProgress {
  id: string;
  subscription_id: string;
  current_problem_index: number;
  total_problems_sent: number;
}

export interface Problem {
  id: string;
  title: string;
  url: string;
  difficulty: string;
  week?: string;
  problem_list_id: string;
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

    // Get all active subscriptions with subscriber and problem_list info
    const { data: allSubscriptions, error: subscriptionsError } =
      await supabaseAdmin
        .from("subscriptions")
        .select(
          `
          id,
          subscriber_id,
          problem_list_id,
          frequency,
          is_active,
          resubscribe_count,
          last_resubscribed_at,
          last_unsubscribed_at,
          subscriber:subscribers!inner(
            id,
            email,
            frequency,
            unsubscribe_token,
            created_at
          ),
          problem_list:problem_lists!inner(
            id,
            name
          )
        `
        )
        .eq("is_active", true)
        .eq("subscriber.is_active", true);

    if (subscriptionsError) {
      logger.error("Failed to fetch subscriptions:", subscriptionsError);
      throw new Error("Failed to fetch subscriptions");
    }

    if (!allSubscriptions || allSubscriptions.length === 0) {
      logger.info("No active subscriptions found");
      return {
        ok: true,
        summary: {
          date: todayDate,
          dayOfWeek: dayName,
          totalSubscribers: 0,
          successCount: 0,
          failureCount: 0,
          alreadySentCount: 0,
          newlySentCount: 0,
          isTestMode,
        },
      };
    }

    logger.info(`📊 전체 활성 구독 수: ${allSubscriptions.length}`);

    // 빈도별 구독 분포 로깅
    const frequencyCounts = {
      "2x": allSubscriptions.filter((s) => s.frequency === "2x").length,
      "3x": allSubscriptions.filter((s) => s.frequency === "3x").length,
      "5x": allSubscriptions.filter((s) => s.frequency === "5x").length,
    };
    logger.info(`📈 빈도별 구독 분포:`);
    logger.info(`  - 2x (화,목): ${frequencyCounts["2x"]}개`);
    logger.info(`  - 3x (월,수,금): ${frequencyCounts["3x"]}개`);
    logger.info(`  - 5x (평일): ${frequencyCounts["5x"]}개`);

    // Filter subscriptions based on frequency and current day (KST 기준)
    const subscriptions = allSubscriptions.filter((subscription) => {
      switch (subscription.frequency) {
        case "2x": // 화, 목 (화요일=2, 목요일=4)
          return dayOfWeek === 2 || dayOfWeek === 4;
        case "3x": // 월, 수, 금 (월요일=1, 수요일=3, 금요일=5)
          return dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5;
        case "5x": // 평일 (월~금)
          return dayOfWeek >= 1 && dayOfWeek <= 5;
        default:
          logger.warn(`⚠️ 알 수 없는 빈도: ${subscription.frequency}`);
          return false;
      }
    });

    // 추가 안전장치: 주말에는 전송하지 않음
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      logger.info(`🚫 주말(${dayName}요일)에는 이메일을 전송하지 않습니다.`);
      return {
        ok: true,
        summary: {
          date: todayDate,
          dayOfWeek: dayName,
          totalSubscribers: 0,
          successCount: 0,
          failureCount: 0,
          alreadySentCount: 0,
          newlySentCount: 0,
          isTestMode,
        },
      };
    }

    if (subscriptions.length === 0) {
      logger.info(`📅 오늘(${dayName}요일) 발송 대상 구독: 0개`);
      return {
        ok: true,
        summary: {
          date: todayDate,
          dayOfWeek: dayName,
          totalSubscribers: 0,
          successCount: 0,
          failureCount: 0,
          alreadySentCount: 0,
          newlySentCount: 0,
          isTestMode,
        },
      };
    }

    logger.info(
      `📅 오늘(${dayName}요일) 발송 대상 구독 수: ${subscriptions.length}`
    );

    // Get all active problems from all problem lists (최적화: 필요한 필드만 선택)
    const { data: problems, error: problemsError } = await supabaseAdmin
      .from("problems")
      .select("id, title, url, difficulty, week, problem_list_id")
      .eq("active", true)
      .order("week", { ascending: true })
      .order("created_at", { ascending: true });

    if (problemsError || !problems || problems.length === 0) {
      logger.error("Failed to fetch problems:", problemsError);
      throw new Error("Failed to fetch problems");
    }

    logger.info(`📚 전체 문제 수: ${problems.length}`);

    // 최적화: 배치로 진행률과 delivery 상태 조회
    const subscriptionIds = subscriptions.map((s) => s.id);

    // 빈 배열 체크 추가
    if (subscriptionIds.length === 0) {
      logger.info("📊 처리할 구독이 없습니다.");
      return {
        ok: true,
        summary: {
          date: todayDate,
          dayOfWeek: dayName,
          totalSubscribers: 0,
          successCount: 0,
          failureCount: 0,
          alreadySentCount: 0,
          newlySentCount: 0,
          isTestMode,
        },
      };
    }

    // 모든 구독의 진행률을 한 번에 조회
    const { data: allProgress, error: progressError } = await supabaseAdmin
      .from("subscription_progress")
      .select("id, subscription_id, current_problem_index, total_problems_sent")
      .in("subscription_id", subscriptionIds);

    if (progressError) {
      logger.error("Failed to fetch subscription progress:", progressError);
      throw new Error("Failed to fetch subscription progress");
    }

    // 모든 구독의 오늘 delivery 상태를 한 번에 조회
    const { data: allDeliveries, error: deliveriesError } = await supabaseAdmin
      .from("deliveries")
      .select("id, subscription_id, status")
      .in("subscription_id", subscriptionIds)
      .eq("send_date", todayDate);

    if (deliveriesError) {
      logger.error("Failed to fetch deliveries:", deliveriesError);
      throw new Error("Failed to fetch deliveries");
    }

    // Map으로 변환하여 빠른 조회 (안전성 검사 추가)
    const progressMap = new Map(
      (allProgress || []).map((p) => [p.subscription_id, p])
    );
    const deliveryMap = new Map(
      (allDeliveries || []).map((d) => [d.subscription_id, d])
    );

    // Map 생성 검증
    logger.info(
      `📊 Map 생성 완료: progressMap ${progressMap.size}개, deliveryMap ${deliveryMap.size}개`
    );

    logger.info(
      `📊 배치 쿼리 완료: 진행률 ${progressMap.size}개, delivery ${deliveryMap.size}개`
    );

    let successCount = 0;
    let failureCount = 0;
    let alreadySentCount = 0;
    let newlySentCount = 0;

    // 배치 처리로 변경 (Rate Limiting 고려)
    const BATCH_SIZE = 10; // 배치 크기
    const BATCH_DELAY = 5000; // 배치 간 지연 (5초)

    logger.info(
      `⚡ 배치 처리 시작... (배치 크기: ${BATCH_SIZE}, 배치 간 지연: ${BATCH_DELAY}ms)`
    );

    // 성능 측정 시작
    const startTime = performance.now();
    const startDate = new Date();

    logger.info(`⏱️  처리 시작 시간: ${startDate.toISOString()}`);
    logger.info(`📊 처리 대상: ${subscriptions.length}개 구독`);

    const results: PromiseSettledResult<{
      success: boolean;
      email: string;
      alreadySent?: boolean;
    }>[] = [];

    // 배치별로 처리
    for (let i = 0; i < subscriptions.length; i += BATCH_SIZE) {
      const batch = subscriptions.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(subscriptions.length / BATCH_SIZE);

      logger.info(
        `📦 배치 ${batchNumber}/${totalBatches} 처리 중... (${batch.length}개 구독)`
      );

      const batchPromises = batch.map((subscription) => {
        const typedSubscription = subscription as unknown as Subscription;
        return processSubscription(typedSubscription, problems, todayDate, {
          isTestMode,
          logger,
          progressMap,
          deliveryMap,
        })
          .then((result) => ({
            success: result.success,
            email: typedSubscription.subscriber.email,
            alreadySent: result.alreadySent,
          }))
          .catch((error) => {
            logger.error(
              `❌ 구독 처리 중 오류 발생 ${typedSubscription.subscriber.email}:`,
              error
            );
            return {
              success: false,
              email: typedSubscription.subscriber.email,
            };
          });
      });

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);

      // 마지막 배치가 아니면 지연
      if (i + BATCH_SIZE < subscriptions.length) {
        logger.info(`⏳ ${BATCH_DELAY}ms 후 다음 배치 시작...`);
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
      }
    }

    // 성능 측정 완료
    const endTime = performance.now();
    const endDate = new Date();
    const totalTimeMs = endTime - startTime;
    const totalTimeSeconds = (totalTimeMs / 1000).toFixed(2);
    const avgTimePerSubscription = (totalTimeMs / subscriptions.length).toFixed(
      2
    );

    logger.info(`⏱️  처리 완료 시간: ${endDate.toISOString()}`);
    logger.info(
      `🚀 총 처리 시간: ${totalTimeSeconds}초 (${totalTimeMs.toFixed(0)}ms)`
    );
    logger.info(`📈 구독당 평균 처리 시간: ${avgTimePerSubscription}ms`);
    logger.info(
      `⚡ 처리 속도: ${(subscriptions.length / (totalTimeMs / 1000)).toFixed(
        2
      )}개/초`
    );

    // 결과 집계
    const failedEmails: string[] = [];

    for (const result of results) {
      if (result.status === "fulfilled") {
        if (result.value.success) {
          successCount++;
          if (result.value.alreadySent) {
            alreadySentCount++;
          } else {
            newlySentCount++;
          }
        } else {
          failureCount++;
          failedEmails.push(result.value.email);
        }
      } else {
        logger.error("Promise rejected:", result.reason);
        failureCount++;
      }
    }

    // 실패한 이메일 목록 로깅
    if (failedEmails.length > 0) {
      logger.error(`❌ 전송 실패한 이메일 목록 (${failedEmails.length}개):`);
      failedEmails.forEach((email) => {
        logger.error(`  - ${email}`);
      });
    }

    logger.info(
      `🎉 크론 작업 완료! 성공: ${successCount} (새로 전송: ${newlySentCount}, 이미 전송됨: ${alreadySentCount}), 실패: ${failureCount}`
    );

    // 성능 요약
    const throughput = (subscriptions.length / (totalTimeMs / 1000)).toFixed(2);

    logger.info(`📊 성능 요약:`);
    logger.info(`  ⏱️  총 처리 시간: ${totalTimeSeconds}초`);
    logger.info(`  📈 처리량: ${throughput}개/초`);
    logger.info(
      `  🎯 효율성: ${successCount}/${subscriptions.length} (${(
        (successCount / subscriptions.length) *
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
        totalSubscribers: subscriptions.length,
        successCount,
        failureCount,
        alreadySentCount,
        newlySentCount,
        isTestMode,
      },
    };
  } catch (error) {
    logger.error("Cron job error:", error);
    throw error;
  }
}

// 개별 구독 처리 함수
async function processSubscription(
  subscription: Subscription,
  problems: Problem[],
  todayDate: string,
  options: CronOptions
): Promise<{ success: boolean; alreadySent?: boolean }> {
  const { isTestMode, logger } = options;

  try {
    const subscriber = subscription.subscriber;

    // 최적화: Map에서 delivery 상태 조회 (개별 쿼리 대신)
    let existingDelivery: { id: string; status: string } | null = null;
    if (!isTestMode && options.deliveryMap) {
      existingDelivery = options.deliveryMap.get(subscription.id) || null;

      // Map 조회 결과 로깅 (디버깅용)
      if (existingDelivery) {
        logger.info(
          `📊 Map에서 delivery 조회 성공: ${subscriber.email} - ${existingDelivery.status}`
        );
      }

      if (existingDelivery && existingDelivery.status === "sent") {
        logger.info(
          `✅ 이미 성공적으로 전송됨 (중복 방지): ${subscriber.email} (${subscription.problem_list.name})`
        );
        return { success: true, alreadySent: true }; // 이미 성공한 경우 성공으로 처리
      } else if (existingDelivery && existingDelivery.status === "failed") {
        logger.info(
          `🔄 실패한 이메일 재전송 시도: ${subscriber.email} (${subscription.problem_list.name})`
        );
        // failed 상태의 delivery 기록이 있으면 재전송 시도 (삭제하지 않음)
      }
    }

    logger.info(
      `📧 메일 발송 시도: ${subscriber.email} (${subscription.problem_list.name})`
    );

    // 최적화: Map에서 진행률 조회 (개별 쿼리 대신)
    let subscriptionProgress: SubscriptionProgress | null = null;
    if (options.progressMap) {
      subscriptionProgress = options.progressMap.get(subscription.id) || null;

      // Map 조회 결과 로깅 (디버깅용)
      if (subscriptionProgress) {
        logger.info(
          `📊 Map에서 progress 조회 성공: ${subscriber.email} - ${subscriptionProgress.current_problem_index}번째 문제`
        );
      }
    }

    let currentProblemIndex = 0;
    if (subscriptionProgress) {
      currentProblemIndex = subscriptionProgress.current_problem_index;
    } else if (!isTestMode) {
      // First time subscription - start from beginning (테스트 모드가 아닐 때만)
      await supabaseAdmin.from("subscription_progress").insert({
        subscription_id: subscription.id,
        current_problem_index: 0,
        total_problems_sent: 0,
      });
    } else {
      // 테스트 모드에서는 새 구독도 0번째 문제부터 시작한다고 가정
      logger.test(
        `🧪 새 구독 ${subscriber.email} (${subscription.problem_list.name}): 0번째 문제부터 시작`
      );
    }

    // Get problems for this subscription's problem list
    const subscriptionProblems = problems.filter(
      (problem) => problem.problem_list_id === subscription.problem_list_id
    );

    if (subscriptionProblems.length === 0) {
      logger.error(
        `❌ 문제 리스트에 문제가 없음: ${subscription.problem_list.name}`
      );
      return { success: false };
    }

    // Get the next problem for this subscription
    const selectedProblem =
      subscriptionProblems[currentProblemIndex % subscriptionProblems.length];
    const problemNumber = currentProblemIndex + 1;

    logger.info(
      `📝 ${subscriber.email}의 ${problemNumber}번째 문제 (${
        subscription.problem_list.name
      }): ${selectedProblem.title}${
        selectedProblem.week ? ` (${selectedProblem.week}주차)` : ""
      }`
    );

    // 이메일 전송 시도 전에 기존 failed 기록만 queued로 업데이트
    // 새 delivery 기록은 성공한 경우에만 생성
    if (!isTestMode) {
      if (existingDelivery && existingDelivery.status === "failed") {
        // failed 상태의 기존 기록을 queued로 업데이트 (재전송 시도)
        const { error: updateError } = await supabaseAdmin
          .from("deliveries")
          .update({ status: "queued" })
          .eq("subscription_id", subscription.id)
          .eq("send_date", todayDate);

        if (updateError) {
          logger.error(
            `Failed to update delivery status for ${subscriber.email}:`,
            updateError
          );
          return { success: false };
        }
        logger.info(
          `🔄 failed 상태를 queued로 업데이트: ${subscriber.email} (${subscription.problem_list.name})`
        );
      }
      // 기존 기록이 없으면 아무것도 하지 않음 (성공한 경우에만 새로 생성)
    }

    // Send email (테스트 모드에 따라 분기)
    // 특정 구독만 취소할 수 있도록 subscription_id 사용
    const unsubscribeUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/unsubscribe?subscription_id=${subscription.id}`;

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

    logger.info(
      `📧 이메일 전송 결과: ${subscriber.email} - success: ${emailResult.success}`
    );

    if (emailResult.success) {
      logger.info(`✅ 이메일 전송 성공: ${subscriber.email}`);

      // 성공한 경우에만 delivery 기록 생성/업데이트 (테스트 모드가 아닐 때만)
      if (!isTestMode) {
        try {
          // 기존 delivery 기록이 있는지 확인
          const { data: existingDelivery } = await supabaseAdmin
            .from("deliveries")
            .select("id")
            .eq("subscription_id", subscription.id)
            .eq("send_date", todayDate)
            .single();

          if (existingDelivery) {
            // 기존 기록이 있으면 (queued 상태) sent로 업데이트
            await supabaseAdmin
              .from("deliveries")
              .update({ status: "sent" })
              .eq("subscription_id", subscription.id)
              .eq("send_date", todayDate);
            logger.info(
              `📊 delivery 상태를 sent로 업데이트: ${subscriber.email}`
            );
          } else {
            // 기존 기록이 없으면 새로 생성 (성공한 경우에만)
            await supabaseAdmin.from("deliveries").insert({
              subscriber_id: subscriber.id,
              subscription_id: subscription.id,
              problem_list_id: subscription.problem_list_id,
              send_date: todayDate,
              problem_id: selectedProblem.id,
              status: "sent",
            });
            logger.info(
              `📊 delivery 기록 생성 완료: ${subscriber.email} (${subscription.problem_list.name})`
            );
          }
        } catch (updateError) {
          logger.error(
            `❌ delivery 상태 업데이트 실패: ${subscriber.email} (${subscription.problem_list.name})`,
            updateError
          );
        }
      }

      // 성공한 경우에만 subscription progress 업데이트 (테스트 모드가 아닐 때만)
      if (!isTestMode) {
        let progressError = null;

        if (subscriptionProgress) {
          // 기존 데이터가 있으면 update
          const { error } = await supabaseAdmin
            .from("subscription_progress")
            .update({
              current_problem_index: currentProblemIndex + 1,
              total_problems_sent: subscriptionProgress.total_problems_sent + 1,
              updated_at: new Date().toISOString(),
            })
            .eq("subscription_id", subscription.id);
          progressError = error;
        } else {
          // 새 데이터면 insert
          const { error } = await supabaseAdmin
            .from("subscription_progress")
            .insert({
              subscription_id: subscription.id,
              current_problem_index: currentProblemIndex + 1,
              total_problems_sent: 1,
            });
          progressError = error;
        }

        if (progressError) {
          logger.error(
            `❌ subscription_progress 업데이트 실패: ${subscriber.email} (${subscription.problem_list.name})`,
            progressError
          );
        } else {
          logger.info(
            `📊 subscription_progress 업데이트 성공: ${subscriber.email} (${
              subscription.problem_list.name
            }) (${currentProblemIndex + 1}번째 문제)`
          );
        }
      } else {
        logger.test(`🧪 테스트 모드: subscription_progress 업데이트 건너뜀`);
      }

      return { success: true, alreadySent: false };
    } else {
      logger.error(
        `❌ 이메일 전송 실패: ${subscriber.email}`,
        "error" in emailResult ? emailResult.error : "Unknown error"
      );

      // 실패한 경우 기존 queued 기록이 있으면 failed로 업데이트, 없으면 아무것도 하지 않음
      if (!isTestMode) {
        try {
          // 기존 delivery 기록이 있는지 확인
          const { data: existingDelivery } = await supabaseAdmin
            .from("deliveries")
            .select("id, status")
            .eq("subscription_id", subscription.id)
            .eq("send_date", todayDate)
            .single();

          if (existingDelivery && existingDelivery.status === "queued") {
            // queued 상태의 기존 기록만 failed로 업데이트
            await supabaseAdmin
              .from("deliveries")
              .update({ status: "failed" })
              .eq("subscription_id", subscription.id)
              .eq("send_date", todayDate);
            logger.error(
              `📊 delivery 상태를 failed로 업데이트: ${subscriber.email} (${subscription.problem_list.name})`
            );
          } else {
            // 기존 기록이 없거나 이미 failed 상태면 아무것도 하지 않음
            logger.info(
              `📊 delivery 기록 없음 또는 이미 failed 상태: ${subscriber.email} (${subscription.problem_list.name})`
            );
          }
        } catch (updateError) {
          logger.error(
            `❌ delivery 상태 업데이트 실패: ${subscriber.email} (${subscription.problem_list.name})`,
            updateError
          );
        }
      }

      return { success: false };
    }
  } catch (error) {
    logger.error(
      `❌ 구독 처리 중 예외 발생 ${subscription.subscriber.email}:`,
      error
    );

    // 예외 발생 시 기존 queued 기록이 있으면 failed로 업데이트, 없으면 아무것도 하지 않음
    if (!isTestMode) {
      try {
        // 기존 delivery 기록이 있는지 확인
        const { data: existingDelivery } = await supabaseAdmin
          .from("deliveries")
          .select("id, status")
          .eq("subscription_id", subscription.id)
          .eq("send_date", todayDate)
          .single();

        if (existingDelivery && existingDelivery.status === "queued") {
          // queued 상태의 기존 기록만 failed로 업데이트
          await supabaseAdmin
            .from("deliveries")
            .update({ status: "failed" })
            .eq("subscription_id", subscription.id)
            .eq("send_date", todayDate);
          logger.error(
            `📊 delivery 상태를 failed로 업데이트: ${subscription.subscriber.email} (${subscription.problem_list.name})`
          );
        } else {
          // 기존 기록이 없거나 이미 failed 상태면 아무것도 하지 않음
          logger.info(
            `📊 delivery 기록 없음 또는 이미 failed 상태: ${subscription.subscriber.email} (${subscription.problem_list.name})`
          );
        }
      } catch (updateError) {
        logger.error(
          `❌ delivery 상태 업데이트 실패: ${subscription.subscriber.email} (${subscription.problem_list.name})`,
          updateError
        );
      }
    }

    return { success: false };
  }
}
