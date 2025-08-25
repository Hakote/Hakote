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

    console.log("🚀 관리자 테스트 크론 작업 시작");

    // 요청 본문에서 관리자 이메일 확인 (GitHub Actions에서 전달)
    let adminEmail = process.env.ADMIN_EMAIL; // 기본값

    try {
      const body = await request.json();
      if (body.admin_email) {
        adminEmail = body.admin_email;
        console.log(
          `📧 GitHub Actions에서 전달받은 관리자 이메일: ${adminEmail}`
        );
      }
    } catch (error) {
      console.log("📧 요청 본문 파싱 실패, 환경 변수 사용:", error);
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

    console.log("✅ 관리자 테스트 크론 작업 완료");

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

    // 관리자 이메일로 구독자 조회
    const { data: adminSubscriber, error: subscriberError } =
      await supabaseAdmin
        .from("subscribers")
        .select("id, email, frequency, unsubscribe_token, created_at")
        .eq("email", adminEmail)
        .eq("is_active", true)
        .single();

    if (subscriberError || !adminSubscriber) {
      logger.error("Failed to fetch admin subscriber:", subscriberError);
      throw new Error(`Admin subscriber not found: ${adminEmail}`);
    }

    logger.info(`📊 관리자 구독자 확인: ${adminSubscriber.email}`);

    // 빈도별 발송 조건 확인 (실제 로직과 동일)
    const shouldSendToday = (() => {
      switch (adminSubscriber.frequency) {
        case "2x": // 화, 목 (화요일=2, 목요일=4)
          return dayOfWeek === 2 || dayOfWeek === 4;
        case "3x": // 월, 수, 금 (월요일=1, 수요일=3, 금요일=5)
          return dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5;
        case "5x": // 평일 (월~금)
          return dayOfWeek >= 1 && dayOfWeek <= 5;
        default:
          return false;
      }
    })();

    if (!shouldSendToday) {
      logger.info(`📅 오늘(${dayName}요일) 발송 대상 구독자: 0명`);
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

    logger.info(`📅 오늘(${dayName}요일) 발송 대상 구독자 수: 1`);

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

    // 성능 측정 시작 (실제 로직과 동일)
    const startTime = performance.now();
    const startDate = new Date();

    logger.info(`⏱️  처리 시작 시간: ${startDate.toISOString()}`);
    logger.info(`📊 처리 대상: 1명`);

    // 관리자 구독자 처리 (실제 로직과 동일한 processAdminSubscriber 함수 사용)
    const result = await processAdminSubscriber(
      adminSubscriber,
      problems,
      todayDate,
      logger
    );

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
      `🎉 관리자 테스트 크론 작업 완료! 성공: ${
        result.success ? 1 : 0
      }, 실패: ${result.success ? 0 : 1}`
    );

    return {
      ok: true,
      summary: {
        date: todayDate,
        dayOfWeek: dayName,
        totalSubscribers: 1,
        successCount: result.success ? 1 : 0,
        failureCount: result.success ? 0 : 1,
        isTestMode: false,
        adminEmail,
      },
    };
  } catch (error) {
    logger.error("Admin test cron job error:", error);
    throw error;
  }
}

// 관리자 구독자 처리 함수 (실제 processSubscriber와 동일한 로직)
async function processAdminSubscriber(
  subscriber: import("@/lib/cron/core").Subscriber,
  problems: import("@/lib/cron/core").Problem[],
  todayDate: string,
  logger: import("@/lib/cron/core").Logger
): Promise<{ success: boolean }> {
  const isTestMode = false; // 관리자 테스트는 실제 발송

  try {
    // 테스트 모드가 아닐 때만 delivery 중복 체크 (성공한 경우만)
    let existingDelivery: { id: string; status: string } | null = null;
    if (!isTestMode) {
      const { data: deliveryData } = await supabaseAdmin
        .from("deliveries")
        .select("id, status")
        .eq("subscriber_id", subscriber.id)
        .eq("send_date", todayDate)
        .single();

      existingDelivery = deliveryData;

      if (existingDelivery && existingDelivery.status === "sent") {
        logger.info(`⏭️  이미 성공적으로 전송됨: ${subscriber.email}`);
        return { success: false };
      } else if (existingDelivery && existingDelivery.status === "failed") {
        logger.info(`🔄 실패한 이메일 재전송 시도: ${subscriber.email}`);
        // failed 상태의 delivery 기록이 있으면 재전송 시도 (삭제하지 않음)
      }
    }

    logger.info(`📧 메일 발송 시도: ${subscriber.email}`);

    // Get subscriber's current progress
    let subscriberProgress:
      | import("@/lib/cron/core").SubscriberProgress
      | null = null;
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

    // 이메일 전송 시도 전에 기존 failed 기록만 queued로 업데이트
    // 새 delivery 기록은 성공한 경우에만 생성
    if (!isTestMode) {
      if (existingDelivery && existingDelivery.status === "failed") {
        // failed 상태의 기존 기록을 queued로 업데이트 (재전송 시도)
        const { error: updateError } = await supabaseAdmin
          .from("deliveries")
          .update({ status: "queued" })
          .eq("subscriber_id", subscriber.id)
          .eq("send_date", todayDate);

        if (updateError) {
          logger.error(
            `Failed to update delivery status for ${subscriber.email}:`,
            updateError
          );
          return { success: false };
        }
        logger.info(`🔄 failed 상태를 queued로 업데이트: ${subscriber.email}`);
      }
      // 기존 기록이 없으면 아무것도 하지 않음 (성공한 경우에만 새로 생성)
    }

    // Send email (테스트 모드에 따라 분기)
    const unsubscribeUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/unsubscribe?token=${subscriber.unsubscribe_token}`;

    const emailResult = await sendEmail({
      to: subscriber.email,
      subject: `[하코테] 관리자 테스트 - 오늘의 문제: ${selectedProblem.title}`,
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

      // delivery 기록 생성
      try {
        await supabaseAdmin.from("deliveries").insert({
          subscriber_id: subscriber.id,
          send_date: todayDate,
          problem_id: selectedProblem.id,
          status: "sent",
        });
        logger.info(`📊 delivery 기록 생성 완료: ${subscriber.email}`);
      } catch (updateError) {
        logger.error(
          `❌ delivery 상태 업데이트 실패: ${subscriber.email}`,
          updateError
        );
      }

      // subscriber progress 업데이트
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

      return { success: true };
    } else {
      logger.error(
        `❌ 이메일 전송 실패: ${subscriber.email}`,
        "error" in emailResult ? emailResult.error : "Unknown error"
      );

      // 실패한 경우 delivery 기록 생성
      try {
        await supabaseAdmin.from("deliveries").insert({
          subscriber_id: subscriber.id,
          send_date: todayDate,
          problem_id: selectedProblem.id,
          status: "failed",
        });
        logger.error(`📊 delivery 상태를 failed로 기록: ${subscriber.email}`);
      } catch (updateError) {
        logger.error(
          `❌ delivery 상태 업데이트 실패: ${subscriber.email}`,
          updateError
        );
      }

      return { success: false };
    }
  } catch (error) {
    logger.error(
      `❌ 관리자 구독자 처리 중 예외 발생 ${subscriber.email}:`,
      error
    );

    // 예외 발생 시 delivery 기록 생성
    try {
      const selectedProblem = problems[0]; // 기본값
      await supabaseAdmin.from("deliveries").insert({
        subscriber_id: subscriber.id,
        send_date: todayDate,
        problem_id: selectedProblem.id,
        status: "failed",
      });
      logger.error(`📊 delivery 상태를 failed로 기록: ${subscriber.email}`);
    } catch (updateError) {
      logger.error(
        `❌ delivery 상태 업데이트 실패: ${subscriber.email}`,
        updateError
      );
    }

    return { success: false };
  }
}
