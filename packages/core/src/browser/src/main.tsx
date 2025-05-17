import React from "react";
import ReactDOM from "react-dom/client";
import WebViewKitBrowser from "./index";
import StackRouterProvider from "../../stack-router/stack-router-provider";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <StackRouterProvider>
      <WebViewKitBrowser />
    </StackRouterProvider>
  </React.StrictMode>
);
