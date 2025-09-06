"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { X, Mail, Star, Check } from "lucide-react";

interface SubscribeModalProps {
  children: React.ReactNode;
}

interface ProblemList {
  id: string;
  name: string;
  is_active: boolean;
}

// 문제 리스트 데이터 설정
const PROBLEM_LIST_CONFIG = {
  basic: {
    displayName: "기본 문제 리스트",
    description: "백준 + 프로그래머스, 컴공생, 입문자 추천",
    difficulty: "중하",
    difficultyColor: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  "programmers-high-score-kit": {
    displayName: "프로그래머스 고득점 Kit",
    description: "실전 코딩테스트 대비",
    difficulty: "중상",
    difficultyColor: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  },
  // leetcode: {
  //   displayName: "리트코드",
  //   description: "해외 취업 대비",
  //   difficulty: "상",
  //   difficultyColor: "bg-red-500/20 text-red-400 border-red-500/30",
  // },
  // random: {
  //   displayName: "랜덤 문제",
  //   description: "다양한 도전",
  //   difficulty: "랜덤",
  //   difficultyColor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  // },
} as const;

// 문제 리스트 정보 가져오기 헬퍼 함수
const getProblemListInfo = (listName: string) => {
  return (
    PROBLEM_LIST_CONFIG[listName as keyof typeof PROBLEM_LIST_CONFIG] || {
      displayName: listName,
      description: "알고리즘 문제들",
      difficulty: "중",
      difficultyColor: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    }
  );
};

export function SubscribeModal({ children }: SubscribeModalProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [frequency, setFrequency] = useState<"2x" | "3x" | "5x">("5x");
  const [problemListId, setProblemListId] = useState<string>("");
  const [problemLists, setProblemLists] = useState<ProblemList[]>([]);
  const [consent, setConsent] = useState(false);
  const [isProblemListOpen, setIsProblemListOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // 문제 리스트 가져오기
  useEffect(() => {
    const fetchProblemLists = async () => {
      try {
        const response = await fetch("/api/problem-lists");
        const data = await response.json();
        if (data.ok) {
          setProblemLists(data.problemLists);
          // 첫 번째 문제 리스트를 기본값으로 설정
          if (data.problemLists.length > 0) {
            setProblemListId(data.problemLists[0].id);
          }
        }
      } catch (error) {
        console.error("Failed to fetch problem lists:", error);
      }
    };

    if (open) {
      fetchProblemLists();
    }
  }, [open]);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isProblemListOpen && !target.closest(".problem-list-dropdown")) {
        setIsProblemListOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProblemListOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          frequency,
          consent,
          problem_list_id: problemListId,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        setMessage({
          type: "success",
          text: "내일부터 07:00에 문제를 보내드려요.",
        });
        setEmail("");
        setFrequency("5x");
        setProblemListId(problemLists.length > 0 ? problemLists[0].id : "");
        setConsent(false);
        setShowConfetti(true);
        setTimeout(() => {
          setShowConfetti(false);
        }, 2000);
      } else {
        setMessage({
          type: "error",
          text: data.error || "구독 처리 중 오류가 발생했습니다.",
        });
      }
    } catch {
      setMessage({ type: "error", text: "서버 오류가 발생했습니다." });
    } finally {
      setLoading(false);
    }
  };

  // Email validation
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isFormValid = isValidEmail && frequency && problemListId && consent;

  return (
    <>
      <div onClick={() => setOpen(true)}>{children}</div>

      {open && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Backdrop - 성공 상태가 아닐 때만 클릭 가능 */}
          <div
            className="absolute inset-0 bg-[#0A0A23]/80 backdrop-blur-sm z-[99998]"
            onClick={() => {
              if (!message || message.type !== "success") {
                setOpen(false);
              }
            }}
          />

          {/* Confetti effect */}
          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="confetti-container">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="confetti-particle"
                    style={{
                      left: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 2}s`,
                      backgroundColor: i % 2 === 0 ? "#4F9DFF" : "#9F7FFF",
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Modal panel */}
          <Card className="relative w-full max-w-md bg-[#1F294A] border border-[#E5E7EB]/30 backdrop-blur-md shadow-[0_0_40px_rgba(31,41,74,0.9)] animate-in fade-in-0 zoom-in-95 duration-300 z-[99999]">
            {/* Close button - 성공 상태가 아닐 때만 표시 */}
            {(!message || message.type !== "success") && (
              <button
                onClick={() => setOpen(false)}
                className="absolute top-4 right-4 p-2 text-[#E5E7EB]/60 hover:text-[#E5E7EB] hover:bg-[#E5E7EB]/10 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#4F9DFF]/50 focus:ring-offset-2 focus:ring-offset-[#1F294A]"
                aria-label="닫기"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3 mb-2">
                <div className="relative">
                  <Mail className="w-6 h-6 text-[#4F9DFF]" />
                  <Star className="w-3 h-3 text-[#9F7FFF] absolute -top-1 -right-1" />
                </div>
                <h2
                  id="modal-title"
                  className="text-xl font-bold text-[#E5E7EB]"
                >
                  이메일로 문제 받기
                </h2>
              </div>
            </CardHeader>

            <CardContent className="space-y-8">
              {!message || message.type !== "success" ? (
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Frequency selection */}
                  <div className="space-y-4">
                    <label className="text-sm font-medium text-[#E5E7EB]/80 text-left block">
                      받을 빈도를 선택하세요
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: "2x", label: "주 2회", desc: "화, 목" },
                        { value: "3x", label: "주 3회", desc: "월, 수, 금" },
                        { value: "5x", label: "주 5회", desc: "평일" },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            setFrequency(option.value as "2x" | "3x" | "5x")
                          }
                          className={`p-3 rounded-lg border text-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#4F9DFF]/50 focus:ring-offset-2 focus:ring-offset-[#1F294A] ${
                            frequency === option.value
                              ? "border-[#4F9DFF] bg-[#4F9DFF]/20 shadow-[0_0_15px_rgba(79,157,255,0.4)]"
                              : "border-[#E5E7EB]/30 hover:border-[#E5E7EB]/50 hover:bg-[#E5E7EB]/10"
                          }`}
                        >
                          <div className="font-medium text-sm text-[#E5E7EB]">
                            {option.label}
                          </div>
                          <div className="text-xs text-[#E5E7EB]/60 mt-1">
                            {option.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Problem list selection */}
                  <div className="space-y-4">
                    <label className="text-sm font-medium text-[#E5E7EB]/80 text-left block">
                      문제 리스트를 선택하세요
                    </label>
                    <div className="relative problem-list-dropdown">
                      <button
                        type="button"
                        onClick={() => setIsProblemListOpen(!isProblemListOpen)}
                        className="w-full p-3 rounded-lg border border-[#E5E7EB]/30 bg-[#1F294A] text-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#4F9DFF]/50 focus:ring-offset-2 focus:ring-offset-[#1F294A] focus:border-[#4F9DFF] transition-all duration-200 text-left flex items-center justify-between hover:border-[#E5E7EB]/50"
                      >
                        <span className="truncate">
                          {problemListId
                            ? getProblemListInfo(
                                problemLists.find(
                                  (list) => list.id === problemListId
                                )?.name || ""
                              ).displayName
                            : "문제 리스트를 선택해주세요"}
                        </span>
                        <svg
                          className={`w-5 h-5 text-[#E5E7EB]/60 transition-transform duration-200 ${
                            isProblemListOpen ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>

                      {isProblemListOpen && (
                        <div className="absolute z-10 w-full mt-1 bg-[#1F294A] border border-[#E5E7EB]/30 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {problemLists.map((list) => (
                            <button
                              key={list.id}
                              type="button"
                              onClick={() => {
                                setProblemListId(list.id);
                                setIsProblemListOpen(false);
                              }}
                              className={`w-full px-4 py-3 text-left hover:bg-[#E5E7EB]/10 transition-colors duration-200 first:rounded-t-lg last:rounded-b-lg ${
                                problemListId === list.id
                                  ? "bg-[#4F9DFF]/20 text-[#4F9DFF]"
                                  : "text-[#E5E7EB]"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="font-medium">
                                  {getProblemListInfo(list.name).displayName}
                                </div>
                                <span
                                  className={`px-2 py-1 text-xs rounded-full border ${
                                    getProblemListInfo(list.name)
                                      .difficultyColor
                                  }`}
                                >
                                  {getProblemListInfo(list.name).difficulty}
                                </span>
                              </div>
                              <div className="text-sm text-[#E5E7EB]/60 mt-1">
                                {getProblemListInfo(list.name).description}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {problemListId && (
                      <div className="mt-2 p-3 bg-[#4F9DFF]/10 border border-[#4F9DFF]/20 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#E5E7EB]/60">
                            {
                              getProblemListInfo(
                                problemLists.find(
                                  (list) => list.id === problemListId
                                )?.name || ""
                              ).description
                            }
                          </span>
                          <span
                            className={`px-2 py-1 text-xs rounded-full border ${
                              getProblemListInfo(
                                problemLists.find(
                                  (list) => list.id === problemListId
                                )?.name || ""
                              ).difficultyColor
                            }`}
                          >
                            {
                              getProblemListInfo(
                                problemLists.find(
                                  (list) => list.id === problemListId
                                )?.name || ""
                              ).difficulty
                            }
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Email input */}
                  <div className="space-y-4">
                    <label
                      htmlFor="email"
                      className="text-sm font-medium text-[#E5E7EB]/80 text-left block"
                    >
                      이메일 주소
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="이메일 주소를 입력하세요"
                      className="w-full px-4 py-3 bg-[#0A0A23] border border-[#E5E7EB]/30 rounded-lg text-[#E5E7EB] placeholder-[#E5E7EB]/50 focus:outline-none focus:ring-2 focus:ring-[#4F9DFF]/50 focus:border-[#4F9DFF]/50 transition-colors duration-200"
                    />
                    <div className="text-xs text-[#E5E7EB]/50">
                      정확한 이메일 주소를 기입해주세요. 오타가 있으면 문제를
                      받을 수 없습니다.
                    </div>
                  </div>

                  {/* Consent checkbox */}
                  <div className="pt-2">
                    <div
                      className="flex items-start space-x-3 cursor-pointer"
                      onClick={() => setConsent(!consent)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setConsent(!consent);
                        }
                      }}
                      tabIndex={0}
                      role="checkbox"
                      aria-checked={consent}
                      aria-label="개인정보 수집 및 이용에 동의합니다"
                    >
                      <input
                        id="consent"
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                        className="mt-1 w-4 h-4 text-[#4F9DFF] bg-[#0A0A23] border border-[#E5E7EB]/30 rounded focus:ring-[#4F9DFF]/50 focus:ring-2"
                        aria-hidden="true"
                      />
                      <label
                        htmlFor="consent"
                        className="text-sm text-[#E5E7EB]/70 select-none"
                      >
                        <a
                          href="/privacy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#4F9DFF] hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          개인정보 수집 및 이용
                        </a>
                        에 동의합니다.
                      </label>
                    </div>
                  </div>

                  {message && message.type === "error" && (
                    <div className="p-3 rounded-md text-sm bg-red-500/20 text-red-400 border border-red-500/30">
                      {message.text}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-col space-y-4 pt-2">
                    <Button
                      type="submit"
                      disabled={!isFormValid || loading}
                      className="w-full bg-[#4F9DFF] hover:bg-[#4F9DFF]/90 disabled:bg-[#4F9DFF]/30 disabled:cursor-not-allowed text-white font-semibold py-3 shadow-[0_0_20px_rgba(79,157,255,0.4)] hover:shadow-[0_0_30px_rgba(79,157,255,0.6)] disabled:shadow-none transition-all duration-300 focus:ring-2 focus:ring-[#4F9DFF]/50 focus:ring-offset-2 focus:ring-offset-[#1F294A]"
                    >
                      {loading ? "처리 중..." : "구독하기"}
                    </Button>

                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="w-full text-[#E5E7EB]/60 hover:text-[#E5E7EB] font-medium py-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#E5E7EB]/20 focus:ring-offset-2 focus:ring-offset-[#1F294A] rounded-lg"
                    >
                      취소
                    </button>
                  </div>
                </form>
              ) : (
                /* Success state */
                <div className="text-center space-y-6 py-8">
                  <div className="w-16 h-16 bg-[#4F9DFF]/20 rounded-full flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(79,157,255,0.4)]">
                    <Check className="w-8 h-8 text-[#4F9DFF]" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xl font-semibold text-[#E5E7EB]">
                      구독이 완료되었습니다
                    </h3>
                    <p className="text-[#E5E7EB]/70 text-sm leading-relaxed max-w-sm mx-auto">
                      내일부터 아침 7시에 문제를 보내드릴게요.
                    </p>
                  </div>
                  <Button
                    onClick={() => setOpen(false)}
                    className="bg-[#4F9DFF] hover:bg-[#4F9DFF]/90 text-white font-semibold px-8 py-3 shadow-[0_0_20px_rgba(79,157,255,0.4)] hover:shadow-[0_0_30px_rgba(79,157,255,0.6)] transition-all duration-300 focus:ring-2 focus:ring-[#4F9DFF]/50 focus:ring-offset-2 focus:ring-offset-[#1F294A]"
                  >
                    확인
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
