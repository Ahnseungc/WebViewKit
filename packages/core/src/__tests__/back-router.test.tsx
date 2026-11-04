import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import BackRouter from "../stack-router/_components/back-router";
import { useStackRouter } from "../stack-router/stack-router-provider";

jest.mock("../stack-router/stack-router-provider", () => ({
  useStackRouter: jest.fn(),
}));

describe("BackRouter", () => {
  const mockBack = jest.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    // Setup default mock implementation
    (useStackRouter as jest.Mock).mockReturnValue({
      back: mockBack,
    });
  });

  it("renders back button with icon", () => {
    render(<BackRouter />);

    // Check if button exists
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();

    // Check if SVG icon exists
    const svg = button.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("calls back function when clicked", () => {
    render(<BackRouter />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("applies correct styles", () => {
    render(<BackRouter />);

    const button = screen.getByRole("button");

    // Check initial styles
    expect(button).toHaveStyle({
      width: "40px",
      height: "40px",
      padding: "8px",
      borderRadius: "50%",
    });

    // Check if SVG has correct attributes
    const svg = button.querySelector("svg");
    expect(svg).toHaveAttribute("width", "32");
    expect(svg).toHaveAttribute("height", "32");
    expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
  });

  it("has an accessible label (default and custom)", () => {
    const { rerender } = render(<BackRouter />);
    expect(
      screen.getByRole("button", { name: "뒤로 가기" })
    ).toBeInTheDocument();

    rerender(<BackRouter label="Back" />);
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
  });

  it("calls back via keyboard activation", async () => {
    render(<BackRouter />);

    screen.getByRole("button").focus();
    await user.keyboard("{Enter}");

    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
