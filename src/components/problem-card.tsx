"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, RefreshCw, Lock, Unlock } from "lucide-react";

interface Problem {
  id: string;
  title: string;
  url: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  source: "boj" | "leetcode" | "programmers";
  week?: number;
  type?: string;
}

interface ProblemCardProps {
  problem: Problem;
  onNextProblem: () => void;
  loading?: boolean;
}

export function ProblemCard({
  problem,
  onNextProblem,
  loading = false,
}: ProblemCardProps) {
  const [showAlgorithm, setShowAlgorithm] = useState(false);
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-500/20 text-green-400 border-green-500/30 shadow-[0_0_8px_rgba(34,197,94,0.2)]";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 shadow-[0_0_8px_rgba(234,179,8,0.2)]";
      case "hard":
        return "bg-red-500/20 text-red-400 border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.2)]";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getSourceName = (source: string) => {
    switch (source) {
      case "boj":
        return "백준";
      case "leetcode":
        return "LeetCode";
      case "programmers":
        return "프로그래머스";
      default:
        return source;
    }
  };

  return (
    <Card className="bg-[#1F294A]/80 border border-[#E5E7EB]/20 backdrop-blur-sm max-w-2xl mx-auto shadow-[0_0_30px_rgba(31,41,74,0.5)] transition-all duration-300">
      <CardHeader className="space-y-4 pb-4">
        <div className="flex items-center justify-between">
          <div className="relative group">
            <button
              onClick={() => setShowAlgorithm(!showAlgorithm)}
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-medium border transition-all duration-200 cursor-pointer ${
                showAlgorithm
                  ? "bg-[#4F9DFF]/20 text-[#4F9DFF] border-[#4F9DFF]/30 shadow-[0_0_10px_rgba(79,157,255,0.2)]"
                  : "bg-[#E5E7EB]/10 text-[#E5E7EB]/60 border-[#E5E7EB]/20 hover:bg-[#E5E7EB]/20 hover:text-[#E5E7EB]/80"
              }`}
            >
              {showAlgorithm ? (
                <>
                  <Unlock className="w-3 h-3 mr-1" />
                  {problem.tags[0] || "알고리즘"}
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3 mr-1" />
                  유형 보기
                </>
              )}
            </button>

            {/* 툴팁 */}
            {!showAlgorithm && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-[#1F294A] border border-[#E5E7EB]/20 rounded-lg text-xs text-[#E5E7EB]/80 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                클릭하여 알고리즘 유형 보기
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#1F294A]"></div>
              </div>
            )}
          </div>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(
              problem.difficulty
            )}`}
          >
            {problem.difficulty}
          </span>
        </div>
        <h2 className="text-2xl font-bold text-[#E5E7EB] leading-tight">
          {problem.title}
        </h2>
        <div className="flex items-center gap-2 text-sm text-[#E5E7EB]/60">
          <span>{getSourceName(problem.source)}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            size="lg"
            asChild
            className="flex-1 bg-[#4F9DFF] hover:bg-[#4F9DFF]/90 text-white font-semibold shadow-[0_0_20px_rgba(79,157,255,0.4)] hover:shadow-[0_0_30px_rgba(79,157,255,0.6)] transition-all duration-300 focus:ring-2 focus:ring-[#4F9DFF]/50 focus:ring-offset-2 focus:ring-offset-[#0A0A23]"
          >
            <a
              href={problem.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              문제 풀러가기
            </a>
          </Button>

          <Button
            variant="ghost"
            size="lg"
            onClick={onNextProblem}
            disabled={loading}
            className="flex-1 border border-[#9F7FFF]/30 text-[#9F7FFF] hover:bg-[#9F7FFF]/10 hover:border-[#9F7FFF]/50 font-semibold shadow-[0_0_15px_rgba(159,127,255,0.2)] hover:shadow-[0_0_25px_rgba(159,127,255,0.4)] transition-all duration-300 focus:ring-2 focus:ring-[#9F7FFF]/50 focus:ring-offset-2 focus:ring-offset-[#0A0A23]"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            다른 문제 보기
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
