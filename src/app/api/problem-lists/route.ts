import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/** 활성화된 문제 리스트 조회 */
export async function GET() {
  try {
    const { data: problemLists, error } = await supabaseAdmin
      .from("problem_lists")
      .select("id, name, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("Failed to fetch problem lists:", error);
      return NextResponse.json(
        { ok: false, error: "문제 리스트 조회에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      problemLists: problemLists || [],
    });
  } catch (error) {
    console.error("Problem lists API error:", error);
    return NextResponse.json(
      { ok: false, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
