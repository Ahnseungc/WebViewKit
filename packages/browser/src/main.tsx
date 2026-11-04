import { StackRouterProvider } from "@ahnseungchan/webviewkit";
import React from "react";
import ReactDOM from "react-dom/client";

import About from "./about";
import Detail from "./detail";
import Home from "./home";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <StackRouterProvider
      maxWidth="600px"
      enableDevTools
      isShowHeader
      Activities={[
        { path: "/", element: <Home /> },
        { path: "/about", element: <About /> },
        { path: "/detail/:id", element: <Detail /> },
      ]}
      initialActivity={{ path: "/", element: <Home /> }}
      onBackAtRoot={() => console.info("[demo] back at root")}
    />
  </React.StrictMode>
);
