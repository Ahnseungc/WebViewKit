"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../index");
describe("WebViewCore", () => {
    it("should be defined", () => {
        expect(index_1.WebViewCore).toBeDefined();
    });
    it("should create an instance", () => {
        const webView = new index_1.WebViewCore();
        expect(webView).toBeInstanceOf(index_1.WebViewCore);
    });
});
describe("version", () => {
    it("should be defined", () => {
        expect(index_1.version).toBeDefined();
    });
    it("should be a string", () => {
        expect(typeof index_1.version).toBe("string");
    });
});
