import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/sendMail";

export async function POST(request: NextRequest) {
  try {
    // 개발 환경에서만 허용
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { ok: false, error: "테스트 기능은 개발 환경에서만 사용 가능합니다." },
        { status: 403 }
      );
    }

    // 추가 보안: 환경 변수로 테스트 모드 제어
    if (process.env.ENABLE_TEST_EMAIL !== "true") {
      return NextResponse.json(
        { ok: false, error: "테스트 기능이 비활성화되어 있습니다." },
        { status: 403 }
      );
    }

    // API 키 인증 (선택사항)
    const apiKey = request.headers.get("x-api-key");
    if (
      process.env.TEST_EMAIL_API_KEY &&
      apiKey !== process.env.TEST_EMAIL_API_KEY
    ) {
      return NextResponse.json(
        { ok: false, error: "인증에 실패했습니다." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { to } = body;

    if (!to) {
      return NextResponse.json(
        { ok: false, error: "이메일 주소가 필요합니다." },
        { status: 400 }
      );
    }

    // 실제 메일과 동일한 테스트 문제 데이터
    const testProblem = {
      title: "두 수의 합",
      difficulty: "easy",
      url: "https://leetcode.com/problems/two-sum/",
    };

    // 실제 메일과 동일한 제목과 내용으로 테스트 이메일 발송
    const result = await sendEmail({
      to,
      subject: "오늘의 문제: 두 수의 합",
      title: testProblem.title,
      difficulty: testProblem.difficulty,
      url: testProblem.url,
      unsubscribeUrl: `${
        process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
      }/api/unsubscribe?token=test-token`,
    });

    if (result.success) {
      return NextResponse.json({
        ok: true,
        message: "테스트 메일이 성공적으로 발송되었습니다.",
        data: result.data,
      });
    } else {
      return NextResponse.json(
        {
          ok: false,
          error: "메일 발송에 실패했습니다.",
          details: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Test email API error:", error);
    return NextResponse.json(
      { ok: false, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
