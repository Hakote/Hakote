export const isValidEmail = (email: string): boolean => {
  // 빈 문자열이나 공백만 있는 경우
  if (!email || email.trim() === "") {
    return false;
  }

  const trimmedEmail = email.trim();

  // @ 기호가 없거나 여러 개인 경우
  const atCount = (trimmedEmail.match(/@/g) || []).length;
  if (atCount !== 1) {
    return false;
  }

  // @ 기호 앞뒤로 내용이 있어야 함
  const atIndex = trimmedEmail.indexOf("@");
  if (atIndex === 0 || atIndex === trimmedEmail.length - 1) {
    return false;
  }

  // 도메인 부분에 점이 있어야 하고, 점 뒤에 문자가 있어야 함
  const domainPart = trimmedEmail.substring(atIndex + 1);
  const lastDotIndex = domainPart.lastIndexOf(".");
  if (lastDotIndex === -1 || lastDotIndex === domainPart.length - 1) {
    return false;
  }

  // 연속된 점이 있으면 안 됨
  if (trimmedEmail.includes("..")) {
    return false;
  }

  // 기본적인 이메일 형식 검증
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmedEmail);
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
