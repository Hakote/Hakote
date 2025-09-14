import { test, expect } from "@playwright/test";

test.describe("구독 플로우 (랜딩 → 모달 → 유효성 → 성공 UI)", () => {
  test("성공 경로", async ({ page }) => {
    // /api/problem-lists, /api/subscribe API 모킹
    await page.route("**/api/problem-lists", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          problemLists: [{ id: "pl1", name: "basic", is_active: true }],
        }),
      });
    });
    await page.route("**/api/subscribe", async (route) => {
      // 서버가 200만 반환하면 UI는 성공상태로 전환
      await route.fulfill({ status: 200, body: "" });
    });

    await page.goto("/");

    // 구독 모달 열기
    // 헤더/메인 두 곳에 같은 라벨이 있어 main 영역의 버튼만 지정
    await page
      .getByRole("main")
      .getByRole("button", { name: "구독하기" })
      .click();

    // 문제 리스트 기본값 로드 대기(모킹 응답에 의해 첫 항목으로 설정됨)
    await expect(
      page
        .getByRole("dialog", { name: "이메일로 문제 받기" })
        .getByText("기본 문제 리스트")
    ).toBeVisible();

    // 이메일/동의/빈도 선택(모달 내부 스코프)
    const dialog = page.getByRole("dialog", { name: "이메일로 문제 받기" });
    await dialog.getByLabel("이메일 주소").fill("test@example.com");
    await dialog.getByRole("button", { name: "주 5회" }).click();
    await dialog.locator("#consent").check();

    // 동의 체크 (role=checkbox 지정되어 있음)
    await page
      .getByRole("checkbox", { name: "개인정보 수집 및 이용에 동의합니다" })
      .click();

    // 제출(버튼 활성화 대기 후 클릭)
    const submitBtn = dialog.getByRole("button", { name: "구독하기" });
    await expect(submitBtn).toBeEnabled({ timeout: 10000 });
    await submitBtn.click();

    // 성공 UI 확인
    await expect(page.getByText("구독이 완료되었습니다")).toBeVisible();
  });
});
