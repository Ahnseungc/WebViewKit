/**
 * @jest-environment-options {"customExportConditions": ["node", "require"]}
 */
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";
import {
  BACK_REQUEST_METHOD,
  createBridgeEnvelope,
  serializeBridgeMessage,
  STACK_BRIDGE_METHODS,
} from "../bridge/protocol";
import {
  StackHeader,
  StackRouter,
  useActivity,
  useOnRevive,
  useParams,
  useStackRouter,
  type VueActivity,
  type VueStackRouter,
} from "../vue";

let router: VueStackRouter;
const revived: unknown[] = [];

const Home = defineComponent(() => {
  router = useStackRouter();
  return () => h("p", { "data-testid": "home" }, "home");
});

const Detail = defineComponent(() => {
  const params = useParams<{ id: string }>();
  const activity = useActivity();
  return () =>
    h(
      "p",
      { "data-testid": `detail-${params.value.id}` },
      `${params.value.id}:${activity.value.query.tab ?? ""}`
    );
});

/** keepAlive 페이지: 입력값(state)이 보관·되살리기에서 유지되는지 본다 */
const List = defineComponent(() => {
  const draft = ref("");
  useOnRevive((data) => revived.push(data));
  return () =>
    h("input", {
      "data-testid": "list",
      value: draft.value,
      onInput: (event: Event) => {
        draft.value = (event.target as HTMLInputElement).value;
      },
    });
});

const activities: VueActivity[] = [
  { path: "/detail/:id", component: Detail },
  { path: "/list", component: List, keepAlive: true },
];

let wrapper: VueWrapper | undefined;
const mountRouter = (props: Record<string, unknown> = {}) => {
  wrapper = mount(StackRouter, {
    props: {
      initialActivity: { path: "/", component: Home },
      activities,
      duration: 0,
      ...props,
    },
    attachTo: document.body,
  });
  return wrapper;
};

const pageOf = (testId: string) =>
  wrapper!.get(`[data-testid="${testId}"]`).element.parentElement!;

/** back 계열은 history.go 의 popstate 까지 기다려야 다음 이동이 풀린다 */
const go = async (action: () => unknown) => {
  action();
  await new Promise((resolve) => setTimeout(resolve, 20));
  await flushPromises();
};

const browserBack = async () => {
  window.history.back();
  await new Promise((resolve) => setTimeout(resolve, 50));
  await flushPromises();
};

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  revived.length = 0;
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  jest.useRealTimers();
});

describe("Vue StackRouter", () => {
  it("push 하면 페이지가 쌓이고 params·query 가 전달된다", async () => {
    mountRouter();

    await go(() => router.push("/detail/7?tab=info"));

    expect(wrapper!.get('[data-testid="detail-7"]').text()).toBe("7:info");
    expect([router.depth, router.currentPath, router.canGoBack]).toEqual([
      2,
      "/detail/7?tab=info",
      true,
    ]);
    expect(window.location.pathname).toBe("/detail/7");
  });

  it("top 이 아닌 페이지는 covered·inert·aria-hidden 이다", async () => {
    mountRouter();

    await go(() => router.push("/detail/1"));

    const home = pageOf("home");
    expect(home.getAttribute("data-state")).toBe("covered");
    expect(home.hasAttribute("inert")).toBe(true);
    expect(home.getAttribute("aria-hidden")).toBe("true");
    expect(pageOf("detail-1").hasAttribute("inert")).toBe(false);
  });

  it("back 하면 이전 페이지로 돌아간다", async () => {
    mountRouter();
    await go(() => router.push("/detail/1"));

    await go(() => router.back());

    expect(wrapper!.find('[data-testid="detail-1"]').exists()).toBe(false);
    expect(router.depth).toBe(1);
  });

  it("브라우저 back(popstate)도 스택을 줄인다", async () => {
    mountRouter();
    await go(() => router.push("/detail/1"));

    await browserBack();

    expect(router.currentPath).toBe("/");
  });

  it("keepAlive 페이지는 back 뒤에도 state 를 유지하고 되살아날 때 useOnRevive 가 불린다", async () => {
    mountRouter();
    await go(() => router.push("/list"));
    await wrapper!.get('[data-testid="list"]').setValue("draft");
    await go(() => router.back());

    expect(pageOf("list").getAttribute("data-state")).toBe("cached");

    await go(() => router.push("/list", { from: "home" }));

    const input = wrapper!.get('[data-testid="list"]')
      .element as HTMLInputElement;
    expect([input.value, revived]).toEqual(["draft", [{ from: "home" }]]);
  });

  it("전환은 들어오는 페이지의 animationend 에서 끝난다", async () => {
    mountRouter({ duration: 300 });
    router.push("/detail/1");
    await flushPromises();

    expect(router.isTransitioning).toBe(true);
    expect(pageOf("detail-1").getAttribute("data-transition")).toBe("slide");

    pageOf("detail-1").dispatchEvent(new Event("animationend"));
    await flushPromises();

    expect(router.isTransitioning).toBe(false);
  });

  it("isShowHeader 면 페이지마다 헤더를 그리고 back 버튼이 동작한다", async () => {
    mountRouter({ isShowHeader: true });
    await go(() => router.push("/detail/2"));

    const header = pageOf("detail-2").querySelector("header")!;
    expect(header.querySelector("h1")!.textContent).toBe("/detail/2");

    (header.querySelector("button") as HTMLButtonElement).click();
    await flushPromises();

    expect(router.depth).toBe(1);
  });

  it("등록되지 않은 경로는 onNotFound 를 부르고 이동하지 않는다", async () => {
    const onNotFound = jest.fn();
    jest.spyOn(console, "warn").mockImplementation(() => {});
    mountRouter({ onNotFound });

    await go(() => router.push("/nope"));

    expect([onNotFound.mock.calls, router.depth]).toEqual([[["/nope"]], 1]);
  });

  it("StackHeader 를 라우터 밖에서 쓰면 알려 준다", () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => mount(StackHeader)).toThrow(/StackRouter/);
  });
});

describe("Vue StackRouter bridge", () => {
  let postMessage: jest.Mock;

  beforeEach(() => {
    postMessage = jest.fn();
    window.ReactNativeWebView = { postMessage };
  });

  afterEach(() => {
    delete window.ReactNativeWebView;
  });

  const ingress = async (method: string, payload?: unknown) => {
    window.webviewkitBridge?.postMessage(
      serializeBridgeMessage(createBridgeEnvelope(method, payload))
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    await flushPromises();
  };

  it("native stack.push 가 반영되고 stack.changed 를 보낸다", async () => {
    mountRouter({ bridge: true });

    await ingress(STACK_BRIDGE_METHODS.PUSH, { url: "/detail/3" });

    expect(router.currentPath).toBe("/detail/3");
    const sent = postMessage.mock.calls.map(([raw]) => JSON.parse(raw));
    expect(sent).toContainEqual(
      expect.objectContaining({
        method: STACK_BRIDGE_METHODS.CHANGED,
        payload: { depth: 2, path: "/detail/3" },
      })
    );
  });

  it("루트의 back.request 는 onBackAtRoot 후 handled: false", async () => {
    const onBackAtRoot = jest.fn();
    mountRouter({ bridge: true, onBackAtRoot });

    await ingress(BACK_REQUEST_METHOD);

    const response = postMessage.mock.calls
      .map(([raw]) => JSON.parse(raw))
      .find((message) => message.replyTo);
    expect([onBackAtRoot.mock.calls.length, response.payload]).toEqual([
      1,
      { handled: false },
    ]);
  });
});
