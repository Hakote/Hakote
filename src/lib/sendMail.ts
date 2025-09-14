import { Resend } from "resend";
import { EmailTemplate } from "./email";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

// Resend 클라이언트는 API 키가 있을 때만 초기화
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// AWS SES 클라이언트는 필요한 환경 변수가 있을 때만 초기화
const sesClient =
  process.env.AWS_REGION &&
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY
    ? new SESClient({
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      })
    : null;

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
  if (!sesClient) {
    throw new Error(
      "AWS SES 환경 변수가 설정되지 않았습니다. (AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)"
    );
  }

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
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // 모든 재시도 실패
  console.error(`❌ AWS SES 이메일 전송 최종 실패 (${params.to}):`, lastError);
  return { success: false, error: lastError };
};

// Resend를 사용한 이메일 전송 (백업용)
export const sendEmailWithResend = async (params: SendEmailParams) => {
  if (!resend) {
    throw new Error("Resend API 키가 설정되지 않았습니다.");
  }

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
        `❌ Resend 이메일 전송 실패 (${params.to}) - 시도 ${attempt}/${maxRetries}:`,
        error
      );

      if (attempt < maxRetries) {
        // Rate limiting을 위한 지연 (1초, 2초, 4초)
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // 모든 재시도 실패
  console.error(`❌ Resend 이메일 전송 최종 실패 (${params.to}):`, lastError);
  return { success: false, error: lastError };
};

// 메인 이메일 전송 함수 - AWS SES 사용
export const sendEmail = async (params: SendEmailParams) => {
  // 테스트/개발 환경에서는 절대 실제 전송하지 않음
  if (process.env.NODE_ENV && process.env.NODE_ENV !== "production") {
    return await sendTestEmail(params);
  }
  return await sendEmailWithSES(params);
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
