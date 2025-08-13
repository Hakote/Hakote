import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { validateSubscribeRequest } from "@/lib/validation";
import { rateLimit } from "@/lib/rateLimit";

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
        },
        {
          onConflict: "email",
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

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
