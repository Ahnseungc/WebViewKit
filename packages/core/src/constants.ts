/**
 * push/back 전환 기본 시간 (ms). iOS 네비게이션 전환 체감에 맞춘 값.
 * `StackRouterProvider` `duration` 으로 조정
 */
export const STACK_TRANSITION_MS = 500;

/** 전환 종료 안전 타이머 여유 (animationend 누락 대비) */
export const TRANSITION_END_GRACE_MS = 50;

/** `history.back()` 이 popstate 를 기다리는 최대 시간 */
export const BACK_TIMEOUT_MS = 1000;

/** 브릿지 요청 응답 기본 타임아웃 */
export const BRIDGE_TIMEOUT_MS = 5000;

/** 네이티브 브릿지 주입 대기 기본 시간 */
export const BRIDGE_HOST_WAIT_MS = 3000;

/** 네이티브 브릿지 주입 재확인 간격 */
export const BRIDGE_HOST_POLL_MS = 100;

/** keepAlive 페이지 기본 최대 보관 수 (스택 안 keepAlive 포함) */
export const KEEP_ALIVE_LIMIT = 5;

/** 마운트된 페이지가 이 수를 넘으면 개발 모드에서 한 번 경고 */
export const DEV_MOUNTED_PAGES_WARN = 15;
