import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return new NextResponse(
        generateUnsubscribePage("유효하지 않은 구독 해지 링크입니다.", false),
        {
          status: 400,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      );
    }

    // Find and deactivate subscriber
    const { data, error } = await supabaseAdmin
      .from("subscribers")
      .update({
        is_active: false,
        last_unsubscribed_at: new Date().toISOString(),
      })
      .eq("unsubscribe_token", token)
      .select()
      .single();

    if (error || !data) {
      return new NextResponse(
        generateUnsubscribePage(
          "구독 해지 처리 중 오류가 발생했습니다.",
          false
        ),
        {
          status: 404,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      );
    }

    return new NextResponse(
      generateUnsubscribePage("구독 해지가 완료되었습니다.", true),
      {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  } catch (error) {
    console.error("Unsubscribe API error:", error);
    return new NextResponse(
      generateUnsubscribePage("서버 오류가 발생했습니다.", false),
      {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }
}

function generateUnsubscribePage(message: string, success: boolean) {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>구독 해지 - 하코테</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0A0A23 0%, #1A1A2E 100%);
            color: #FFFFFF;
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: rgba(26, 26, 46, 0.9);
            border-radius: 12px;
            padding: 40px;
            text-align: center;
            max-width: 500px;
            width: 100%;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        .icon {
            font-size: 48px;
            margin-bottom: 20px;
        }
        h1 {
            margin: 0 0 16px 0;
            font-size: 24px;
            font-weight: bold;
        }
        p {
            margin: 0 0 24px 0;
            color: #A0AEC0;
            line-height: 1.6;
        }
        .button {
            display: inline-block;
            background: ${success ? "#10B981" : "#EF4444"};
            color: #FFFFFF;
            padding: 12px 24px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 500;
            transition: opacity 0.2s;
        }
        .button:hover {
            opacity: 0.9;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">${success ? "✅" : "❌"}</div>
        <h1>${success ? "구독 해지 완료" : "오류 발생"}</h1>
        <p>${message}</p>
        <a href="/" class="button">홈으로 돌아가기</a>
    </div>
</body>
</html>
  `;
}
