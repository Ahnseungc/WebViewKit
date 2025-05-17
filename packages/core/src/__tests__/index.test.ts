import { WebViewCore, version } from "../index";

describe("WebViewCore", () => {
  it("should be defined", () => {
    expect(WebViewCore).toBeDefined();
  });

  it("should create an instance", () => {
    const webView = new WebViewCore();
    expect(webView).toBeInstanceOf(WebViewCore);
  });
});

describe("version", () => {
  it("should be defined", () => {
    expect(version).toBeDefined();
  });

  it("should be a string", () => {
    expect(typeof version).toBe("string");
  });
});
