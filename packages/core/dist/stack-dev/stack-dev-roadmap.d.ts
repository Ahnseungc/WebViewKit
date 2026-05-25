export interface StackDevRoadmapProps {
    /** 스택에 쌓인 페이지 경로 (아래 → 위 순) */
    pages: {
        path: string;
    }[];
    currentPath: string;
    /** false면 렌더하지 않음 */
    visible?: boolean;
}
/**
 * 개발 환경에서 스택 깊이·경로를 눈으로 확인하는 로드맵 오버레이.
 * StackRouterProvider `enableDevTools` 와 함께 사용합니다.
 */
export declare function StackDevRoadmap({ pages, currentPath, visible, }: StackDevRoadmapProps): import("@emotion/react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=stack-dev-roadmap.d.ts.map