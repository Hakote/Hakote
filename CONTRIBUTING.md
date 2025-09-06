# Contributing Guide

## 🔀 Branch 규칙

- `main`: 프로덕션 배포 브랜치
- `dev`: 통합 개발 브랜치
- `feature/*`: 기능 개발
- `fix/*`: 버그 수정
- `hotfix/*`: 긴급 수정
- `release/*`: 배포 준비

## 📝 PR 제목 규칙

- feature → dev:
  - `feat: <설명>` : 새로운 기능 추가
  - `fix: <설명>` : 버그 수정
  - `chore: <설명>` : 설정, 기타 작업
  - `docs: <설명>` : 문서 작업
  - `refactor: <설명>` : 리팩터링
  - `ci: <설명>` : ci 관련
  - `build: <설명>`: build 관련
  - Merge 방식: **Merge commit**
- dev → main:

  - `[release: YYYY-MM-DD] 설명`
  - Merge시 제목: `release: YYYY-MM-DD`, 한 줄 띄우고 -로 설명 작성

    ```
    release: 2025-08-25

    - SES 이메일 발송 기능 추가
    - CronJob 타임아웃 수정
    ```

  - Merge 방식: **Merge commit**

## ✅ Commit message 규칙

- `{type}: {subject}` 형식 (PR type과 동일)
- 예시:
  - `feat: 이메일 전송을 위한 AWS SES 설정`
  - `fix: cron job timeout 이슈 개선`
