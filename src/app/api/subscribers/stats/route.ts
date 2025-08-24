import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    // 개발 환경에서만 허용
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json(
        { ok: false, error: "Stats endpoint only available in development" },
        { status: 403 }
      );
    }

    // 전체 활성 구독자 수
    const { data: allSubscribers, error: subscribersError } = await supabaseAdmin
      .from("subscribers")
      .select("frequency")
      .eq("is_active", true);

    if (subscribersError) {
      return NextResponse.json(
        { ok: false, error: "Failed to fetch subscribers" },
        { status: 500 }
      );
    }

    // 빈도별 구독자 수 계산
    const frequencyCounts = {
      "2x": allSubscribers?.filter((s) => s.frequency === "2x").length || 0,
      "3x": allSubscribers?.filter((s) => s.frequency === "3x").length || 0,
      "5x": allSubscribers?.filter((s) => s.frequency === "5x").length || 0,
    };

    const totalSubscribers = allSubscribers?.length || 0;

    return NextResponse.json({
      ok: true,
      stats: {
        total: totalSubscribers,
        frequency: frequencyCounts,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Subscriber stats error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
