import { fireEvent, render } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toPageComponents } from "../navigation.js";
import StackLayout from "../StackLayout.svelte";
import type { StackLayoutProps } from "../types.js";
import Detail from "./Detail.svelte";
import Form from "./Form.svelte";
import Home from "./Home.svelte";
import { kit } from "./kit.js";
import { probe } from "./probe.js";

// import.meta.glob("./**/+page.svelte", { eager: true }) 결과와 같은 모양
const pages = {
  "./+page.svelte": { default: Home },
  "./detail/[id]/+page.svelte": { default: Detail },
  "./form/+page.svelte": { default: Form },
};

const renderLayout = (props: Partial<StackLayoutProps> = {}) =>
  render(StackLayout, { props: { pages, duration: 0, ...props } });

const stack = () => probe.stack!;

const pageOf = (container: HTMLElement, testId: string) =>
  container.querySelector(`[data-testid="${testId}"]`)?.closest(".wvk-page");

const text = (container: HTMLElement, testId: string) =>
  container.querySelector(`[data-testid="${testId}"]`)?.textContent?.trim();

beforeEach(() => {
  probe.stack = null;
  kit.start("/");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SvelteKit StackLayout", () => {
  it("이동하면 페이지가 쌓이고 아래 페이지는 covered 로 남는다", async () => {
    const { container } = renderLayout();

    await kit.navigate("/detail/1");

    expect(stack().depth).toBe(2);
    expect(stack().canGoBack).toBe(true);
    expect(pageOf(container, "home")?.getAttribute("data-state")).toBe(
      "covered"
    );
    expect(pageOf(container, "detail-1")?.getAttribute("data-state")).toBe(
      "idle"
    );
  });

  it("덮인 페이지는 들어올 때의 params·url·data 를 그대로 보여준다", async () => {
    const { container } = renderLayout();

    await kit.navigate("/detail/1");
    await kit.navigate("/detail/2");

    expect(text(container, "detail-1")).toBe("1|1|/detail/1|1");
    expect(text(container, "detail-2")).toBe("2|2|/detail/2|2");
    expect(container.querySelectorAll(".wvk-page")).toHaveLength(3);
  });

  it("top 페이지만 같은 위치의 data 갱신(invalidate)을 받는다", async () => {
    const { container } = renderLayout();

    await kit.navigate("/detail/1");
    await kit.navigate("/detail/2");
    await kit.reload({ id: "2-new" });

    expect(text(container, "detail-2")).toBe("2|2|/detail/2|2-new");
    expect(text(container, "detail-1")).toBe("1|1|/detail/1|1");
  });

  it("back 은 history.go(-1) 로 가고, popstate 뒤 위 페이지가 빠진다", async () => {
    const go = vi.spyOn(window.history, "go").mockImplementation(() => {});
    const { container } = renderLayout();

    await kit.navigate("/detail/1");
    await kit.navigate("/detail/2");
    expect(stack().back()).toBe(true);
    expect(go).toHaveBeenCalledWith(-1);

    await kit.traverse(-1);

    expect(stack().depth).toBe(2);
    expect(pageOf(container, "detail-2")).toBeFalsy();
    expect(text(container, "detail-1")).toBe("1|1|/detail/1|1");
  });

  it("replace 이동은 깊이를 그대로 두고 top 만 바꾼다", async () => {
    const { container } = renderLayout();

    await kit.navigate("/detail/1");
    await kit.navigate("/detail/9", { replace: true });

    expect(stack().depth).toBe(2);
    expect(pageOf(container, "detail-1")).toBeFalsy();
    expect(text(container, "detail-9")).toBe("9|9|/detail/9|9");
  });

  it("push·replace·reset 은 goto 로 이동한다", async () => {
    const { goto } = await import("$app/navigation");
    renderLayout();

    stack().push("/detail/3");
    await Promise.resolve();
    expect(stack().depth).toBe(2);

    stack().reset("/detail/4");
    await Promise.resolve();
    expect(goto).toHaveBeenLastCalledWith("/detail/4", { replaceState: true });
    expect(stack().depth).toBe(1);
  });

  it("keepAlive 페이지는 다시 오면 입력 상태를 그대로 되살린다", async () => {
    vi.spyOn(window.history, "go").mockImplementation(() => {});
    const { container } = renderLayout({
      keepAlive: (path) => path === "/form",
    });

    await kit.navigate("/form");
    const input = container.querySelector<HTMLInputElement>(
      '[data-testid="form-input"]'
    )!;
    await fireEvent.input(input, { target: { value: "typed" } });

    stack().back();
    await kit.traverse(-1);
    expect(stack().depth).toBe(1);

    await kit.navigate("/form");

    const revived = container.querySelector<HTMLInputElement>(
      '[data-testid="form-input"]'
    )!;
    expect(revived).toBe(input);
    expect(revived.value).toBe("typed");
  });

  it("keepAlive 가 아니면 다시 올 때 새로 마운트한다", async () => {
    const { container } = renderLayout();

    await kit.navigate("/form");
    const input = container.querySelector('[data-testid="form-input"]');
    await kit.traverse(-1);
    await kit.navigate("/form");

    expect(container.querySelector('[data-testid="form-input"]')).not.toBe(
      input
    );
  });

  it("루트에서 back 하면 onBackAtRoot 를 부르고 history 는 건드리지 않는다", () => {
    const go = vi.spyOn(window.history, "go").mockImplementation(() => {});
    const onBackAtRoot = vi.fn();
    renderLayout({ onBackAtRoot });

    expect(stack().back()).toBe(false);
    expect(onBackAtRoot).toHaveBeenCalledTimes(1);
    expect(go).not.toHaveBeenCalled();
  });

  it("새로고침 뒤 스택 바닥보다 뒤로 가면 pop 방향으로 새 바닥을 그린다", async () => {
    kit.start("/detail/2", 5);
    kit.entries[4] = "/detail/1";
    const { container } = renderLayout({ duration: 300 });

    await kit.traverse(-1);

    const entering = pageOf(container, "detail-1");
    expect(entering?.getAttribute("data-state")).toBe("enter");
    expect(entering?.getAttribute("data-direction")).toBe("pop");
    expect(pageOf(container, "detail-2")?.getAttribute("data-state")).toBe(
      "exit"
    );
  });

  it("스택 CSS 를 루트 안 <style> 로 한 번만 그린다", () => {
    const { container } = renderLayout();

    expect(
      container.querySelectorAll(".wvk-root > style[data-webviewkit]")
    ).toHaveLength(1);
  });
});

describe("toPageComponents", () => {
  it("glob 경로를 route id 로 바꾼다", () => {
    const components = toPageComponents({
      "./+page.svelte": { default: Home },
      "/src/routes/(app)/detail/[id]/+page.svelte": Detail,
      "./+layout.svelte": { default: Form },
    });

    expect([...components.keys()]).toEqual(["/", "/(app)/detail/[id]"]);
  });
});
