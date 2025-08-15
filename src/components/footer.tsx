import Link from "next/link";
import { Github, MessageCircle } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-[#E5E7EB]/10 mt-20 bg-background">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col space-y-6 md:space-y-0 md:flex-row md:justify-between md:items-center">
          <div className="text-[#E5E7EB]/60 text-sm text-center md:text-left">
            © Hakote
          </div>
          <div className="grid grid-cols-2 gap-4 sm:flex sm:space-x-6 text-sm">
            <Link
              href="/privacy"
              className="text-[#E5E7EB]/60 hover:text-[#4F9DFF] transition-colors duration-200 hover:shadow-[0_0_10px_rgba(79,157,255,0.3)] rounded-md px-3 py-2 text-center"
            >
              Privacy
            </Link>
            <Link
              href={`mailto:${
                process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "hakote.team@gmail.com"
              }`}
              className="text-[#E5E7EB]/60 hover:text-[#4F9DFF] transition-colors duration-200 hover:shadow-[0_0_10px_rgba(79,157,255,0.3)] rounded-md px-3 py-2 text-center"
            >
              Contact
            </Link>
            <Link
              href="https://github.com/Hakote/Hakote"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#E5E7EB]/60 hover:text-[#4F9DFF] transition-colors duration-200 hover:shadow-[0_0_10px_rgba(79,157,255,0.3)] rounded-md px-3 py-2 flex items-center justify-center space-x-1"
            >
              <Github className="w-4 h-4" />
              <span className="hidden sm:inline">GitHub Repo</span>
              <span className="sm:hidden">GitHub</span>
            </Link>
            <Link
              href="https://forms.gle/DT2KFcCiuZyWsMAs6"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#E5E7EB]/60 hover:text-[#4F9DFF] transition-colors duration-200 hover:shadow-[0_0_10px_rgba(79,157,255,0.3)] rounded-md px-3 py-2 flex items-center justify-center space-x-1"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Feedback</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
