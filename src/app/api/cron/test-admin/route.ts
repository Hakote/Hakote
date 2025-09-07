import { NextRequest, NextResponse } from "next/server";
import { ProductionLogger } from "@/lib/cron/loggers";
import { supabaseAdmin } from "@/lib/supabase";
import { sendEmail } from "@/lib/sendMail";

export async function GET() {
  return NextResponse.json({
    ok: true,
    message:
      "Admin test endpoint is working. Use POST method with x-cron-secret header for actual execution.",
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

    // 요청 본문에서 관리자 이메일 확인 (GitHub Actions에서 전달)
    let adminEmail = process.env.ADMIN_EMAIL; // 기본값

    try {
      const body = await request.json();
      if (body.admin_email) {
        adminEmail = body.admin_email;
      }
    } catch {
      // 요청 본문 파싱 실패 시 환경 변수 사용
    }

    if (!adminEmail) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "ADMIN_EMAIL not provided in request body or environment variable",
        },
        { status: 500 }
      );
    }

    // 운영용 로거 사용
    const logger = new ProductionLogger();

    // 관리자 이메일로만 구독자 필터링하는 커스텀 로직 (실제 로직과 동일하게)
    const result = await executeCronCoreWithAdminFilter({
      adminEmail,
      logger,
    });

    return NextResponse.json({
      ok: true,
      message: "Admin test email job completed successfully",
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ 관리자 테스트 크론 작업 실패:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to execute admin test cron job",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// 관리자 이메일만 필터링하는 커스텀 크론 로직
async function executeCronCoreWithAdminFilter({
  adminEmail,
  logger,
}: {
  adminEmail: string;
  logger: import("@/lib/cron/core").Logger;
}) {
  const { yyyyMmDdKST, getDayName, nowKST } = await import("@/lib/date");

  try {
    // KST 기준 날짜 및 요일 계산
    const todayDate = yyyyMmDdKST();
    const currentDateKST = nowKST();
    const dayOfWeek = currentDateKST.getDay();
    const dayName = getDayName(dayOfWeek);

    logger.info(
      `🚀 관리자 테스트 크론 작업 시작: ${todayDate} (${dayName}요일)`
    );
    logger.info(`📧 관리자 이메일: ${adminEmail}`);
    logger.info(`🔧 관리자 테스트 모드: 빈도 조건 무시하고 모든 구독 전송`);

    // 관리자 이메일로 구독 조회 (새로운 멀티 구독 시스템)
    logger.info(`🔍 관리자 이메일로 구독 조회 시작: ${adminEmail}`);

    const { data: adminSubscriptions, error: subscriptionsError } =
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
            id, email, frequency, unsubscribe_token, created_at
          ),
          problem_list:problem_lists!inner(
            id, name
          )
        `
        )
        .eq("subscriber.email", adminEmail)
        .eq("is_active", true)
        .eq("subscriber.is_active", true);

    logger.info(`🔍 쿼리 결과: ${adminSubscriptions?.length || 0}개 구독 발견`);
    if (subscriptionsError) {
      logger.error(`❌ 쿼리 에러:`, subscriptionsError);
    }

    if (
      subscriptionsError ||
      !adminSubscriptions ||
      adminSubscriptions.length === 0
    ) {
      logger.error("Failed to fetch admin subscriptions:", subscriptionsError);
      throw new Error(`Admin subscriptions not found: ${adminEmail}`);
    }

    logger.info(`📊 관리자 구독 확인: ${adminSubscriptions.length}개 구독`);

    // 관리자 테스트: 빈도별 발송 조건 무시하고 모든 구독 전송
    const targetSubscriptions = adminSubscriptions.map((subscription) => {
      // 실제 빈도별 발송 조건 확인 (로깅용)
      let shouldSendNormally = false;
      switch (subscription.frequency) {
        case "2x": // 화, 목 (화요일=2, 목요일=4)
          shouldSendNormally = dayOfWeek === 2 || dayOfWeek === 4;
          break;
        case "3x": // 월, 수, 금 (월요일=1, 수요일=3, 금요일=5)
          shouldSendNormally =
            dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5;
          break;
        case "5x": // 평일 (월~금)
          shouldSendNormally = dayOfWeek >= 1 && dayOfWeek <= 5;
          break;
        default:
          shouldSendNormally = false;
      }

      // 관리자 테스트 로깅
      const typedSubscription =
        subscription as unknown as import("@/lib/cron/core").Subscription;
      if (!shouldSendNormally) {
        logger.info(
          `🔧 관리자 테스트 - 빈도 조건 무시: ${typedSubscription.subscriber.email} (${typedSubscription.problem_list.name}) - 실제로는 ${typedSubscription.frequency} 주기이지만 테스트용으로 전송`
        );
      } else {
        logger.info(
          `✅ 관리자 테스트 - 정상 발송 조건: ${typedSubscription.subscriber.email} (${typedSubscription.problem_list.name}) - ${typedSubscription.frequency} 주기`
        );
      }

      return subscription;
    });

    // 관리자 테스트에서는 항상 구독이 있으면 전송 (빈 배열 체크 불필요)
    if (targetSubscriptions.length === 0) {
      logger.info(`📅 관리자 구독이 없습니다.`);
      return {
        ok: true,
        summary: {
          date: todayDate,
          dayOfWeek: dayName,
          totalSubscribers: 0,
          successCount: 0,
          failureCount: 0,
          isTestMode: false,
          adminEmail,
        },
      };
    }

    logger.info(
      `📅 관리자 테스트 - 오늘(${dayName}요일) 발송 대상 구독 수: ${targetSubscriptions.length}개 (빈도 조건 무시)`
    );

    // Get all active problems from all problem lists
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

    // 성능 측정 시작 (실제 로직과 동일)
    const startTime = performance.now();
    const startDate = new Date();

    logger.info(`⏱️  처리 시작 시간: ${startDate.toISOString()}`);
    logger.info(`📊 처리 대상: ${targetSubscriptions.length}개 구독`);

    // 최적화: 배치로 진행률과 delivery 상태 조회 (core.ts와 동일한 로직)
    const subscriptionIds = targetSubscriptions.map((s) => s.id);

    // 빈 배열 체크
    if (subscriptionIds.length === 0) {
      logger.info("📊 처리할 관리자 구독이 없습니다.");
      return {
        ok: true,
        summary: {
          date: todayDate,
          dayOfWeek: dayName,
          totalSubscribers: 0,
          successCount: 0,
          failureCount: 0,
          isTestMode: false,
          adminEmail,
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

    // Map으로 변환하여 빠른 조회 (core.ts와 동일한 최적화)
    const progressMap = new Map(
      (allProgress || []).map((p) => [p.subscription_id, p])
    );
    const deliveryMap = new Map(
      (allDeliveries || []).map((d) => [d.subscription_id, d])
    );

    logger.info(
      `📊 배치 쿼리 완료: 진행률 ${progressMap.size}개, delivery ${deliveryMap.size}개`
    );

    // 관리자 구독들 처리 (최적화된 로직 사용)
    let successCount = 0;
    let failureCount = 0;

    for (const subscription of targetSubscriptions) {
      const typedSubscription =
        subscription as unknown as import("@/lib/cron/core").Subscription;
      const result = await processAdminSubscription(
        typedSubscription,
        problems,
        todayDate,
        logger,
        progressMap,
        deliveryMap
      );

      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    // 성능 측정 완료
    const endTime = performance.now();
    const endDate = new Date();
    const totalTimeMs = endTime - startTime;
    const totalTimeSeconds = (totalTimeMs / 1000).toFixed(2);

    logger.info(`⏱️  처리 완료 시간: ${endDate.toISOString()}`);
    logger.info(
      `🚀 총 처리 시간: ${totalTimeSeconds}초 (${totalTimeMs.toFixed(0)}ms)`
    );

    logger.info(
      `🎉 관리자 테스트 크론 작업 완료! 성공: ${successCount}, 실패: ${failureCount} (빈도 조건 무시하고 전송)`
    );

    return {
      ok: true,
      summary: {
        date: todayDate,
        dayOfWeek: dayName,
        totalSubscribers: targetSubscriptions.length,
        successCount,
        failureCount,
        isTestMode: false,
        adminEmail,
      },
    };
  } catch (error) {
    logger.error("Admin test cron job error:", error);
    throw error;
  }
}

// 관리자 구독 처리 함수 (최적화된 멀티 구독 시스템)
async function processAdminSubscription(
  subscription: import("@/lib/cron/core").Subscription,
  problems: import("@/lib/cron/core").Problem[],
  todayDate: string,
  logger: import("@/lib/cron/core").Logger,
  progressMap: Map<string, import("@/lib/cron/core").SubscriptionProgress>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _deliveryMap: Map<string, { id: string; status: string }> // 관리자 테스트에서는 중복 전송 허용하므로 사용하지 않음
): Promise<{ success: boolean; alreadySent?: boolean }> {
  const isTestMode = false; // 관리자 테스트는 실제 발송
  const subscriber = subscription.subscriber;

  try {
    // 관리자 테스트는 항상 중복 전송 허용 (하루에 여러 번 테스트 가능)
    logger.info(
      `🔧 관리자 테스트 - 중복 전송 허용: ${subscriber.email} (${subscription.problem_list.name}) - 빈도 조건 무시하고 전송`
    );

    logger.info(
      `📧 메일 발송 시도: ${subscriber.email} (${subscription.problem_list.name})`
    );

    // 최적화: Map에서 진행률 조회 (개별 쿼리 대신)
    let subscriptionProgress:
      | import("@/lib/cron/core").SubscriptionProgress
      | null = null;
    subscriptionProgress = progressMap.get(subscription.id) || null;

    // Map 조회 결과 로깅 (디버깅용)
    if (subscriptionProgress) {
      logger.info(
        `📊 Map에서 progress 조회 성공: ${subscriber.email} - ${subscriptionProgress.current_problem_index}번째 문제`
      );
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

    // 관리자 테스트는 기존 기록 처리 없이 바로 전송

    // Send email (테스트 모드에 따라 분기)
    // 특정 구독만 취소할 수 있도록 subscription_id 사용
    const unsubscribeUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/unsubscribe?subscription_id=${subscription.id}`;

    const emailResult = await sendEmail({
      to: subscriber.email,
      subject: `[하코테] 관리자 테스트 - 오늘의 문제: ${selectedProblem.title} (${subscription.problem_list.name})`,
      title: selectedProblem.title,
      difficulty: selectedProblem.difficulty,
      url: selectedProblem.url,
      unsubscribeUrl,
    });

    logger.info(
      `📧 이메일 전송 결과: ${subscriber.email} (${subscription.problem_list.name}) - success: ${emailResult.success}`
    );

    if (emailResult.success) {
      logger.info(
        `✅ 이메일 전송 성공: ${subscriber.email} (${subscription.problem_list.name})`
      );

      // 관리자 테스트는 delivery 기록 생성하지 않음
      logger.info(
        `🔧 관리자 테스트 - delivery 기록 생략: ${subscriber.email} (${subscription.problem_list.name})`
      );

      // subscription progress 업데이트
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

      return { success: true };
    } else {
      logger.error(
        `❌ 이메일 전송 실패: ${subscriber.email} (${subscription.problem_list.name})`,
        "error" in emailResult ? emailResult.error : "Unknown error"
      );

      // 관리자 테스트는 failed delivery 기록도 생성하지 않음
      logger.info(
        `🔧 관리자 테스트 - failed delivery 기록 생략: ${subscriber.email} (${subscription.problem_list.name})`
      );

      return { success: false };
    }
  } catch (error) {
    logger.error(
      `❌ 관리자 구독 처리 중 예외 발생 ${subscriber.email} (${subscription.problem_list.name}):`,
      error
    );

    // 관리자 테스트는 예외 시에도 delivery 기록 생성하지 않음
    logger.info(
      `🔧 관리자 테스트 - 예외 시 failed delivery 기록 생략: ${subscriber.email} (${subscription.problem_list.name})`
    );

    return { success: false };
  }
}
