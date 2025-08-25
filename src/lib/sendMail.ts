import { Resend } from "resend";
import { EmailTemplate } from "./email";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const resend = new Resend(process.env.RESEND_API_KEY);

// AWS SES 클라이언트 초기화
const sesClient = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export interface SendEmailParams {
  to: string;
  subject: string;
  title: string;
  difficulty: string;
  url: string;
  unsubscribeUrl: string;
}

// AWS SES를 사용한 이메일 전송
export const sendEmailWithSES = async (params: SendEmailParams) => {
  const maxRetries = 3;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { to, subject, title, difficulty, url, unsubscribeUrl } = params;

      const emailHtml = EmailTemplate({
        title,
        difficulty,
        url,
        unsubscribeUrl,
      });

      const command = new SendEmailCommand({
        Source: process.env.EMAIL_FROM || "noreply@hakote.dev",
        Destination: {
          ToAddresses: [to],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: "UTF-8",
          },
          Body: {
            Html: {
              Data: emailHtml,
              Charset: "UTF-8",
            },
          },
        },
        ReplyToAddresses: [process.env.NEXT_PUBLIC_SUPPORT_EMAIL!],
        // SES에서는 List-Unsubscribe 헤더를 직접 설정할 수 없으므로
        // 이메일 본문에 포함하거나 별도 처리 필요
      });

      const result = await sesClient.send(command);

      console.log(`✅ AWS SES 이메일 전송 성공 (${to}):`, result.MessageId);
      return { success: true, data: result };
    } catch (error) {
      lastError = error;
      console.error(
        `❌ AWS SES 이메일 전송 실패 (${params.to}) - 시도 ${attempt}/${maxRetries}:`,
        error
      );

      if (attempt < maxRetries) {
        // Rate limiting을 위한 지연 (1초, 2초, 4초)
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`⏳ ${delay}ms 후 재시도...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // 모든 재시도 실패
  console.error(`❌ AWS SES 이메일 전송 최종 실패 (${params.to}):`, lastError);
  return { success: false, error: lastError };
};

export const sendEmail = async (params: SendEmailParams) => {
  const maxRetries = 3;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
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
      lastError = error;
      console.error(
        `❌ 이메일 전송 실패 (${params.to}) - 시도 ${attempt}/${maxRetries}:`,
        error
      );

      if (attempt < maxRetries) {
        // Rate limiting을 위한 지연 (1초, 2초, 4초)
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`⏳ ${delay}ms 후 재시도...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // 모든 재시도 실패
  console.error(`❌ 이메일 전송 최종 실패 (${params.to}):`, lastError);
  return { success: false, error: lastError };
};

// 테스트용 이메일 전송 (실제 전송하지 않고 로그만 출력)
export const sendTestEmail = async (params: SendEmailParams) => {
  const { to, subject, title, difficulty, url, unsubscribeUrl } = params;

  console.log("🧪 ====== 테스트 이메일 전송 시뮬레이션 ======");
  console.log(`  📧 To: ${to}`);
  console.log(`  📝 Subject: ${subject}`);
  console.log(`  🎯 Title: ${title}`);
  console.log(`  ⚡ Difficulty: ${difficulty}`);
  console.log(`  🔗 URL: ${url}`);
  console.log(`  🚫 Unsubscribe: ${unsubscribeUrl}`);
  console.log("🧪 ===========================================");

  // 실제 전송하지 않고 성공으로 반환
  return { success: true, data: { id: "test-email-id" } };
};
