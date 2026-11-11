/** GitHub Pages 처럼 하위 경로(/webview-kit/)에 배포될 때 라우트 앞에 붙는 경로. 로컬은 "" */
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/** 데모 라우트(`/detail/1`)를 배포 경로 기준 URL 로 바꾼다 */
export const href = (path: string) => `${BASE}${path}`;
