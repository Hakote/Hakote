import { test, expect } from "@playwright/test";

test.describe("/today 랜덤 추천 및 다른 문제 보기", () => {
  test("초기 문제 로드 및 다른 문제 보기 동작", async ({ page }) => {
    await page.route("**/api/problems", async (route) => {
      const problems = Array.from({ length: 5 }).map((_, i) => ({
        id: `p${i}`,
        source: "programmers",
        title: `문제 ${i}`,
        url: `https://example.com/${i}`,
        difficulty: "easy",
        tags: ["array"],
      }));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, data: problems }),
      });
    });

    await page.goto("/today");

    // 초기 카드 렌더 확인
    const titleLocator = page.getByRole("heading", { level: 2 });
    const firstTitle = await titleLocator.textContent();

    // 다른 문제 보기 클릭
    await page.getByRole("button", { name: "다른 문제 보기" }).click();

    // 타이틀이 바뀌는지 확인(랜덤이므로 달라지기만 하면 됨)
    await expect(async () => {
      const nextTitle = await titleLocator.textContent();
      expect(nextTitle).not.toBe(firstTitle);
    }).toPass();
  });
});
