import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendEmail } from "@/lib/sendMail";
import { isWeekdayKST, yyyyMmDdKST, getDateHash } from "@/lib/date";

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
    const dateHash = getDateHash();

    console.log(`🚀 크론 작업 시작: ${todayDate}, 평일: ${isWeekday}`);

    // Get all active subscribers
    const { data: allSubscribers, error: subscribersError } =
      await supabaseAdmin
        .from("subscribers")
        .select("id, email, frequency, unsubscribe_token")
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

    // Get all active problems
    const { data: problems, error: problemsError } = await supabaseAdmin
      .from("problems")
      .select("id, title, url, difficulty")
      .eq("active", true);

    if (problemsError || !problems || problems.length === 0) {
      console.error("Failed to fetch problems:", problemsError);
      return NextResponse.json(
        { ok: false, error: "Failed to fetch problems" },
        { status: 500 }
      );
    }

    // Select problem based on date hash for consistency
    const selectedProblemIndex = dateHash % problems.length;
    const selectedProblem = problems[selectedProblemIndex];

    console.log(
      `📝 선택된 문제: ${selectedProblem.title} (${selectedProblem.difficulty})`
    );

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
          subject: `오늘의 문제: ${selectedProblem.title}`,
          title: selectedProblem.title,
          difficulty: selectedProblem.difficulty,
          url: selectedProblem.url,
          unsubscribeUrl,
        });

        // Update delivery status
        const { error: updateError } = await supabaseAdmin
          .from("deliveries")
          .update({ status: emailResult.success ? "sent" : "failed" })
          .eq("subscriber_id", subscriber.id)
          .eq("send_date", todayDate);

        if (emailResult.success) {
          console.log(`✅ 이메일 전송 성공: ${subscriber.email}`);
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
        selectedProblem: selectedProblem.title,
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
