export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateSubscribeRequest = (data: {
  email: string;
  frequency: string;
  consent: boolean;
}) => {
  const errors: string[] = [];

  if (!data.email || !isValidEmail(data.email)) {
    errors.push("유효한 이메일 주소를 입력해주세요.");
  }

  if (!data.frequency || !["2x", "3x", "5x"].includes(data.frequency)) {
    errors.push("구독 빈도를 선택해주세요.");
  }

  if (!data.consent) {
    errors.push("개인정보 수집 및 이용에 동의해주세요.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
