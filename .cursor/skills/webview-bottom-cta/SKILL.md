---
name: webview-bottom-cta
description: >-
  골디 앱 WebView에서 하단 고정 CTA(공통 바텀 버튼·DS Button)를 쓸 때 safe area,
  device-max-width, 본문 pb, 100vh 함정을 점검한다. 하단 바·바텀시트·퍼널 푸터
  구현·리뷰 시 사용. 사용자가 웹뷰, safe area, 하단 버튼, fixed bottom, 홈 인디케이터,
  바텀시트 잘림을 언급할 때 읽는다.
---

# WebView·하단 고정 CTA 스킬

## 언제 읽나

- `fixed` / `sticky` 로 **화면 하단**에 DS `Button` 또는 푸터 액션을 둘 때  
- **바텀시트**·**전체 높이**를 `vh`로 잡을 때  
- **레이아웃이 WebView에서만** 깨진다는 이슈를 다룰 때  

원칙·체크리스트의 **전체 본문**은 **`.cursor/rules/webview-bottom-cta.mdc`** 이다. 구현 전·PR 전 해당 파일을 열어 항목을 맞춘다.

## 에이전트 작업 순서

1. **기존 패턴 탐색**  
   `BottomFloatingContainer`, `SellFunnelBottomActions`, `LoginCheckBottomSheet`, `GoldExchangeQuantitySelectBottomSheet` 등에서 `safe-area-inset-bottom`, `device-max-width`, `dvh` 사용을 grep 한다.

2. **신규 하단 바**  
   가능하면 **`BottomFloatingContainer`** 로 감싼 뒤, 내부에 DS `Button`만 둔다. 커스텀 `fixed`를 쓰더라도 룰과 **동일한 safe area + 가로 정렬**을 복제한다.

3. **스크롤 영역**  
   `main` 또는 리스트 래퍼에 CTA·safe area를 합친 **`pb-*`** 가 있는지 확인한다. 없으면 마지막 행이 버튼에 가린다.

4. **검증**  
   룰의 체크리스트를 쓰고, 변경 요약에 **WebView에서 확인 권장**을 한 줄 적는다.

## 커밋

하단 레이아웃만 다루면 `fix:` 또는 `feat:` + 한글 설명 (예: `fix: 금거래소 하단 CTA safe area 반영`).
