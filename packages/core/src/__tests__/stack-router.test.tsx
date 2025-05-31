import React from "react";
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from "@testing-library/react";
import StackRouter, {
  useStackRouter,
} from "../stack-router/stack-router-provider";
import { history } from "../history";

// Test component that uses useStackRouter
const MockPushComponent = ({ path }: { path: string }) => {
  const { push } = useStackRouter();
  return (
    <button
      onClick={() => push(path)}
      data-testid={`push-to-${path.replace("/", "")}`}
    >
      Navigate to {path}
    </button>
  );
};

const MockBackComponent = ({ path }: { path: string }) => {
  const { back } = useStackRouter();
  return (
    <button onClick={back} data-testid={`back-to-${path.replace("/", "")}`}>
      Back
    </button>
  );
};

// Mock components for testing
const MockPage1 = () => (
  <div data-testid="page1">
    <MockPushComponent path="/page2" />
    Page1
  </div>
);
const MockPage2 = () => (
  <div data-testid="page2">
    <MockPushComponent path="/page3" />
    <MockBackComponent path="/page1" />
    Page2
  </div>
);
const MockPage3 = () => (
  <div data-testid="page3">
    <MockBackComponent path="/page2" />
    Page3
  </div>
);

const mockActivities = [
  { path: "/page1", element: <MockPage1 /> },
  { path: "/page2", element: <MockPage2 /> },
  { path: "/page3", element: <MockPage3 /> },
];

// Helper function to wait for animations and state updates
const waitForStateUpdate = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
  });
};

describe("StackRouter", () => {
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
    render(
      <StackRouter
        initialActivity={{ path: "/page1", element: <MockPage1 /> }}
        Activities={mockActivities}
      />
    );

    // Click the navigation button
    await act(async () => {
      fireEvent.click(screen.getByTestId("push-to-page2"));
      await waitForStateUpdate();
    });

    await waitFor(() => {
      expect(screen.getByText("Page2")).toBeInTheDocument();
    });
  });

  it("goes back when back is called", async () => {
    render(
      <StackRouter
        initialActivity={{ path: "/page1", element: <MockPage1 /> }}
        Activities={mockActivities}
      />
    );

    // First push to page2
    await act(async () => {
      fireEvent.click(screen.getByTestId("push-to-page2"));
      await waitForStateUpdate();
    });

    // Then go back
    await act(async () => {
      fireEvent.click(screen.getByTestId("back-to-page1"));
      await waitForStateUpdate();
    });

    await waitFor(() => {
      expect(screen.getByText("Page1")).toBeInTheDocument();
    });
  });

  it("handles multiple page transitions correctly", async () => {
    render(
      <StackRouter
        initialActivity={{ path: "/page1", element: <MockPage1 /> }}
        Activities={mockActivities}
      />
    );

    // Navigate through pages
    await act(async () => {
      fireEvent.click(screen.getByTestId("push-to-page2"));
      await waitForStateUpdate();
    });

    await waitFor(() => {
      expect(screen.getByText("Page2")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("push-to-page3"));
      await waitForStateUpdate();
    });

    await waitFor(() => {
      expect(screen.getByText("Page3")).toBeInTheDocument();
    });

    // Go back twice
    await act(async () => {
      fireEvent.click(screen.getByTestId("back-to-page2"));
      await waitForStateUpdate();
    });

    await waitFor(() => {
      expect(screen.getByText("Page2")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("back-to-page1"));
      await waitForStateUpdate();
    });

    await waitFor(() => {
      expect(screen.getByText("Page1")).toBeInTheDocument();
    });
  });

  it("maintains correct page order in stack", async () => {
    const { rerender } = render(
      <StackRouter
        initialActivity={{ path: "/page1", element: <MockPage1 /> }}
        Activities={mockActivities}
      />
    );

    // Navigate to page2
    await act(async () => {
      fireEvent.click(screen.getByTestId("push-to-page2"));
      await waitForStateUpdate();
    });

    await waitFor(() => {
      expect(screen.getByText("Page2")).toBeInTheDocument();
    });

    // Navigate to page3
    await act(async () => {
      fireEvent.click(screen.getByTestId("push-to-page3"));
      await waitForStateUpdate();
    });

    await waitFor(() => {
      expect(screen.getByText("Page3")).toBeInTheDocument();
    });
  });

  it("handles maxWidth prop correctly", () => {
    render(
      <StackRouter
        initialActivity={{ path: "/page1", element: <MockPage1 /> }}
        Activities={mockActivities}
        maxWidth="800px"
      />
    );

    const layout = screen.getByTestId("layout");
    expect(layout).toHaveStyle({ maxWidth: "800px" });
  });
});
