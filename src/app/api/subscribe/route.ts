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
    const { email, frequency, consent, problem_list_name } = body;

    // Validation
    const validation = validateSubscribeRequest({ email, frequency, consent });
    if (!validation.isValid) {
      return NextResponse.json(
        { ok: false, error: validation.errors[0] },
        { status: 400 }
      );
    }

    // 문제 리스트 이름 검증
    if (!problem_list_name) {
      return NextResponse.json(
        { ok: false, error: "문제 리스트를 선택해주세요." },
        { status: 400 }
      );
    }

    // 문제 리스트 이름으로 ID 조회
    const { data: problemList, error: problemListError } = await supabaseAdmin
      .from("problem_lists")
      .select("id")
      .eq("name", problem_list_name)
      .eq("is_active", true)
      .single();

    if (problemListError || !problemList) {
      return NextResponse.json(
        { ok: false, error: "유효하지 않은 문제 리스트입니다." },
        { status: 400 }
      );
    }

    const problem_list_id = problemList.id;

    // Upsert subscriber (재구독 추적 로직 제거 - subscriptions로 이동)
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
      // 기존 구독 확인 (재구독 추적을 위해)
      const { data: existingSubscription } = await supabaseAdmin
        .from("subscriptions")
        .select("id, is_active, resubscribe_count")
        .eq("subscriber_id", data.id)
        .eq("problem_list_id", problem_list_id)
        .single();

      // 선택된 문제 리스트에 구독 생성 (재구독 추적 포함)
      const { data: subscriptionData, error: subscriptionError } =
        await supabaseAdmin
          .from("subscriptions")
          .upsert(
            {
              subscriber_id: data.id,
              problem_list_id,
              frequency,
              is_active: true,
              // 재구독 추적 로직 (각 문제 리스트별)
              resubscribe_count:
                existingSubscription && !existingSubscription.is_active
                  ? (existingSubscription.resubscribe_count || 0) + 1
                  : 0,
              last_resubscribed_at:
                existingSubscription && !existingSubscription.is_active
                  ? new Date().toISOString()
                  : null,
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
        } else {
          // 기존 구독자 재구독 시 progress 유지
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

    // 성공 시 상태 코드만 반환 (응답 본문 없음)
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("Subscribe API error:", error);
    return NextResponse.json(
      { ok: false, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
