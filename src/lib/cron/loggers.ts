import { Logger } from "./core";

// 운영용 로거 - 실제 운영 환경에서 사용
export class ProductionLogger implements Logger {
  info(message: string): void {
    console.log(message);
  }

  error(message: string, error?: unknown): void {
    if (error) {
      console.error(message, error);
    } else {
      console.error(message);
    }
  }

  warn(message: string): void {
    console.warn(message);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  test(message: string): void {
    // 운영 환경에서는 테스트 로그를 출력하지 않음
    // console.log(`🧪 ${message}`);
  }
}

// 테스트용 로거 - 테스트 환경에서 사용
export class TestLogger implements Logger {
  info(message: string): void {
    console.log(`📋 ${message}`);
  }

  error(message: string, error?: unknown): void {
    if (error) {
      console.error(`❌ ${message}`, error);
    } else {
      console.error(`❌ ${message}`);
    }
  }

  warn(message: string): void {
    console.warn(`⚠️  ${message}`);
  }

  test(message: string): void {
    console.log(`🧪 ${message}`);
  }
}
