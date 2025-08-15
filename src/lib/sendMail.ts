import { Resend } from "resend";
import { EmailTemplate } from "./email";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendEmailParams {
  to: string;
  subject: string;
  title: string;
  difficulty: string;
  url: string;
  unsubscribeUrl: string;
}

export const sendEmail = async (params: SendEmailParams) => {
  try {
    const { to, subject, title, difficulty, url, unsubscribeUrl } = params;

    const emailHtml = EmailTemplate({
      title,
      difficulty,
      url,
      unsubscribeUrl,
    });

    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || "Hakote <noreply@hakote.dev>",
      to: [to],
      subject,
      html: emailHtml,
      reply_to: process.env.NEXT_PUBLIC_SUPPORT_EMAIL!,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to send email:", error);
    return { success: false, error };
  }
};

// 테스트용 이메일 전송 (실제 전송하지 않고 로그만 출력)
export const sendTestEmail = async (params: SendEmailParams) => {
  const { to, subject, title, difficulty, url, unsubscribeUrl } = params;

  console.log("🧪 테스트 이메일 전송 시뮬레이션:");
  console.log(`  📧 To: ${to}`);
  console.log(`  📝 Subject: ${subject}`);
  console.log(`  🎯 Title: ${title}`);
  console.log(`  ⚡ Difficulty: ${difficulty}`);
  console.log(`  🔗 URL: ${url}`);
  console.log(`  🚫 Unsubscribe: ${unsubscribeUrl}`);

  // 실제 전송하지 않고 성공으로 반환
  return { success: true, data: { id: "test-email-id" } };
};
