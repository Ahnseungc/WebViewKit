---
name: framer-motion-interaction
description: >-
  Goldie 프론트에서 Framer Motion으로 토스 스타일 인터랙션(배너/패널/리스트 전환)을 구현할 때 사용하는 실무 스킬.
  Triggers: framer-motion, 애니메이션, 인터랙션, 토스처럼, 배너 등장, padding 애니메이션, motion.
---

# Framer Motion 인터랙션 스킬

규칙 원본: `.cursor/rules/framer-motion-interaction.mdc`

## 1. 언제 쓰는가

- 상태에 따라 UI가 생기거나 사라지는 경우 (배너, 경고바, 토스트형 인라인 알림)
- 높이/패딩 변화가 필요한 경우 (아코디언, 접힘 패널)
- 리스트/카드 재배치가 사용자에게 갑작스럽게 느껴지는 경우

## 2. 구현 순서

1. **전환 대상 정의**
   - 무엇이 바뀌는지 먼저 결정한다: `opacity`, `y`, `height`, `padding`.
2. **컴포넌트 분리 먼저**
   - 페이지/뷰 파일에 모션 코드를 직접 길게 작성하지 않는다.
   - 애니메이션 전용 컴포넌트(예: `PendingCheckoutBannerMotion`)를 분리해 import 한다.
   - UI 표시 컴포넌트와 모션 래퍼 컴포넌트의 책임을 분리한다.
3. **공간 전환 우선**
   - 등장/퇴장 시 부모 컨테이너에 `height + padding + opacity`를 준다.
   - 부모는 `overflow-hidden`으로 잘림을 제어한다.
4. **콘텐츠 전환 분리**
   - 내부 콘텐츠는 별도 `motion.div`로 `y`/`scale`만 미세하게 준다.
5. **타이밍 조정**
   - 컨테이너 `0.28~0.34s`, 내부 콘텐츠 `0.2~0.28s`.
   - ease는 `[0.22, 1, 0.36, 1]` 기본값 권장.

## 3. 토스 스타일 프리셋

- 등장: 위에서 살짝 내려오며 고정 (`y: -6~ -10 -> 0`, `opacity: 0 -> 1`)
- 퇴장: 반대로 짧게 축소/상향 후 사라짐 (`y: -4`, `opacity: 0`)
- scale 변화는 `0.98 ~ 1.0` 정도의 미세 값만 사용

## 4. 샘플 패턴

```tsx
<AnimatePresence initial={false}>
  {isVisible ? (
    <motion.div
      initial={{ height: 0, paddingTop: 0, paddingBottom: 0, opacity: 0 }}
      animate={{ height: "auto", paddingTop: 12, paddingBottom: 4, opacity: 1 }}
      exit={{ height: 0, paddingTop: 0, paddingBottom: 0, opacity: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className='overflow-hidden'
    >
      <motion.div
        initial={{ y: -8, scale: 0.985 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: -4, scale: 0.99 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1], delay: 0.02 }}
      >
        {children}
      </motion.div>
    </motion.div>
  ) : null}
</AnimatePresence>
```

## 5. 검증 체크리스트

- 애니메이션이 끝나도 레이아웃 간격이 의도값과 같은가
- 배너가 반복 노출될 때 깜빡임/점프가 없는가
- 저사양 기기(WebView)에서 프레임 드랍이 없는가
- `prefers-reduced-motion` 환경에서도 사용성 저하가 없는가
- 애니메이션 코드가 페이지/뷰 본문에 과도하게 누적되지 않았는가 (컴포넌트 분리 여부)
- 레이아웃 쉬프트(CLS) 관점에서 인접 섹션이 밀리거나 점프하지 않는가
- 이미지/아이콘/텍스트 길이 변화로 애니메이션 중 높이 재계산이 반복되지 않는가

## 6. 최적화 팁

- 기본은 `transform + opacity`, 필요할 때만 `height/padding`을 애니메이션한다.
- `height` 전환이 필요한 경우 부모에 `overflow-hidden`을 두고, 예약 높이 또는 최소 높이 전략을 먼저 검토한다.
- 목록/피드 화면에서는 모든 아이템에 `layout`을 켜지 말고, 실제 이동이 필요한 블록만 제한적으로 적용한다.
- WebView에서 느려지는 구간은 duration을 줄이고(예: `0.24s`), spring bounce를 제거해 안정성을 우선한다.
