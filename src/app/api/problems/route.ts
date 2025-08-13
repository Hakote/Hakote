import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    // Get all active problems from database
    const { data: problems, error } = await supabaseAdmin
      .from("problems")
      .select("id, source, title, url, difficulty, tags")
      .eq("active", true)
      .order("id");

    if (error) {
      console.error("Failed to fetch problems:", error);
      return NextResponse.json(
        { ok: false, error: "Failed to fetch problems" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data: problems });
  } catch (error) {
    console.error("Problems API error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
