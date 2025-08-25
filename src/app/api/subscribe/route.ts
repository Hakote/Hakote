import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { validateSubscribeRequest } from "@/lib/validation";
import { rateLimit } from "@/lib/rateLimit";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    if (!rateLimit.check(ip, 5, 60 * 1000)) {
      // 5 requests per minute
      return NextResponse.json(
        {
          ok: false,
          error: "너무 많은 요청입니다. 잠시 후 다시 시도해주세요.",
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, frequency, consent } = body;

    // Validation
    const validation = validateSubscribeRequest({ email, frequency, consent });
    if (!validation.isValid) {
      return NextResponse.json(
        { ok: false, error: validation.errors[0] },
        { status: 400 }
      );
    }

    // Upsert subscriber
    const { data, error } = await supabaseAdmin
      .from("subscribers")
      .upsert(
        {
          email: email.toLowerCase(),
          frequency,
          is_active: true,
          unsubscribe_token: randomUUID(),
          tz: "Asia/Seoul", // 기본값으로 한국 시간대 설정
        },
        {
          onConflict: "email",
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    // 재구독 시 기존 progress 유지 (초기화하지 않음)
    if (data) {
      // 기존 progress가 있는지 확인
      const { data: existingProgress } = await supabaseAdmin
        .from("subscriber_progress")
        .select("current_problem_index, total_problems_sent")
        .eq("subscriber_id", data.id)
        .single();

      if (!existingProgress) {
        // 새 구독자인 경우에만 progress 생성
        await supabaseAdmin.from("subscriber_progress").upsert(
          {
            subscriber_id: data.id,
            current_problem_index: 0,
            total_problems_sent: 0,
          },
          {
            onConflict: "subscriber_id",
            ignoreDuplicates: false,
          }
        );
        console.log(`📊 새 구독자 progress 생성: ${data.email}`);
      } else {
        // 기존 구독자 재구독 시 progress 유지
        console.log(
          `📊 기존 progress 유지: ${data.email} (${existingProgress.current_problem_index}번째 문제)`
        );
      }
    }

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { ok: false, error: "구독 처리 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("Subscribe API error:", error);
    return NextResponse.json(
      { ok: false, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
