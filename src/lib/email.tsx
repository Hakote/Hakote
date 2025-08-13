interface EmailTemplateProps {
  title: string;
  difficulty: string;
  url: string;
  unsubscribeUrl: string;
}

export const EmailTemplate = ({
  title,
  difficulty,
  url,
  unsubscribeUrl,
}: EmailTemplateProps): string => {
  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case "easy":
        return "#10B981";
      case "medium":
        return "#F59E0B";
      case "hard":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>[하코테] 오늘의 문제: ${title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #FFFFFF; color: #333333; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background-color: #4F9DFF; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #FFFFFF;">
                하코테
            </h1>
            <p style="margin: 8px 0 0 0; font-size: 14px; color: #E5E7EB;">
                하루 한 문제로 코딩테스트 루틴 만들기
            </p>
        </div>

        <!-- Content -->
        <div style="padding: 32px 24px;">
            <h2 style="margin: 0 0 24px 0; font-size: 20px; font-weight: bold; color: #333333; text-align: center;">
                오늘의 문제
            </h2>
            
            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 24px; margin-bottom: 24px; text-align: center;">
                <!-- 제목 -->
                <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #333333;">
                    ${title}
                </h3>
                
                <!-- 난이도 -->
                <div style="display: inline-block; background-color: ${getDifficultyColor(
                  difficulty
                )}; color: #FFFFFF; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 500; text-transform: uppercase; margin-bottom: 20px;">
                    ${difficulty}
                </div>
                
                <!-- 문제 풀러가기 버튼 -->
                <div style="margin-top: 20px;">
                    <a href="${url}" style="display: inline-block; background-color: #4F9DFF; color: #FFFFFF; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; box-shadow: 0 2px 4px rgba(79, 157, 255, 0.3);">
                        문제 풀러가기
                    </a>
                </div>
            </div>

            <p style="margin: 0 0 24px 0; font-size: 14px; color: #666666; line-height: 1.6; text-align: center;">
                매일 아침 7시에 새로운 문제를 받아보세요. 
                꾸준한 연습이 실력 향상의 지름길입니다! 🚀
            </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #F8FAFC; padding: 20px 24px; border-top: 1px solid #E2E8F0; text-align: center;">
            <p style="margin: 0 0 12px 0; font-size: 12px; color: #666666;">
                이 이메일을 더 이상 받고 싶지 않으시면
            </p>
            <a href="${unsubscribeUrl}" style="color: #4F9DFF; font-size: 12px; text-decoration: underline;">
                구독 해지
            </a>
        </div>
    </div>
</body>
</html>
  `;
};
