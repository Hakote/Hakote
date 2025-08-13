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
    <title>오늘의 문제: ${title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0A0A23; color: #FFFFFF; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #1A1A2E; border-radius: 12px; overflow: hidden; margin-top: 20px; margin-bottom: 20px;">
        <!-- Header -->
        <div style="background-color: #16213E; padding: 24px; text-align: center; border-bottom: 1px solid #2D3748;">
            <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #FFFFFF;">
                하코테
            </h1>
            <p style="margin: 8px 0 0 0; font-size: 14px; color: #A0AEC0;">
                하루 한 문제로 코딩테스트 루틴 만들기
            </p>
        </div>

        <!-- Content -->
        <div style="padding: 32px 24px;">
            <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: bold; color: #FFFFFF;">
                오늘의 문제
            </h2>
            
            <div style="background-color: #2D3748; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #FFFFFF;">
                    ${title}
                </h3>
                
                <div style="display: inline-block; background-color: ${getDifficultyColor(
                  difficulty
                )}; color: #FFFFFF; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500; text-transform: uppercase; margin-bottom: 16px;">
                    ${difficulty}
                </div>
                
                <a href="${url}" style="display: inline-block; background-color: #4299E1; color: #FFFFFF; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px;">
                    문제 풀러가기
                </a>
            </div>

            <p style="margin: 0 0 24px 0; font-size: 14px; color: #A0AEC0; line-height: 1.5;">
                매일 아침 7시에 새로운 문제를 받아보세요. 
                꾸준한 연습이 실력 향상의 지름길입니다! 🚀
            </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #16213E; padding: 20px 24px; border-top: 1px solid #2D3748; text-align: center;">
            <p style="margin: 0 0 12px 0; font-size: 12px; color: #718096;">
                이 이메일을 더 이상 받고 싶지 않으시면
            </p>
            <a href="${unsubscribeUrl}" style="color: #A0AEC0; font-size: 12px; text-decoration: underline;">
                구독 해지
            </a>
        </div>
    </div>
</body>
</html>
  `;
};
