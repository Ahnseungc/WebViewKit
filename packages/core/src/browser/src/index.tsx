import { useStackRouter } from "../../stack-router/stack-router-provider";

const WebViewKitBrowser = () => {
  const { currentPath, currentState, push, replace, back, forward } =
    useStackRouter();

  return (
    <div style={{ padding: "20px" }}>
      <h1>WebViewKit Browser Test</h1>

      <div style={{ marginBottom: "20px" }}>
        <h2>Current State</h2>
        <pre>{JSON.stringify({ currentPath, currentState }, null, 2)}</pre>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h2>Navigation</h2>
        <button onClick={() => push("/home", { title: "Home" })}>
          Go to Home
        </button>
        <button onClick={() => push("/about", { title: "About" })}>
          Go to About
        </button>
        <button onClick={() => push("/contact", { title: "Contact" })}>
          Go to Contact
        </button>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h2>History Controls</h2>
        <button onClick={back}>Back</button>
        <button onClick={forward}>Forward</button>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h2>Replace Current Page</h2>
        <button
          onClick={() => replace("/replaced", { title: "Replaced Page" })}
        >
          Replace Current Page
        </button>
      </div>
    </div>
  );
};

export default WebViewKitBrowser;
