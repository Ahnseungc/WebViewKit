import { StackRouterProvider } from "@ahnseungchan/webviewkit";
import React from "react";
import ReactDOM from "react-dom/client";

import "./demo.css";

import About from "./about";
import { href } from "./base";
import Detail from "./detail";
import Home from "./home";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <StackRouterProvider
      maxWidth="600px"
      enableDevTools
      Activities={[
        { path: href("/"), element: <Home /> },
        { path: href("/about"), element: <About /> },
        { path: href("/detail/:id"), element: <Detail />, keepAlive: true },
      ]}
      initialActivity={{ path: href("/"), element: <Home /> }}
      onBackAtRoot={() => console.info("[demo] back at root")}
    />
  </React.StrictMode>
);
