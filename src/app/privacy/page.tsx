import { Header } from "@/components/header";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0A0A23] relative overflow-hidden">
      {/* Starfield background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="stars"></div>
        <div className="stars2"></div>
        <div className="stars3"></div>
      </div>

      <Header />

      {/* Main content */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-16">
        <div className="bg-[#1F294A]/80 border border-[#E5E7EB]/20 backdrop-blur-sm rounded-lg p-8 shadow-[0_0_30px_rgba(31,41,74,0.5)]">
          <h1 className="text-3xl font-bold text-[#E5E7EB] mb-8">
            개인정보 처리방침
          </h1>

          <div className="space-y-6 text-[#E5E7EB]/80 leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-[#E5E7EB] mb-4">
                1. 개인정보의 처리 목적
              </h2>
              <p>
                하코테는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고
                있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며,
                이용 목적이 변경되는 경우에는 개인정보보호법 제18조에 따라
                별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>일일 코딩테스트 문제 이메일 발송</li>
                <li>구독 관리 및 서비스 제공</li>
                <li>고객 문의 및 지원</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#E5E7EB] mb-4">
                2. 개인정보의 처리 및 보유기간
              </h2>
              <p>
                하코테는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터
                개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서
                개인정보를 처리·보유합니다.
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>구독자 정보: 구독 해지 시까지</li>
                <li>이메일 발송 기록: 3년간 보관</li>
                <li>서비스 이용 기록: 1년간 보관</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#E5E7EB] mb-4">
                3. 개인정보의 제3자 제공
              </h2>
              <p>
                하코테는 정보주체의 개인정보를 제1조(개인정보의 처리 목적)에서
                명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한
                규정 등 개인정보보호법 제17조 및 제18조에 해당하는 경우에만
                개인정보를 제3자에게 제공합니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#E5E7EB] mb-4">
                4. 개인정보처리의 위탁
              </h2>
              <p>
                하코테는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보
                처리업무를 위탁하고 있습니다.
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>
                  이메일 발송: Resend (개인정보 처리방침:
                  https://resend.com/legal/privacy-policy)
                </li>
                <li>
                  데이터베이스 관리: Supabase (개인정보 처리방침:
                  https://supabase.com/privacy)
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#E5E7EB] mb-4">
                5. 정보주체의 권리·의무 및 그 행사방법
              </h2>
              <p>
                정보주체는 하코테에 대해 언제든지 개인정보
                열람·정정·삭제·처리정지 요구 등의 권리를 행사할 수 있습니다.
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>구독 해지: 이메일 하단의 구독 해지 링크 이용</li>
                <li>
                  개인정보 삭제:{" "}
                  {process.env.NEXT_PUBLIC_SUPPORT_EMAIL ||
                    "hakote.team@gmail.com"}
                  으로 요청
                </li>
                <li>개인정보 정정: 구독 재신청을 통한 정보 업데이트</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#E5E7EB] mb-4">
                6. 개인정보의 안전성 확보 조치
              </h2>
              <p>
                하코테는 개인정보보호법 제29조에 따라 다음과 같은 안전성 확보
                조치를 취하고 있습니다.
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>개인정보의 암호화</li>
                <li>해킹 등에 대비한 기술적 대책</li>
                <li>개인정보에 대한 접근 제한</li>
                <li>개인정보 취급 직원의 최소화 및 교육</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#E5E7EB] mb-4">
                7. 개인정보 보호책임자
              </h2>
              <p>
                하코테는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보
                처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와
                같이 개인정보 보호책임자를 지정하고 있습니다.
              </p>
              <div className="mt-2 p-4 bg-[#0A0A23] rounded-lg">
                <p>
                  <strong>개인정보 보호책임자</strong>
                </p>
                <p>
                  이메일:{" "}
                  {process.env.NEXT_PUBLIC_SUPPORT_EMAIL ||
                    "hakote.team@gmail.com"}
                </p>
                <p>처리방침 변경일: 2025년 8월 14일</p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
