import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendEmail } from "@/lib/sendMail";
import { isWeekdayKST, yyyyMmDdKST } from "@/lib/date";

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

    const todayDate = yyyyMmDdKST();
    const isWeekday = isWeekdayKST();

    console.log(`🚀 크론 작업 시작: ${todayDate}, 평일: ${isWeekday}`);

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
    allSubscribers.forEach((sub) => {
      console.log(`  - ${sub.email} (${sub.frequency})`);
    });

    // Filter subscribers based on frequency and current day
    const currentDate = new Date();
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

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
      console.log(`No subscribers to send email today (day: ${dayOfWeek})`);
      return NextResponse.json({
        ok: true,
        message: "No subscribers to send email today",
      });
    }

    console.log(`📅 오늘 발송 대상 구독자 수: ${subscribers.length}`);
    subscribers.forEach((sub) => {
      console.log(`  - ${sub.email} (${sub.frequency})`);
    });

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

    // Send emails to all subscribers
    for (const subscriber of subscribers) {
      try {
        // Check if delivery already exists for today
        const { data: existingDelivery } = await supabaseAdmin
          .from("deliveries")
          .select("id")
          .eq("subscriber_id", subscriber.id)
          .eq("send_date", todayDate)
          .single();

        if (existingDelivery) {
          console.log(`⏭️  이미 전송됨: ${subscriber.email}`);
          continue;
        }

        console.log(`📧 메일 발송 시도: ${subscriber.email}`);

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

        // Create delivery record
        const { error: deliveryError } = await supabaseAdmin
          .from("deliveries")
          .insert({
            subscriber_id: subscriber.id,
            send_date: todayDate,
            problem_id: selectedProblem.id,
            status: "queued",
          });

        if (deliveryError) {
          console.error(
            `Failed to create delivery for ${subscriber.email}:`,
            deliveryError
          );
          failureCount++;
          continue;
        }

        // Send email
        const unsubscribeUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/unsubscribe?token=${subscriber.unsubscribe_token}`;

        const emailResult = await sendEmail({
          to: subscriber.email,
          subject: `[하코테] 오늘의 문제: ${selectedProblem.title}`,
          title: selectedProblem.title,
          difficulty: selectedProblem.difficulty,
          url: selectedProblem.url,
          unsubscribeUrl,
        });

        // Update delivery status
        await supabaseAdmin
          .from("deliveries")
          .update({ status: emailResult.success ? "sent" : "failed" })
          .eq("subscriber_id", subscriber.id)
          .eq("send_date", todayDate);

        if (emailResult.success) {
          console.log(`✅ 이메일 전송 성공: ${subscriber.email}`);

          // Update subscriber progress
          await supabaseAdmin.from("subscriber_progress").upsert({
            subscriber_id: subscriber.id,
            current_problem_index: currentProblemIndex + 1,
            total_problems_sent:
              (subscriberProgress?.total_problems_sent || 0) + 1,
          });

          successCount++;
        } else {
          console.error(
            `❌ 이메일 전송 실패: ${subscriber.email}`,
            emailResult.error
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
      `🎉 크론 작업 완료! 성공: ${successCount}, 실패: ${failureCount}`
    );

    return NextResponse.json({
      ok: true,
      summary: {
        date: todayDate,
        totalSubscribers: subscribers.length,
        successCount,
        failureCount,
      },
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
