"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebViewBridgeClient = void 0;
exports.createWebViewBridgeClient = createWebViewBridgeClient;
const transport_1 = require("./transport");
const detect_host_1 = require("./detect-host");
const protocol_1 = require("./protocol");
class WebViewBridgeClient {
    constructor(options = {}) {
        var _a, _b, _c;
        this.host = (_b = (_a = options.transport) === null || _a === void 0 ? void 0 : _a.host) !== null && _b !== void 0 ? _b : (0, detect_host_1.detectBridgeHost)();
        this.transport =
            (_c = options.transport) !== null && _c !== void 0 ? _c : (0, transport_1.createBridgeTransport)(this.host, options);
    }
    async send(envelope) {
        await this.transport.send(envelope);
    }
    async request(method, payload) {
        const envelope = (0, protocol_1.createBridgeEnvelope)(method, payload);
        await this.send(envelope);
        return envelope;
    }
    stackPush(url, meta = null) {
        return this.request(protocol_1.STACK_BRIDGE_METHODS.PUSH, {
            url,
            meta,
        });
    }
    stackReplace(url, meta = null) {
        return this.request(protocol_1.STACK_BRIDGE_METHODS.REPLACE, {
            url,
            meta,
        });
    }
    stackPop() {
        return this.request(protocol_1.STACK_BRIDGE_METHODS.POP);
    }
    stackReset(url, meta = null) {
        return this.request(protocol_1.STACK_BRIDGE_METHODS.RESET, {
            url,
            meta,
        });
    }
}
exports.WebViewBridgeClient = WebViewBridgeClient;
function createWebViewBridgeClient(options) {
    return new WebViewBridgeClient(options);
}
