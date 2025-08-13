"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { X, Mail, Star, Check } from "lucide-react";

interface SubscribeModalProps {
  children: React.ReactNode;
}

export function SubscribeModal({ children }: SubscribeModalProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [frequency, setFrequency] = useState<"2x" | "3x" | "5x">("5x");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

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
        setConsent(false);
        setShowConfetti(true);
        setTimeout(() => {
          setShowConfetti(false);
          setOpen(false);
        }, 2000);
      } else {
        setMessage({
          type: "error",
          text: data.error || "구독 처리 중 오류가 발생했습니다.",
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "서버 오류가 발생했습니다." });
    } finally {
      setLoading(false);
    }
  };

  // Email validation
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isFormValid = isValidEmail && frequency && consent;

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
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-[#0A0A23]/80 backdrop-blur-sm z-[99998]"
            onClick={() => setOpen(false)}
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
            {/* Close button */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 p-2 text-[#E5E7EB]/60 hover:text-[#E5E7EB] hover:bg-[#E5E7EB]/10 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#4F9DFF]/50 focus:ring-offset-2 focus:ring-offset-[#1F294A]"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>

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
                  </div>

                  {/* Consent checkbox */}
                  <div className="flex items-start space-x-3 pt-2">
                    <input
                      id="consent"
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-1 w-4 h-4 text-[#4F9DFF] bg-[#0A0A23] border border-[#E5E7EB]/30 rounded focus:ring-[#4F9DFF]/50 focus:ring-2"
                    />
                    <label
                      htmlFor="consent"
                      className="text-sm text-[#E5E7EB]/70"
                    >
                      개인정보 수집 및 이용에 동의합니다.
                    </label>
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
                <div className="text-left space-y-4 py-8">
                  <div className="w-16 h-16 bg-[#4F9DFF]/20 rounded-full flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(79,157,255,0.4)]">
                    <Check className="w-8 h-8 text-[#4F9DFF]" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-[#E5E7EB]">
                      구독이 완료되었습니다
                    </h3>
                    <p className="text-[#E5E7EB]/70 text-sm leading-relaxed">
                      내일부터 아침 7시에 문제를 보내드릴게요.
                    </p>
                  </div>
                  <Button
                    onClick={() => setOpen(false)}
                    className="mt-6 bg-[#4F9DFF] hover:bg-[#4F9DFF]/90 text-white font-semibold px-8 shadow-[0_0_20px_rgba(79,157,255,0.4)] hover:shadow-[0_0_30px_rgba(79,157,255,0.6)] transition-all duration-300 focus:ring-2 focus:ring-[#4F9DFF]/50 focus:ring-offset-2 focus:ring-offset-[#1F294A]"
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
