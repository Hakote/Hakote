import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SubscribeModal } from "@/components/subscribe-modal";

export function Header() {
  return (
    <header className="relative z-20 flex items-center justify-between p-6 max-w-7xl mx-auto">
      <Link
        href="/"
        className="flex items-center space-x-3 hover:opacity-80 transition-opacity duration-200"
      >
        <div className="w-8 h-8 bg-[#4F9DFF] rounded-lg flex items-center justify-center shadow-lg shadow-[#4F9DFF]/25">
          <div className="w-4 h-4 bg-white rounded-sm"></div>
        </div>
        <span className="text-xl font-bold text-white font-sans">하코테</span>
      </Link>

      <nav className="flex items-center space-x-8">
        <Link
          href="/today"
          className="text-[#4F9DFF] font-medium px-3 py-2 shadow-[0_0_10px_rgba(79,157,255,0.3)] rounded-md"
        >
          오늘의 문제
        </Link>
        <SubscribeModal>
          <Button
            variant="ghost"
            className="text-[#E5E7EB] hover:text-[#9F7FFF] transition-colors duration-200 font-medium hover:shadow-[0_0_15px_rgba(159,127,255,0.4)] rounded-md px-3 py-2"
          >
            구독하기
          </Button>
        </SubscribeModal>
      </nav>
    </header>
  );
}
