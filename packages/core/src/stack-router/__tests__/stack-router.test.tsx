import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import StackRouter from "../stack-router-provider";
import { history } from "../../history";

// Mock components for testing
const MockPage1 = () => <div data-testid="page1">Page 1</div>;
const MockPage2 = () => <div data-testid="page2">Page 2</div>;
const MockPage3 = () => <div data-testid="page3">Page 3</div>;

const mockActivities = [
  { path: "/page1", element: <MockPage1 /> },
  { path: "/page2", element: <MockPage2 /> },
  { path: "/page3", element: <MockPage3 /> },
];

// Helper function to wait for animations
const waitForAnimation = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 700)); // 애니메이션 시간과 동일하게 설정
  });
};

describe("StackRouter", () => {
  beforeEach(() => {
    // Reset history before each test
    history.push("/page1");
  });

  it("renders initial page correctly", () => {
    render(
      <StackRouter
        initialActivity={{ path: "/page1", element: <MockPage1 /> }}
        Activities={mockActivities}
      />
    );

    expect(screen.getByTestId("page1")).toBeInTheDocument();
  });

  it("navigates to new page when push is called", async () => {
    const { rerender } = render(
      <StackRouter
        initialActivity={{ path: "/page1", element: <MockPage1 /> }}
        Activities={mockActivities}
      />
    );

    // Mock history.push
    history.push("/page2");

    // Wait for animation
    await waitForAnimation();

    rerender(
      <StackRouter
        initialActivity={{ path: "/page1", element: <MockPage1 /> }}
        Activities={mockActivities}
      />
    );

    // 페이지가 렌더링될 때까지 대기
    await screen.findByTestId("page2");
    expect(screen.getByTestId("page2")).toBeInTheDocument();
  });

  it("goes back when back is called", async () => {
    const { rerender } = render(
      <StackRouter
        initialActivity={{ path: "/page1", element: <MockPage1 /> }}
        Activities={mockActivities}
      />
    );

    // First push to page2
    history.push("/page2");
    await waitForAnimation();

    // Then go back
    history.back();
    await waitForAnimation();

    rerender(
      <StackRouter
        initialActivity={{ path: "/page1", element: <MockPage1 /> }}
        Activities={mockActivities}
      />
    );

    // 페이지가 렌더링될 때까지 대기
    await screen.findByTestId("page1");
    expect(screen.getByTestId("page1")).toBeInTheDocument();
  });

  it("handles multiple page transitions correctly", async () => {
    const { rerender } = render(
      <StackRouter
        initialActivity={{ path: "/page1", element: <MockPage1 /> }}
        Activities={mockActivities}
      />
    );

    // Navigate through pages
    history.push("/page2");
    await waitForAnimation();

    history.push("/page3");
    await waitForAnimation();

    rerender(
      <StackRouter
        initialActivity={{ path: "/page1", element: <MockPage1 /> }}
        Activities={mockActivities}
      />
    );

    // 페이지가 렌더링될 때까지 대기
    await screen.findByTestId("page3");
    expect(screen.getByTestId("page3")).toBeInTheDocument();

    // Go back twice
    history.back();
    await waitForAnimation();

    history.back();
    await waitForAnimation();

    rerender(
      <StackRouter
        initialActivity={{ path: "/page1", element: <MockPage1 /> }}
        Activities={mockActivities}
      />
    );

    // 페이지가 렌더링될 때까지 대기
    await screen.findByTestId("page1");
    expect(screen.getByTestId("page1")).toBeInTheDocument();
  });

  it("maintains correct page order in stack", async () => {
    const { rerender } = render(
      <StackRouter
        initialActivity={{ path: "/page1", element: <MockPage1 /> }}
        Activities={mockActivities}
      />
    );

    // Navigate to page2
    history.push("/page2");
    await waitForAnimation();

    // Navigate to page3
    history.push("/page3");
    await waitForAnimation();

    rerender(
      <StackRouter
        initialActivity={{ path: "/page1", element: <MockPage1 /> }}
        Activities={mockActivities}
      />
    );

    // 모든 페이지가 렌더링될 때까지 대기
    await screen.findByTestId("page3");

    // Check if all pages are in the correct order
    const pages = screen.getAllByTestId(/page[1-3]/);
    expect(pages[0]).toHaveTextContent("Page 1");
    expect(pages[1]).toHaveTextContent("Page 2");
    expect(pages[2]).toHaveTextContent("Page 3");
  });

  it("handles maxWidth prop correctly", () => {
    const { container } = render(
      <StackRouter
        initialActivity={{ path: "/page1", element: <MockPage1 /> }}
        Activities={mockActivities}
        maxWidth="800px"
      />
    );

    const layout = container.querySelector('div[style*="max-width: 800px"]');
    expect(layout).toBeInTheDocument();
  });
});
