# Keep-alive (페이지 보존) 설계

- 상태: 결정 반영 (2026-11-09)
- 대상: `@ahnseungchan/webviewkit` core, 2.2.0 예정

## 왜

지금은 back 으로 pop 된 페이지가 언마운트된다. 같은 페이지를 다시 push 하면 컴포넌트를 처음부터 다시 그리고,
스크롤 위치·입력값·컴포넌트 state 가 모두 사라진다. 사용자는 "방금 본 페이지를 다시 열면 바로 그 상태로 떠야 한다"고 기대한다.

이 라이브러리는 개인 오픈소스라 특정 앱이 아니라 범용 React WebView 앱 기준으로 설계한다.

## 목표

- 라우트 단위로 opt-in 한 페이지는 스택에서 빠져도 숨긴 채 살아 있다.
- 같은 페이지를 다시 push 하면 새로 만들지 않고 살려 둔 인스턴스를 되살린다. 스크롤·입력값·state·DOM 이 그대로다.
- 되살아난 페이지가 그 사실을 알고 필요하면 데이터만 새로 고칠 수 있다.
- 보관 개수에 상한을 둬 WebView 메모리를 지킨다.

## 비목표

- 데이터(API 응답) 캐시. 그건 TanStack Query 같은 앱 레이어 몫이다.
- 새로고침·앱 재시작 후에도 남는 영구 보존. 메모리에만 둔다.
- 스택 안에 아직 있는 페이지 처리. 그 페이지들은 지금도 살아 있다.

## 반-목표 (이렇게 되면 실패)

- opt-in 하지 않은 페이지가 이전 상태로 되살아난다. 주문서·폼처럼 다시 열 때 비어 있어야 하는 화면이 깨진다.
- 보관 페이지가 무한히 쌓여 WebView 가 느려지거나 죽는다.
- 기존 규칙 "같은 path 를 다시 push 하면 새 엔트리" 가 keep-alive 아닌 라우트에서 바뀐다.
- 되살아난 페이지의 스크롤 위치가 맨 위로 튄다.

## 사용자가 정한 것

- **방식**: 데이터 캐시가 아니라 페이지 보존(keep-alive).
- **켜는 단위**: 라우트별 opt-in, 기본 꺼짐.
- **보관 상한**: 기본 5개, 넘치면 가장 오래 안 쓴 것부터 버림(LRU). Provider 에서 바꿀 수 있음.
- **보관 시점**: back 뿐 아니라 `replace`·`reset`·`resetPush` 로 지워지는 모든 경우에 보관.
- **같은 페이지 기준**: path + query.
- **`resetPush(A)` 에서 A 가 지워질 스택 안에 있으면**: 그 A 를 되살린다(keepAlive 라우트일 때). 스크롤·입력값 유지.
- **브라우저 back popstate 가 보관된 key 에 닿으면**: pop 애니메이션으로 되살린다.

## 공개 API

```tsx
const activities = [
  { path: "/list", element: <List />, keepAlive: true },
  { path: "/detail/:id", element: <Detail />, keepAlive: true },
  { path: "/order", element: <Order /> }, // 보존 안 함
];

<StackRouterProvider Activities={activities} keepAliveLimit={5} />;
```

- `Activity.keepAlive?: boolean` (기본 false)
- `StackRouterProviderProps.keepAliveLimit?: number` (기본 `KEEP_ALIVE_LIMIT = 5`, 상수로 export). 0 이면 기능 꺼짐.
- `useActivity()` 에 `isCached: boolean` 추가. 보관 중(숨김)일 때 true.
- `useOnRevive(callback)`: 이 페이지가 보관 상태에서 되살아나 top 이 될 때 호출. 인자로 새 push 의 `data`. `resetPush` 가 스택 안 인스턴스를 재사용할 때도 호출한다(엔트리 `revision` 증가로 판단, `useActivity().revision`).

## 동작

### 같은 페이지의 기준

`entry.path` (pathname + search) 가 같으면 같은 페이지다. `/detail/1` 과 `/detail/2`, `?tab=a` 와 `?tab=b` 는 별개.

### 보관 (스택에서 빠질 때)

엔트리가 스택에서 빠지는 모든 경우에 해당 Activity 가 `keepAlive` 면 보관 목록으로 옮긴다.

- `back` / `pop(n)` / `popTo`: 퇴장 애니메이션이 끝난 뒤(`END_TRANSITION`) 보관.
- `resetPush`, `reset`, `replace` 로 지워지는 엔트리: 전환이 있으면 끝난 뒤, 없으면 즉시 보관.
- 같은 path 의 보관 엔트리가 이미 있으면 오래된 쪽을 버리고 새 쪽을 남긴다.
- 보관 목록이 `keepAliveLimit` 를 넘으면 가장 오래전에 보관된 것부터 버린다(언마운트).

### 되살리기 (push 할 때)

`push(path, data)` 에서 path 가 같은 보관 엔트리가 있으면:

- 새 엔트리를 만들지 않고 그 엔트리를 보관 목록에서 꺼내 스택 top 에 올린다. **key 를 유지**해야 React 인스턴스가 유지된다.
- `data` 는 새 값으로 바꾼다. `useActivity().data` 가 바뀐다.
- history 에는 그 key 로 push 한다. 전환은 일반 push 와 같다.
- `useOnRevive` 콜백을 전환 시작 시점에 호출한다.

`resetPush(path)` 의 대상도 같은 규칙으로 되살린다. 순서는 **지워질 엔트리를 먼저 보관 → 그다음 보관 목록에서 path 를 찾는다**.
그래서 `[root, A, B]` 에서 `resetPush(A)` 하면 방금 지워진 A 가 되살아나 `[root, A]` 가 된다(A 가 keepAlive 일 때). 전환은 B 에서 A 로 가는 push 슬라이드.

`replace`·`reset` 의 대상은 되살리지 않는다(빌더 판단 여지 있음, 아래 참고).

### 브라우저 popstate

- **forward** (`historyState.index === entries.length`): key 가 보관 목록에 있으면 그 엔트리를 push 애니메이션으로 되살린다.
- **back** (`historyState.index < entries.length`) 인데 key 가 스택엔 없고 보관 목록에 있으면: 스택을 `entries.slice(0, index)` 로 자르고
  그 위에 보관 엔트리를 올려 **pop 애니메이션**으로 되살린다. 잘린 엔트리는 보관 규칙을 따른다.
- 참고: `reset`·`resetPush` 는 이제 history 를 루트까지 되감기 때문에(2.2.0 Unreleased 수정) 정상 흐름에서 back 이 지워진 페이지에 닿는 일은 드물다.
  이 규칙은 history 와 스택이 어긋난 경우의 안전망이다.

### 렌더링

- 보관 엔트리는 **스택 페이지와 같은 부모(`PageContainer`) 안, 같은 key 로** 계속 렌더한다. 부모가 바뀌면 리마운트되어 의미가 없다.
- 렌더 순서: 보관 엔트리 → 스택 엔트리 → leaving. 보관 엔트리의 `pageState` 는 새 값 `"cached"`.
- `"cached"` 는 지금의 `"covered"` 와 같이 `visibility: hidden` + `inert` + `aria-hidden`.
  `display: none` 은 스크롤 위치를 잃을 수 있어 쓰지 않는다.
- 페이지 안 헤더(`isShowHeader`)도 페이지와 함께 보존된다.

### 리듀서 상태

`StackState` 에 `cached: StackEntry[]` (오래된 → 최근 순) 추가. 액션:

- `PUSH` 에 `revivedFrom?: "cache"` 등으로 보관에서 꺼낸 엔트리임을 표시하거나 별도 `REVIVE` 액션.
- `END_TRANSITION` 에서 leaving 중 keepAlive 인 것을 `cached` 로 옮기고 상한을 적용.
- keepAlive 여부는 리듀서가 Activity 목록을 모르므로, 엔트리에 `keepAlive: boolean` 을 만들 때 기록해 둔다.

### 기존 기능과의 관계

- 브릿지 `stack.changed`, `entries`, `depth`, Dev Roadmap 은 스택 엔트리만 다룬다. 보관 엔트리는 포함하지 않는다.
- `isTransitioning`·입력 잠금 규칙은 그대로다.
- 새로고침·딥링크 복원에서는 보관 목록이 비어 있다.

## 스택 깊이와 메모리

리뷰 지적: 스택에 쌓인 페이지는 모두 마운트된 채라 깊어질수록 메모리가 는다. keep-alive 는 여기에 보관 페이지까지 더한다.

- 보관 페이지는 `keepAliveLimit` 로 상한이 있다.
- 스택 안 페이지용으로 `maxMountedPages?: number` 를 추가한다. 기본은 제한 없음(지금과 같음).
  - 값을 주면, top 에서 그 수보다 아래에 있는 `covered` 페이지 중 keepAlive 가 아닌 것은 언마운트하고 자리(엔트리)만 남긴다.
  - back 으로 그 페이지에 돌아오면 새로 마운트한다(state·스크롤은 잃는다). 전환은 평소와 같다.
  - keepAlive 페이지는 언마운트하지 않는다. 대신 스택 안 keepAlive 페이지 수도 `keepAliveLimit` 에 포함해 전체 마운트 수를 묶는다.
- 개발 모드에서 마운트된 페이지 수(스택 + 보관)가 `DEV_MOUNTED_PAGES_WARN = 15` 를 넘으면 한 번 `console.warn`.

## 내가 정한 것 (확인 필요)

- `maxMountedPages` 이름과 기본값(제한 없음), 언마운트 대상에서 keepAlive 페이지 제외.
- 스택 안 keepAlive 페이지도 `keepAliveLimit` 에 포함.
- 개발 경고 기준 15.
- React 19 `<Activity mode="hidden">` 는 1차에서 쓰지 않음. 숨김을 `display: none` 으로 처리해 스크롤 위치를 잃을 위험이 있고, peer 가 react>=18 이라 분기가 필요하다. 대신 보관 중 타이머·영상 같은 효과는 앱이 `isCached` 를 보고 멈춘다. (앞서 채팅에서는 Activity 사용을 제안했는데 이 이유로 바꿈)
- 보관 상한 기본값 5, `keepAliveLimit={0}` 은 전역 끄기.

## 빌더에게 맡기는 것

- 리듀서 액션 모양(`REVIVE` 별도 vs `PUSH` 확장).
- `useOnRevive` 호출 타이밍 세부(전환 시작 vs 끝). 기본은 시작.
- Dev Roadmap 에 보관 개수를 보여줄지.
- `replace`·`reset` 대상 path 가 보관 목록에 있을 때 되살릴지(기본: 되살리지 않고 보관본은 버림).

## 테스트 기준

- keepAlive 페이지: push → 입력/카운터 변경 → back → 다시 push 하면 state 가 유지된다.
- keepAlive 아닌 페이지는 지금처럼 새로 마운트된다.
- 다른 params(`/detail/1` vs `/detail/2`)는 서로 되살리지 않는다.
- 상한 초과 시 가장 오래된 보관 페이지가 언마운트된다.
- 되살아난 페이지에 새 `data` 가 반영되고 `useOnRevive` 가 한 번 호출된다.
- 보관 중 `isCached` 가 true, 페이지는 `inert`·`aria-hidden`.
- 브라우저 forward 로 돌아온 경우 push, 브라우저 back 으로 보관 key 에 닿은 경우 pop 애니메이션으로 되살아난다.
- `[root, A, B]` 에서 `resetPush(A)` 하면 기존 A 인스턴스가 되살아난다(state 유지).
- `reset`·`replace` 로 지워진 keepAlive 페이지도 보관되어 다음 push 에서 되살아난다.
- `maxMountedPages={2}` 에서 깊이 4 스택의 아래쪽 non-keepAlive 페이지가 언마운트되고, back 으로 돌아오면 새로 마운트된다.
- 모든 경우 URL·`history.state.key`·스택 top 이 일치한다 (`navigation-consistency` 테스트 패턴).
- 데모(`packages/browser`)에 keepAlive 라우트를 추가해 스크롤 위치 보존을 실제로 확인한다.
