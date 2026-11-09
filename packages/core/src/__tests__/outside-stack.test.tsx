import { render, screen } from "@testing-library/react";
import React from "react";
import { useOnRevive } from "../stack-router/activity-context";
import StackRouterProvider, {
  useOptionalStackRouter,
} from "../stack-router/stack-router-provider";

const Probe = () => {
  const router = useOptionalStackRouter();
  return <div data-testid="probe">{router ? router.currentPath : "none"}</div>;
};

const ReviveProbe = () => {
  useOnRevive(() => {});
  return <div data-testid="revive">ok</div>;
};

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("스택 밖·안 공용 훅", () => {
  it("useOptionalStackRouter 는 Provider 밖에서 null 을 준다", () => {
    render(<Probe />);

    expect(screen.getByTestId("probe")).toHaveTextContent("none");
  });

  it("useOptionalStackRouter 는 Provider 안에서 라우터를 준다", () => {
    render(
      <StackRouterProvider
        initialActivity={{ path: "/", element: <Probe /> }}
      />
    );

    expect(screen.getByTestId("probe")).toHaveTextContent("/");
  });

  it("useOnRevive 는 스택 밖에서 throw 하지 않는다", () => {
    render(<ReviveProbe />);

    expect(screen.getByTestId("revive")).toBeInTheDocument();
  });
});

describe("개발 오버레이", () => {
  const originalEnv = process.env.NODE_ENV;
  afterEach(() => {
    (process.env as Record<string, string>).NODE_ENV = originalEnv as string;
  });

  it("개발 모드여도 enableDevTools 를 켜지 않으면 보이지 않는다", () => {
    (process.env as Record<string, string>).NODE_ENV = "development";
    render(
      <StackRouterProvider initialActivity={{ path: "/", element: <div /> }} />
    );

    expect(screen.queryByText("WebViewKit")).toBeNull();
  });

  it("enableDevTools 를 켜면 보인다", () => {
    render(
      <StackRouterProvider
        initialActivity={{ path: "/", element: <div /> }}
        enableDevTools
      />
    );

    expect(screen.getByText("WebViewKit")).toBeInTheDocument();
  });
});
