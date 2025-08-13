import React from "react";

interface LoadingProps {
  className?: string;
}

export function Loading({ className = "" }: LoadingProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      {/* Animated dots */}
      <div className="flex space-x-2">
        <div
          className="w-3 h-3 bg-[#4F9DFF] rounded-full animate-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <div
          className="w-3 h-3 bg-[#4F9DFF] rounded-full animate-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <div
          className="w-3 h-3 bg-[#4F9DFF] rounded-full animate-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}

// Full screen loading component
export function FullScreenLoading() {
  return (
    <div className="min-h-screen bg-[#0A0A23] flex items-center justify-center">
      <Loading />
    </div>
  );
}
