import { act, render, screen } from "@testing-library/react";
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
import { StackOutlet } from "../react-router";

const Detail = () => {
  const { id } = useParams();
  const { pathname } = useLocation();
  return <p>{`detail ${id} at ${pathname}`}</p>;
};

const renderStack = () => {
  let navigate: NavigateFunction = () => undefined;
  const CaptureNavigate = () => {
    navigate = useNavigate();
    return null;
  };
  render(
    <MemoryRouter initialEntries={["/"]}>
      <CaptureNavigate />
      <Routes>
        <Route element={<StackOutlet duration={0} />}>
          <Route index element={<p>home</p>} />
          <Route path="detail/:id" element={<Detail />} />
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
      "covered|home",
      "idle|detail 1 at /detail/1",
    ]);
  });

  it("같은 라우트로 push 해도 아래 페이지는 들어올 때의 params·location 을 유지한다", async () => {
    const router = renderStack();
    await router.navigate("/detail/1");
    await router.navigate("/detail/2");

    expect(pageStates()).toEqual([
      "covered|home",
      "covered|detail 1 at /detail/1",
      "idle|detail 2 at /detail/2",
    ]);
  });

  it("back 하면 위 페이지를 빼고 아래 페이지가 top 이 된다", async () => {
    const router = renderStack();
    await router.navigate("/detail/1");
    await router.navigate(-1);

    expect(pageStates()).toEqual(["idle|home"]);
    expect(screen.getByText("home")).toBeInTheDocument();
  });

  it("replace 는 스택 깊이를 늘리지 않는다", async () => {
    const router = renderStack();
    await router.navigate("/detail/1", { replace: true });

    expect(pageStates()).toEqual(["idle|detail 1 at /detail/1"]);
  });
});
