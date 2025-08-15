import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mail, Timer, TrendingUp } from "lucide-react";
import { Header } from "@/components/header";
import { SubscribeModal } from "@/components/subscribe-modal";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0A0A23] relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="stars"></div>
        <div className="stars2"></div>
        <div className="stars3"></div>
      </div>

      <Header />

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-16 text-center">
        <div className="space-y-8">
          <h1 className="text-5xl md:text-6xl font-bold text-[#E5E7EB] leading-tight">
            하루 한 문제로
            <br />
            코딩테스트 루틴 만들기
          </h1>

          <p className="text-xl text-[#E5E7EB]/80 max-w-2xl mx-auto leading-relaxed">
            매일 아침 문제 한 개. 생각 30분, 실력 1%씩.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center relative">
            {/* Subtle cosmic illustration behind buttons */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#4F9DFF]/10 via-[#9F7FFF]/10 to-[#4F9DFF]/10 rounded-full blur-3xl scale-150 opacity-50"></div>

            <Button
              asChild
              size="lg"
              className="relative bg-[#4F9DFF] hover:bg-[#4F9DFF]/90 text-white font-semibold px-8 py-4 text-lg shadow-[0_0_20px_rgba(79,157,255,0.4)] hover:shadow-[0_0_30px_rgba(79,157,255,0.6)] transition-all duration-300"
            >
              <Link href="/today">오늘의 문제 보기</Link>
            </Button>

            <SubscribeModal>
              <Button
                variant="outline"
                size="lg"
                className="relative border-2 border-[#9F7FFF] text-[#9F7FFF] hover:bg-[#9F7FFF]/10 font-semibold px-8 py-4 text-lg bg-transparent shadow-[0_0_15px_rgba(159,127,255,0.3)] hover:shadow-[0_0_25px_rgba(159,127,255,0.5)] transition-all duration-300"
              >
                구독하기
              </Button>
            </SubscribeModal>
          </div>

          <p className="text-sm text-[#E5E7EB]/60 font-mono">
            로그인 없이 바로 시작
          </p>
        </div>
      </main>

      <section className="relative z-0 max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-[#E5E7EB] text-center mb-16">
          어떻게 동작하나요?
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="bg-[#0A0A23]/80 border border-[#E5E7EB]/10 backdrop-blur-sm hover:border-[#4F9DFF]/30 transition-all duration-300 hover:shadow-[0_0_20px_rgba(79,157,255,0.1)]">
            <CardHeader className="text-center space-y-4">
              <div className="w-16 h-16 bg-[#4F9DFF]/20 rounded-full flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(79,157,255,0.3)]">
                <Mail className="w-8 h-8 text-[#4F9DFF]" />
              </div>
              <CardTitle className="text-xl text-[#E5E7EB]">
                아침 7시, 문제 도착
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-[#E5E7EB]/70 text-center leading-relaxed">
                매일 아침 새로운 코딩 문제가 이메일로 도착합니다. 하루를
                시작하는 완벽한 루틴이에요.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-[#0A0A23]/80 border border-[#E5E7EB]/10 backdrop-blur-sm hover:border-[#9F7FFF]/30 transition-all duration-300 hover:shadow-[0_0_20px_rgba(159,127,255,0.1)]">
            <CardHeader className="text-center space-y-4">
              <div className="w-16 h-16 bg-[#9F7FFF]/20 rounded-full flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(159,127,255,0.3)]">
                <Timer className="w-8 h-8 text-[#9F7FFF]" />
              </div>
              <CardTitle className="text-xl text-[#E5E7EB]">
                하루 1문제 집중
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-[#E5E7EB]/70 text-center leading-relaxed">
                30분 동안 집중해서 문제를 해결해보세요. 부담 없는 분량으로
                꾸준함을 유지할 수 있어요.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-[#0A0A23]/80 border border-[#E5E7EB]/10 backdrop-blur-sm hover:border-[#4F9DFF]/30 transition-all duration-300 hover:shadow-[0_0_20px_rgba(79,157,255,0.1)]">
            <CardHeader className="text-center space-y-4">
              <div className="w-16 h-16 bg-[#4F9DFF]/20 rounded-full flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(79,157,255,0.3)]">
                <TrendingUp className="w-8 h-8 text-[#4F9DFF]" />
              </div>
              <CardTitle className="text-xl text-[#E5E7EB]">
                꾸준함이 실력
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-[#E5E7EB]/70 text-center leading-relaxed">
                매일 조금씩 쌓인 경험이 큰 실력 향상으로 이어집니다. 진행 상황을
                추적하고 성장을 확인하세요.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
