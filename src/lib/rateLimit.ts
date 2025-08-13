interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export const rateLimit = {
  check: (identifier: string, limit: number, windowMs: number): boolean => {
    const now = Date.now();
    const entry = rateLimitStore.get(identifier);

    if (!entry || now > entry.resetTime) {
      // 새로운 윈도우 시작
      rateLimitStore.set(identifier, {
        count: 1,
        resetTime: now + windowMs
      });
      return true;
    }

    if (entry.count >= limit) {
      return false; // 제한 초과
    }

    // 카운트 증가
    entry.count++;
    return true;
  },

  // 메모리 정리를 위한 헬퍼
  cleanup: () => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }
};

// 주기적으로 정리 (선택사항)
if (typeof window === 'undefined') {
  setInterval(() => {
    rateLimit.cleanup();
  }, 60000); // 1분마다 정리
}
