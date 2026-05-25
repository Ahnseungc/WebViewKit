import {
  BRIDGE_NAMESPACE,
  BRIDGE_PROTOCOL_VERSION,
  STACK_BRIDGE_METHODS,
  createBridgeEnvelope,
  isBridgeEnvelope,
  parseBridgeMessage,
  serializeBridgeMessage,
} from "../bridge/protocol";

describe("bridge protocol", () => {
  it("creates a valid envelope", () => {
    const env = createBridgeEnvelope(STACK_BRIDGE_METHODS.PUSH, {
      url: "/about",
      meta: null,
    });
    expect(env.v).toBe(BRIDGE_PROTOCOL_VERSION);
    expect(env.ns).toBe(BRIDGE_NAMESPACE);
    expect(env.method).toBe("stack.push");
    expect(isBridgeEnvelope(env)).toBe(true);
  });

  it("round-trips serialize and parse", () => {
    const env = createBridgeEnvelope("stack.pop");
    const raw = serializeBridgeMessage(env);
    const parsed = parseBridgeMessage(raw);
    expect(parsed).toEqual(env);
  });

  it("rejects invalid payloads", () => {
    expect(parseBridgeMessage("{ not json")).toBeNull();
    expect(parseBridgeMessage({ foo: 1 })).toBeNull();
    expect(parseBridgeMessage({ v: 2, ns: BRIDGE_NAMESPACE, id: "a", method: "x" })).toBeNull();
  });
});
