import { StackHeader, useStackRouter } from "@ahnseungchan/webviewkit";

import { href } from "./base";

const Home = () => {
  const { push, resetPush } = useStackRouter();

  return (
    <>
      <StackHeader title="webview-kit" />
      <main className="page">
        <h2>webview-kit</h2>
        <p className="lead">
          Native-like stack navigation for React in WebViews. Tap a row, then
          swipe or press back.
        </p>
        <div className="card">
          {[1, 2, 3].map((id) => (
            <button
              key={id}
              className="row"
              onClick={() => push(href(`/detail/${id}?tab=info`), { id })}
            >
              Detail {id}
            </button>
          ))}
          <button className="row" onClick={() => push(href("/about"))}>
            About
          </button>
        </div>
        <p className="hint">
          resetPush clears the stack and pushes one page on top of the root.
        </p>
        <div className="card">
          <button className="row" onClick={() => resetPush(href("/detail/1"))}>
            Reset + Detail 1
          </button>
        </div>
        <a className="github" href="https://github.com/Ahnseungc/webview-kit">
          GitHub · npm i @ahnseungchan/webviewkit
        </a>
      </main>
    </>
  );
};

export default Home;
