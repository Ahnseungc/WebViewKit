import {
  computed,
  defineComponent,
  h,
  type PropType,
  provide,
  ref,
  watch,
} from "vue";
import {
  type StackPageLayout,
  toActivityInfo,
} from "../stack-router/page-layout";
import {
  getStackPageAttributes,
  hasPendingAnimation,
  isOwnPageAnimation,
} from "../stack-router/styles";
import type { StackTransitionType } from "../type";
import { ActivityKey } from "./context";

/** 스택 한 장. top 이 아니면 inert·aria-hidden (스크린리더·포커스 차단) */
export const StackPage = defineComponent({
  name: "WvkStackPage",
  props: {
    page: { type: Object as PropType<StackPageLayout>, required: true },
    direction: { type: String as PropType<"push" | "pop">, required: true },
    transition: {
      type: String as PropType<StackTransitionType>,
      required: true,
    },
    duration: { type: Number, required: true },
    /** 커밋 직후 시작 대기 중인 CSS 애니메이션이 있으면 호출 (enter 페이지만) */
    onAnimationPending: Function as PropType<() => void>,
    onAnimationStart: Function as PropType<() => void>,
    onAnimationEnd: Function as PropType<() => void>,
  },
  setup(props, { slots }) {
    const element = ref<HTMLElement | null>(null);
    provide(
      ActivityKey,
      computed(() => toActivityInfo(props.page))
    );

    watch(
      () => props.page.isTop,
      (isTop) => element.value?.toggleAttribute("inert", !isTop),
      { flush: "post", immediate: true }
    );
    // 전환(상태·방향)이 바뀔 때만 확인한다
    watch(
      () => [props.page.pageState, props.direction],
      () => {
        if (!element.value || !props.onAnimationPending) return;
        if (hasPendingAnimation(element.value)) props.onAnimationPending();
      },
      { flush: "post", immediate: true }
    );

    return () => {
      const { className, ...attributes } = getStackPageAttributes(props.page, {
        direction: props.direction,
        transition: props.transition,
        duration: props.duration,
      });
      return h(
        "div",
        {
          ...attributes,
          ref: element,
          class: className,
          onAnimationstart: (event: AnimationEvent) => {
            if (isOwnPageAnimation(event)) props.onAnimationStart?.();
          },
          onAnimationend: (event: AnimationEvent) => {
            if (isOwnPageAnimation(event)) props.onAnimationEnd?.();
          },
        },
        slots.default?.()
      );
    };
  },
});
