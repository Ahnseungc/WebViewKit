import React from "react";
import ReactDOM from "react-dom/client";

import StackRouterProvider from "../../core/src/stack-router/stack-router-provider";
import Home from "./home";
import About from "./about";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <div style={{ width: "100%", height: "100vh" }}>
      <StackRouterProvider
        maxWidth="600px"
        Activities={[
          {
            path: "/",
            element: <Home />,
          },
          { path: "/about", element: <About /> },
        ]}
        initialActivity={{ path: "/", element: <Home /> }}
      />
    </div>
  </React.StrictMode>
);
