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
    const { email, frequency, consent, problem_list_id } = body;

    // Validation
    const validation = validateSubscribeRequest({ email, frequency, consent });
    if (!validation.isValid) {
      return NextResponse.json(
        { ok: false, error: validation.errors[0] },
        { status: 400 }
      );
    }

    // 문제 리스트 ID 검증
    if (!problem_list_id) {
      return NextResponse.json(
        { ok: false, error: "문제 리스트를 선택해주세요." },
        { status: 400 }
      );
    }

    // 기존 구독자 확인
    const { data: existingSubscriber } = await supabaseAdmin
      .from("subscribers")
      .select("id, is_active, resubscribe_count")
      .eq("email", email.toLowerCase())
      .single();

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
          // 재구독 추적 로직
          resubscribe_count:
            existingSubscriber && !existingSubscriber.is_active
              ? (existingSubscriber.resubscribe_count || 0) + 1
              : 0,
          last_resubscribed_at:
            existingSubscriber && !existingSubscriber.is_active
              ? new Date().toISOString()
              : null,
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
      // 선택된 문제 리스트에 구독 생성
      const { data: subscriptionData, error: subscriptionError } =
        await supabaseAdmin
          .from("subscriptions")
          .upsert(
            {
              subscriber_id: data.id,
              problem_list_id,
              frequency,
              is_active: true,
            },
            {
              onConflict: "subscriber_id,problem_list_id",
              ignoreDuplicates: false,
            }
          )
          .select()
          .single();

      if (subscriptionError) {
        console.error("Failed to create subscription:", subscriptionError);
      } else if (subscriptionData) {
        // 기존 subscription progress가 있는지 확인
        const { data: existingProgress } = await supabaseAdmin
          .from("subscription_progress")
          .select("current_problem_index, total_problems_sent")
          .eq("subscription_id", subscriptionData.id)
          .single();

        if (!existingProgress) {
          // 새 구독자인 경우에만 progress 생성
          await supabaseAdmin.from("subscription_progress").upsert(
            {
              subscription_id: subscriptionData.id,
              current_problem_index: 0,
              total_problems_sent: 0,
            },
            {
              onConflict: "subscription_id",
              ignoreDuplicates: false,
            }
          );
          console.log(
            `📊 새 구독자 progress 생성: ${data.email} (${problem_list_id})`
          );
        } else {
          // 기존 구독자 재구독 시 progress 유지
          console.log(
            `📊 기존 progress 유지: ${data.email} (${problem_list_id}, ${existingProgress.current_problem_index}번째 문제)`
          );
        }
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
