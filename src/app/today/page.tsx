"use client";

import { useState, useEffect } from "react";
import { ProblemCard } from "@/components/problem-card";
import { Header } from "@/components/header";
import { FullScreenLoading } from "@/components/ui/loading";

interface ProblemData {
  id: string;
  source: "boj" | "leetcode" | "programmers";
  title: string;
  url: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
}

// 날짜 기반 문제 선택 함수
function getProblemForDate(problems: ProblemData[], date: Date = new Date()) {
  if (problems.length === 0) return null;

  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const dateHash = year * 10000 + (month + 1) * 100 + day;

  const selectedIndex = dateHash % problems.length;
  return problems[selectedIndex];
}

export default function TodaysProblemPage() {
  const [problems, setProblems] = useState<ProblemData[]>([]);
  const [currentProblem, setCurrentProblem] = useState<ProblemData | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 문제 데이터 가져오기
  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const response = await fetch("/api/problems");
        const result = await response.json();

        if (result.ok) {
          setProblems(result.data);
          const todayProblem = getProblemForDate(result.data);
          setCurrentProblem(todayProblem);
        } else {
          setError("문제를 불러오는데 실패했습니다.");
        }
      } catch {
        setError("문제를 불러오는데 실패했습니다.");
      }
    };

    fetchProblems();
  }, []);

  const handleNextProblem = () => {
    if (problems.length === 0) return;

    setLoading(true);

    // Simulate loading
    setTimeout(() => {
      // 현재 문제와 다른 랜덤 문제 선택
      let newProblem;
      do {
        const randomIndex = Math.floor(Math.random() * problems.length);
        newProblem = problems[randomIndex];
      } while (newProblem.id === currentProblem?.id && problems.length > 1);

      setCurrentProblem(newProblem);
      setLoading(false);
    }, 500);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0A23] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg">{error}</p>
        </div>
      </div>
    );
  }

  if (!currentProblem) {
    return <FullScreenLoading />;
  }

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
        <div className="text-center space-y-12">
          <h1 className="text-4xl md:text-5xl font-bold text-[#E5E7EB] leading-tight">
            오늘의 문제
          </h1>

          <ProblemCard
            problem={currentProblem}
            onNextProblem={handleNextProblem}
            loading={loading}
          />

          {/* Tip */}
          <p className="text-sm text-[#E5E7EB]/60 font-mono max-w-md mx-auto">
            TIP: 30분 안에 핵심 아이디어를 떠올려 보세요.
          </p>
        </div>
      </main>
    </div>
  );
}
