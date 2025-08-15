import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendTestEmail } from "@/lib/sendMail";
import { isWeekdayKST, yyyyMmDdKST } from "@/lib/date";

export async function GET() {
  return NextResponse.json({
    ok: true,
    message:
      "Test cron endpoint is working. Use POST method for test execution.",
    timestamp: new Date().toISOString(),
  });
}

export async function POST() {
  try {
    // 개발 환경에서만 허용
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json(
        { ok: false, error: "Test endpoint only available in development" },
        { status: 403 }
      );
    }

    console.log("🧪 테스트 크론 작업 시작...");

    const todayDate = yyyyMmDdKST();
    const isWeekday = isWeekdayKST();

    console.log(`🚀 테스트 크론 작업 시작: ${todayDate}, 평일: ${isWeekday}`);

    // Get all active subscribers
    const { data: allSubscribers, error: subscribersError } =
      await supabaseAdmin
        .from("subscribers")
        .select("id, email, frequency, unsubscribe_token, created_at")
        .eq("is_active", true);

    if (subscribersError) {
      console.error("Failed to fetch subscribers:", subscribersError);
      return NextResponse.json(
        { ok: false, error: "Failed to fetch subscribers" },
        { status: 500 }
      );
    }

    if (!allSubscribers || allSubscribers.length === 0) {
      console.log("No active subscribers found");
      return NextResponse.json({ ok: true, message: "No active subscribers" });
    }

    console.log(`📊 전체 구독자 수: ${allSubscribers.length}`);

    // 테스트용: 빈도 필터링 적용 (실제 로직과 동일)
    const currentDateKST = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" })
    );
    const dayOfWeek = currentDateKST.getDay();

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

    console.log(
      `🧪 테스트 발송 대상 구독자 수: ${subscribers.length} (${dayOfWeek}요일)`
    );

    // Get all active problems
    const { data: problems, error: problemsError } = await supabaseAdmin
      .from("problems")
      .select("id, title, url, difficulty, week")
      .eq("active", true)
      .order("week", { ascending: true })
      .order("created_at", { ascending: true });

    if (problemsError || !problems || problems.length === 0) {
      console.error("Failed to fetch problems:", problemsError);
      return NextResponse.json(
        { ok: false, error: "Failed to fetch problems" },
        { status: 500 }
      );
    }

    console.log(`📚 전체 문제 수: ${problems.length}`);

    let successCount = 0;
    let failureCount = 0;

    // Send test emails to all subscribers
    for (const subscriber of subscribers) {
      try {
        console.log(`🧪 테스트 메일 발송 시도: ${subscriber.email}`);

        // Get subscriber's current progress
        const { data: subscriberProgress } = await supabaseAdmin
          .from("subscriber_progress")
          .select("current_problem_index, total_problems_sent")
          .eq("subscriber_id", subscriber.id)
          .single();

        let currentProblemIndex = 0;
        if (subscriberProgress) {
          currentProblemIndex = subscriberProgress.current_problem_index;
        } else {
          // First time subscriber - start from beginning
          await supabaseAdmin.from("subscriber_progress").insert({
            subscriber_id: subscriber.id,
            current_problem_index: 0,
            total_problems_sent: 0,
          });
        }

        // Get the next problem for this subscriber
        const selectedProblem = problems[currentProblemIndex % problems.length];
        const problemNumber = currentProblemIndex + 1;

        console.log(
          `📝 ${subscriber.email}의 ${problemNumber}번째 문제: ${
            selectedProblem.title
          }${selectedProblem.week ? ` (${selectedProblem.week}주차)` : ""}`
        );

        // Send test email (실제 전송하지 않음)
        const unsubscribeUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/unsubscribe?token=${subscriber.unsubscribe_token}`;

        const emailResult = await sendTestEmail({
          to: subscriber.email,
          subject: `[하코테] 오늘의 문제: ${selectedProblem.title}`,
          title: selectedProblem.title,
          difficulty: selectedProblem.difficulty,
          url: selectedProblem.url,
          unsubscribeUrl,
        });

        if (emailResult.success) {
          console.log(`✅ 테스트 이메일 전송 성공: ${subscriber.email}`);

          // Update subscriber progress (실제로 업데이트)
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
            console.error(
              `❌ subscriber_progress 업데이트 실패: ${subscriber.email}`,
              progressError
            );
          } else {
            console.log(
              `📊 subscriber_progress 업데이트 성공: ${subscriber.email} (${
                currentProblemIndex + 1
              }번째 문제)`
            );
          }

          successCount++;
        } else {
          console.error(
            `❌ 테스트 이메일 전송 실패: ${subscriber.email}`,
            "error" in emailResult ? emailResult.error : "Unknown error"
          );
          failureCount++;
        }
      } catch (error) {
        console.error(
          `Error processing subscriber ${subscriber.email}:`,
          error
        );
        failureCount++;
      }
    }

    console.log(
      `🎉 테스트 크론 작업 완료! 성공: ${successCount}, 실패: ${failureCount}`
    );

    return NextResponse.json({
      ok: true,
      summary: {
        date: todayDate,
        totalSubscribers: subscribers.length,
        successCount,
        failureCount,
        mode: "test",
      },
    });
  } catch (error) {
    console.error("Test cron job error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
