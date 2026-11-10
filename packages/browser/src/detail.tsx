import {
  StackHeader,
  useActivity,
  useParams,
  useStackRouter,
} from "@ahnseungchan/webviewkit";

import { href } from "./base";

const Detail = () => {
  const { id } = useParams<{ id: string }>();
  const { query } = useActivity();
  const { push, popTo, reset, depth } = useStackRouter();
  const nextId = Number(id) + 1;

  return (
    <>
      <StackHeader title={`Detail ${id}`} />
      <main className="page">
        <h2>Detail {id}</h2>
        <p className="lead">
          tab: {query.tab ?? "-"} · depth: {depth}
        </p>
        <div className="card">
          <button
            className="row"
            onClick={() => push(href(`/detail/${nextId}`))}
          >
            Next ({nextId})
          </button>
          <button className="row" onClick={() => popTo(href("/"))}>
            Pop to Home
          </button>
          <button className="row" onClick={() => reset(href("/"))}>
            Reset
          </button>
        </div>
        <p className="hint">
          keepAlive: type here, go back, open this page again. The text is still
          there.
        </p>
        <div className="card">
          <input
            className="field"
            placeholder="Type something"
            aria-label="keepAlive test input"
          />
        </div>
        <div className="card">
          {Array.from({ length: 30 }, (_, i) => (
            <div key={i} className="row">
              Row {i + 1}
            </div>
          ))}
        </div>
      </main>
    </>
  );
};

export default Detail;
