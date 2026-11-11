import { act, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import {
  MemoryRouter,
  type NavigateFunction,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router";
import { StackOutlet, type StackOutletProps, useStack } from "../react-router";

const Detail = () => {
  const { id } = useParams();
  const { pathname } = useLocation();
  return <p>{`detail ${id} at ${pathname}`}</p>;
};

const Form = () => <input aria-label="memo" />;

const StackInfo = () => {
  const { depth, back } = useStack();
  return (
    <button type="button" onClick={back}>
      {`depth ${depth}`}
    </button>
  );
};

const renderStack = (props: StackOutletProps = {}) => {
  let navigate: NavigateFunction = () => undefined;
  const CaptureNavigate = () => {
    navigate = useNavigate();
    return null;
  };
  render(
    <MemoryRouter initialEntries={["/"]}>
      <CaptureNavigate />
      <Routes>
        <Route element={<StackOutlet duration={0} {...props} />}>
          <Route index element={<StackInfo />} />
          <Route path="detail/:id" element={<Detail />} />
          <Route path="form" element={<Form />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
  return {
    navigate: (to: string | number, options?: { replace?: boolean }) =>
      act(() => {
        if (typeof to === "number") void navigate(to);
        else void navigate(to, options);
      }),
  };
};

const pageStates = () =>
  Array.from(document.querySelectorAll(".wvk-page")).map(
    (page) => `${(page as HTMLElement).dataset.state}|${page.textContent}`
  );

describe("StackOutlet (react-router)", () => {
  it("push 하면 이전 페이지를 덮고 새 페이지를 위에 쌓는다", async () => {
    const router = renderStack();
    await router.navigate("/detail/1");

    expect(pageStates()).toEqual([
      "covered|depth 2",
      "idle|detail 1 at /detail/1",
    ]);
  });

  it("같은 라우트로 push 해도 아래 페이지는 들어올 때의 params·location 을 유지한다", async () => {
    const router = renderStack();
    await router.navigate("/detail/1");
    await router.navigate("/detail/2");

    expect(pageStates()).toEqual([
      "covered|depth 3",
      "covered|detail 1 at /detail/1",
      "idle|detail 2 at /detail/2",
    ]);
  });

  it("back 하면 위 페이지를 빼고 아래 페이지가 top 이 된다", async () => {
    const router = renderStack();
    await router.navigate("/detail/1");
    await router.navigate(-1);

    expect(pageStates()).toEqual(["idle|depth 1"]);
  });

  it("replace 는 스택 깊이를 늘리지 않는다", async () => {
    const router = renderStack();
    await router.navigate("/detail/1", { replace: true });

    expect(pageStates()).toEqual(["idle|detail 1 at /detail/1"]);
  });

  it("keepAlive 페이지는 다시 push 하면 입력 상태를 그대로 되살린다", async () => {
    const router = renderStack({ keepAlive: (path) => path === "/form" });
    await router.navigate("/form");
    fireEvent.change(screen.getByLabelText("memo"), {
      target: { value: "draft" },
    });
    await router.navigate(-1);
    // DOM 순서는 처음 그린 순서로 고정된다 (쌓임은 z-index)
    expect(pageStates()).toEqual(["idle|depth 1", "cached|"]);

    await router.navigate("/form");

    expect(screen.getByLabelText("memo")).toHaveValue("draft");
    expect(pageStates()).toEqual(["covered|depth 2", "idle|"]);
  });

  it("keepAlive 가 아니면 다시 push 할 때 새로 마운트한다", async () => {
    const router = renderStack();
    await router.navigate("/form");
    fireEvent.change(screen.getByLabelText("memo"), {
      target: { value: "draft" },
    });
    await router.navigate(-1);
    await router.navigate("/form");

    expect(screen.getByLabelText("memo")).toHaveValue("");
  });

  it("useStack().back 은 루트에서 onBackAtRoot 를 부르고, 위에서는 history 를 되돌린다", async () => {
    const onBackAtRoot = jest.fn();
    const router = renderStack({ onBackAtRoot });
    fireEvent.click(screen.getByText("depth 1"));
    expect(onBackAtRoot).toHaveBeenCalledTimes(1);

    await router.navigate("/detail/1");
    act(() => {
      fireEvent.click(screen.getByText("depth 2"));
    });

    expect(pageStates()).toEqual(["idle|depth 1"]);
  });
});
