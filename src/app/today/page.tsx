"use client";

import { useState } from "react";
import { ProblemCard } from "@/components/problem-card";
import { Header } from "@/components/header";
import problemsData from "@/data/problems.json";

interface ProblemData {
  source: "boj" | "leetcode" | "programmers";
  title: string;
  url: string;
  difficulty: string;
  tags: string[];
}

interface WeekData {
  week: number;
  type: string;
  problems: ProblemData[];
}

// 난이도 변환 함수
function convertDifficulty(difficulty: string): "easy" | "medium" | "hard" {
  const lower = difficulty.toLowerCase();

  if (
    lower.includes("bronze") ||
    lower.includes("silver") ||
    lower.includes("level 1") ||
    lower.includes("level 2")
  ) {
    return "easy";
  } else if (lower.includes("gold") || lower.includes("level 3")) {
    return "medium";
  } else if (
    lower.includes("platinum") ||
    lower.includes("diamond") ||
    lower.includes("level 4") ||
    lower.includes("level 5")
  ) {
    return "hard";
  }

  return "medium";
}

// 날짜 기반 문제 선택 함수
function getProblemForDate(date: Date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const dateHash = year * 10000 + (month + 1) * 100 + day;

  // 모든 문제를 평면화
  const allProblems = (problemsData as WeekData[]).flatMap((week) =>
    week.problems.map((problem) => ({
      ...problem,
      difficulty: convertDifficulty(problem.difficulty),
      id: `${week.week}-${problem.title}`,
      week: week.week,
      type: week.type,
    }))
  );

  const selectedIndex = dateHash % allProblems.length;
  return allProblems[selectedIndex];
}

export default function TodaysProblemPage() {
  const [currentProblem, setCurrentProblem] = useState(getProblemForDate());
  const [loading, setLoading] = useState(false);

  // 모든 문제 목록 생성 (한 번만)
  const allProblems = (problemsData as WeekData[]).flatMap((week) =>
    week.problems.map((problem) => ({
      ...problem,
      difficulty: convertDifficulty(problem.difficulty),
      id: `${week.week}-${problem.title}`,
      week: week.week,
      type: week.type,
    }))
  );

  const handleNextProblem = () => {
    setLoading(true);

    // Simulate loading
    setTimeout(() => {
      // 현재 문제와 다른 랜덤 문제 선택
      let newProblem;
      do {
        const randomIndex = Math.floor(Math.random() * allProblems.length);
        newProblem = allProblems[randomIndex];
      } while (newProblem.id === currentProblem.id && allProblems.length > 1);

      setCurrentProblem(newProblem);
      setLoading(false);
    }, 500);
  };

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
