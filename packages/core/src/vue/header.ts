import { defineComponent, h, inject } from "vue";
import { ensureStackStyles } from "../stack-router/styles";
import { ActivityKey, useStackRouter } from "./context";

const BackIcon = () =>
  h(
    "svg",
    {
      width: "32",
      height: "32",
      viewBox: "0 0 24 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
    },
    h("path", {
      d: "M12 20L4 12L12 4",
      stroke: "currentColor",
      "stroke-width": "2.5",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    })
  );

export const BackRouter = defineComponent({
  name: "WvkBackRouter",
  props: {
    /** 스크린리더 라벨 */
    label: { type: String, default: "뒤로 가기" },
  },
  setup(props) {
    ensureStackStyles();
    const router = useStackRouter();
    return () =>
      h(
        "button",
        {
          type: "button",
          class: "wvk-back",
          "aria-label": props.label,
          onClick: () => router.back(),
        },
        BackIcon()
      );
  },
});

/**
 * 페이지 안에 있으면 그 페이지 기준(제목·back 버튼)으로 그려 페이지와 함께 전환된다.
 * 페이지 밖이면 현재 top 기준. 제목은 `title` prop 또는 기본 slot
 */
export const StackHeader = defineComponent({
  name: "WvkStackHeader",
  props: {
    /** 기본: 이 헤더가 속한 페이지의 path */
    title: String,
  },
  setup(props, { slots }) {
    ensureStackStyles();
    const activity = inject(ActivityKey, null);
    const router = useStackRouter();
    return () => {
      const path = activity?.value.path ?? router.currentPath;
      const showBack = activity ? activity.value.index > 0 : router.canGoBack;
      return h("header", { class: "wvk-header" }, [
        showBack ? h(BackRouter) : null,
        h(
          "h1",
          { class: "wvk-header-title" },
          slots.default?.() ?? props.title ?? path
        ),
      ]);
    };
  },
});
