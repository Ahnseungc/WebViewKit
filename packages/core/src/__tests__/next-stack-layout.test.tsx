import { act, fireEvent, render, screen } from "@testing-library/react";
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  PathnameContext,
  PathParamsContext,
  SearchParamsContext,
} from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import React, { useContext, useState } from "react";
import { StackLayout, type StackLayoutProps, useStack } from "../next";

const mockRouter = { push: jest.fn(), replace: jest.fn() };
jest.mock("next/navigation", () => ({ useRouter: () => mockRouter }));

type LayoutRouterValue = NonNullable<
  React.ContextType<typeof LayoutRouterContext>
>;

/** 테스트용 세그먼트 트리: url 만 담는다 */
const treeFor = (url: string) => ({ url }) as unknown as LayoutRouterValue;

const Detail = () => {
  const params = useContext(PathParamsContext) as { id?: string } | null;
  const pathname = useContext(PathnameContext);
  return <p>{`detail ${params?.id} at ${pathname}`}</p>;
};

const Form = () => {
  const [value, setValue] = useState("");
  return (
    <input
      aria-label="kept"
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  );
};

/** layout 의 children(OuterLayoutRouter) 흉내: LayoutRouterContext 의 트리로 화면을 고른다 */
const Slot = () => {
  const tree = useContext(LayoutRouterContext);
  const url = (tree as unknown as { url: string }).url;
  if (url.startsWith("/detail/")) return <Detail />;
  if (url === "/form") return <Form />;
  return <p>home</p>;
};

let backAtRoot: () => boolean = () => false;
const CaptureStack = () => {
  backAtRoot = useStack().back;
  return null;
};

/** Next AppRouter 흉내: URL 로 라우터 컨텍스트를 만든다 */
const App = ({
  url,
  ...props
}: { url: string } & Partial<StackLayoutProps>) => {
  const { pathname, search } = new URL(url, "http://localhost");
  const id = pathname.match(/^\/detail\/(\w+)/)?.[1];
  return (
    <PathnameContext.Provider value={pathname}>
      <PathParamsContext.Provider value={id ? { id } : {}}>
        <SearchParamsContext.Provider value={new URLSearchParams(search)}>
          <LayoutRouterContext.Provider value={treeFor(pathname)}>
            <StackLayout duration={0} {...props}>
              <Slot />
              <CaptureStack />
            </StackLayout>
          </LayoutRouterContext.Provider>
        </SearchParamsContext.Provider>
      </PathParamsContext.Provider>
    </PathnameContext.Provider>
  );
};

const renderStack = (props: Partial<StackLayoutProps> = {}) => {
  window.history.replaceState({ __NA: true }, "", "/");
  const view = render(<App url="/" {...props} />);
  const rerender = () =>
    view.rerender(<App url={window.location.pathname} {...props} />);
  return {
    // Next 처럼 history 를 먼저 쓰고 같은 커밋에서 새 트리를 그린다
    push: (url: string) =>
      act(() => {
        window.history.pushState({ __NA: true }, "", url);
        rerender();
      }),
    replace: (url: string) =>
      act(() => {
        window.history.replaceState({ __NA: true }, "", url);
        rerender();
      }),
    back: () =>
      act(async () => {
        const popped = new Promise((resolve) =>
          window.addEventListener("popstate", resolve, { once: true })
        );
        window.history.back();
        await popped;
        rerender();
      }),
  };
};

const pageStates = () =>
  Array.from(document.querySelectorAll(".wvk-page")).map(
    (page) => `${(page as HTMLElement).dataset.state}|${page.textContent}`
  );

describe("StackLayout (next)", () => {
  it("push 하면 이전 페이지를 덮고 새 페이지를 위에 쌓는다", async () => {
    const stack = renderStack();
    await stack.push("/detail/1");

    expect(pageStates()).toEqual([
      "covered|home",
      "idle|detail 1 at /detail/1",
    ]);
  });

  it("같은 라우트로 push 해도 아래 페이지는 들어올 때의 트리·params·pathname 을 유지한다", async () => {
    const stack = renderStack();
    await stack.push("/detail/1");
    await stack.push("/detail/2");

    expect(pageStates()).toEqual([
      "covered|home",
      "covered|detail 1 at /detail/1",
      "idle|detail 2 at /detail/2",
    ]);
  });

  it("back(popstate) 하면 위 페이지를 빼고 아래 페이지가 top 이 된다", async () => {
    const stack = renderStack();
    await stack.push("/detail/1");
    await stack.back();

    expect(pageStates()).toEqual(["idle|home"]);
    expect(screen.getByText("home")).toBeInTheDocument();
  });

  it("replace 는 스택 깊이를 늘리지 않는다", async () => {
    const stack = renderStack();
    await stack.replace("/detail/1");

    expect(pageStates()).toEqual(["idle|detail 1 at /detail/1"]);
  });

  it("같은 URL 로 history 를 다시 쓰면(refresh·재검증) 스택을 바꾸지 않는다", async () => {
    const stack = renderStack();
    await stack.push("/detail/1");
    await stack.replace("/detail/1");

    expect(pageStates()).toEqual([
      "covered|home",
      "idle|detail 1 at /detail/1",
    ]);
  });

  it("keepAlive 페이지는 다시 오면 입력값을 그대로 되살린다", async () => {
    const stack = renderStack({ keepAlive: (path) => path === "/form" });
    await stack.push("/form");
    fireEvent.change(screen.getByLabelText("kept"), {
      target: { value: "typed" },
    });
    await stack.back();

    expect(pageStates()).toEqual(["idle|home", "cached|"]);

    await stack.push("/form");

    expect(pageStates()).toEqual(["covered|home", "idle|"]);
    expect(screen.getByLabelText("kept")).toHaveValue("typed");
  });

  it("루트에서 useStack().back 하면 onBackAtRoot 를 부르고, 아니면 history 를 뒤로 보낸다", async () => {
    const onBackAtRoot = jest.fn();
    const stack = renderStack({ onBackAtRoot });

    expect(backAtRoot()).toBe(false);
    expect(onBackAtRoot).toHaveBeenCalledTimes(1);

    await stack.push("/detail/1");
    const go = jest.spyOn(window.history, "go").mockImplementation(() => {});
    expect(backAtRoot()).toBe(true);
    expect(go).toHaveBeenCalledWith(-1);
    go.mockRestore();
  });
});
