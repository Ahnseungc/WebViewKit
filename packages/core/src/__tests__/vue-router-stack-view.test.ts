/**
 * @jest-environment-options {"customExportConditions": ["node", "require"]}
 */
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";
import {
  createRouter,
  createWebHistory,
  type Router,
  useRoute,
} from "vue-router";
import { StackRouterView, useStack, type VueRouterStack } from "../vue-router";

let stack: VueRouterStack;
const ASYNC_DELAY_MS = 30;

const Home = defineComponent(() => {
  stack = useStack();
  return () => h("p", { "data-testid": "home" }, "home");
});

/** 덮인 페이지가 다음 페이지의 params 를 읽지 않는지 본다 */
const Detail = defineComponent(() => {
  const route = useRoute();
  return () =>
    h("p", { "data-testid": `detail-${route.params.id}` }, route.path);
});

/** keepAlive 페이지: 입력값(state)이 보관·되살리기에서 유지되는지 본다 */
const List = defineComponent(() => {
  const draft = ref("");
  return () =>
    h("input", {
      "data-testid": "list",
      value: draft.value,
      onInput: (event: Event) => {
        draft.value = (event.target as HTMLInputElement).value;
      },
    });
});

/** useFetch·useAsyncData 처럼 setup 에서 기다리는 페이지 */
const Slow = defineComponent({
  async setup() {
    await new Promise((resolve) => setTimeout(resolve, ASYNC_DELAY_MS));
    return () => h("p", { "data-testid": "slow" }, "slow");
  },
});

let router: Router;
let wrapper: VueWrapper | undefined;

const createAppRouter = () =>
  createRouter({
    history: createWebHistory(),
    routes: [
      { path: "/", component: Home },
      { path: "/detail/:id", component: Detail },
      { path: "/list", component: List, meta: { keepAlive: true } },
      { path: "/slow", component: Slow },
    ],
  });

const mountView = async (props: Record<string, unknown> = {}) => {
  router = createAppRouter();
  await router.push(window.location.pathname);
  await router.isReady();
  wrapper = mount(StackRouterView, {
    props: { duration: 0, ...props },
    global: { plugins: [router] },
    attachTo: document.body,
  });
  await flushPromises();
  return wrapper;
};

const navigate = async (action: () => unknown) => {
  await action();
  await flushPromises();
};

/** history.back·go 는 popstate 까지 기다린다 */
const pop = async (action: () => unknown) => {
  action();
  await new Promise((resolve) => setTimeout(resolve, 50));
  await flushPromises();
};

const pageOf = (testId: string) =>
  wrapper!.get(`[data-testid="${testId}"]`).element.closest(".wvk-page")!;

/** Vue Router 가 history.state 에 남기는 모양 */
const routerState = (
  position: number,
  current: string,
  back: string | null
) => ({
  back,
  current,
  forward: null,
  position,
  replaced: false,
  scroll: null,
});

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
});

describe("StackRouterView (vue-router)", () => {
  it("push 하면 페이지가 쌓이고 덮인 페이지는 자기 route 를 유지한다", async () => {
    await mountView();

    await navigate(() => router.push("/detail/1"));
    await navigate(() => router.push("/detail/2"));

    expect(stack.depth).toBe(3);
    expect(wrapper!.get('[data-testid="detail-1"]').text()).toBe("/detail/1");
    expect(wrapper!.get('[data-testid="detail-2"]').text()).toBe("/detail/2");
    expect(wrapper!.findAll('[data-testid="detail-2"]')).toHaveLength(1);
    expect(pageOf("detail-1").getAttribute("data-state")).toBe("covered");
    expect(pageOf("detail-1").getAttribute("aria-hidden")).toBe("true");
    expect(pageOf("detail-2").getAttribute("data-state")).toBe("idle");
    expect(wrapper!.findAll("style[data-webviewkit]")).toHaveLength(1);
  });

  it("back 하면 top 이 빠지고 아래 페이지가 그대로 드러난다", async () => {
    await mountView();
    await navigate(() => router.push("/detail/1"));
    await navigate(() => router.push("/detail/2"));

    await pop(() => stack.back());

    expect(stack.depth).toBe(2);
    expect(window.location.pathname).toBe("/detail/1");
    expect(wrapper!.find('[data-testid="detail-2"]').exists()).toBe(false);
    expect(pageOf("detail-1").getAttribute("data-state")).toBe("idle");
  });

  it("forward 는 같은 history 항목을 push 방향으로 다시 쌓는다", async () => {
    await mountView();
    await navigate(() => router.push("/detail/1"));
    await pop(() => router.back());

    await pop(() => router.forward());

    expect(stack.depth).toBe(2);
    expect(wrapper!.get('[data-testid="detail-1"]').text()).toBe("/detail/1");
  });

  it("replace 는 top 을 바꾸고 깊이는 그대로다", async () => {
    await mountView();
    await navigate(() => router.push("/detail/1"));

    await navigate(() => stack.replace("/detail/3"));

    expect(stack.depth).toBe(2);
    expect(wrapper!.find('[data-testid="detail-1"]').exists()).toBe(false);
    expect(wrapper!.get('[data-testid="detail-3"]').text()).toBe("/detail/3");
  });

  it("전환 중 페이지에 방향(data-direction)이 붙는다", async () => {
    await mountView({ duration: 200 });

    await navigate(() => router.push("/detail/1"));
    expect(pageOf("detail-1").getAttribute("data-state")).toBe("enter");
    expect(pageOf("detail-1").getAttribute("data-direction")).toBe("push");

    await pop(() => router.back());
    expect(pageOf("detail-1").getAttribute("data-state")).toBe("exit");
    expect(pageOf("detail-1").getAttribute("data-direction")).toBe("pop");
  });

  it("새로고침 뒤 스택 바닥보다 뒤로 가면 pop 방향으로 새 바닥을 그린다", async () => {
    window.history.replaceState(routerState(0, "/", null), "", "/");
    window.history.pushState(routerState(1, "/detail/1", "/"), "", "/detail/1");
    window.history.pushState(
      routerState(2, "/detail/2", "/detail/1"),
      "",
      "/detail/2"
    );
    await mountView({ duration: 200 });
    expect(stack.depth).toBe(1);

    await pop(() => router.back());

    expect(stack.depth).toBe(1);
    expect(wrapper!.get('[data-testid="detail-1"]').text()).toBe("/detail/1");
    expect(pageOf("detail-1").getAttribute("data-direction")).toBe("pop");
    expect(pageOf("detail-2").getAttribute("data-state")).toBe("exit");
  });

  it("meta.keepAlive 페이지는 다시 오면 입력값을 유지한 인스턴스를 되살린다", async () => {
    await mountView();
    await navigate(() => router.push("/list"));
    const input = wrapper!.get('[data-testid="list"]');
    await input.setValue("draft");

    await pop(() => stack.back());
    await navigate(() => router.push("/list"));

    const revived = wrapper!.get('[data-testid="list"]');
    expect(revived.element).toBe(input.element);
    expect((revived.element as HTMLInputElement).value).toBe("draft");
    expect(pageOf("list").getAttribute("data-state")).toBe("idle");
    expect(stack.depth).toBe(2);
  });

  it("keepAlive prop(path 판별)도 되살리기를 켠다", async () => {
    await mountView({ keepAlive: (path: string) => path === "/detail/9" });
    await navigate(() => router.push("/detail/9"));
    const first = wrapper!.get('[data-testid="detail-9"]').element;

    await pop(() => stack.back());
    await navigate(() => router.push("/detail/9"));

    expect(wrapper!.get('[data-testid="detail-9"]').element).toBe(first);
  });

  it("async setup 페이지는 준비된 뒤에 스택에 들어간다", async () => {
    await mountView();

    await navigate(() => router.push("/slow"));
    expect(stack.depth).toBe(1);
    expect(pageOf("home").getAttribute("data-state")).toBe("idle");

    await new Promise((resolve) => setTimeout(resolve, ASYNC_DELAY_MS * 2));
    await flushPromises();

    expect(stack.depth).toBe(2);
    expect(pageOf("slow").getAttribute("data-state")).toBe("idle");
  });

  it("루트에서 back 하면 onBackAtRoot 를 부르고 이동하지 않는다", async () => {
    const onBackAtRoot = jest.fn();
    await mountView({ onBackAtRoot });

    expect(stack.back()).toBe(false);

    expect(onBackAtRoot).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe("/");
  });

  it("reset 은 스택을 path 하나로 비운다", async () => {
    await mountView();
    await navigate(() => router.push("/detail/1"));
    await navigate(() => router.push("/detail/2"));

    await navigate(() => stack.reset("/detail/5"));

    expect(stack.depth).toBe(1);
    expect(wrapper!.get('[data-testid="detail-5"]').text()).toBe("/detail/5");
  });
});
