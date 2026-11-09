import { useActivity, useParams, useStackRouter } from "@ahnseungchan/webviewkit";

const Detail = () => {
  const { id } = useParams<{ id: string }>();
  const { query } = useActivity();
  const { push, popTo, reset, depth } = useStackRouter();
  const nextId = Number(id) + 1;

  return (
    <main style={{ padding: 16 }}>
      <h2>Detail {id}</h2>
      <p>
        tab: {query.tab ?? "-"} · depth: {depth}
      </p>
      <button onClick={() => push(`/detail/${nextId}`)}>Next ({nextId})</button>
      <button onClick={() => popTo("/")}>Pop to Home</button>
      <button onClick={() => reset("/")}>Reset</button>
      <div>
        <input placeholder="keepAlive 확인용 입력" aria-label="keepAlive 확인용 입력" />
      </div>
      <ul>
        {Array.from({ length: 50 }, (_, i) => (
          <li key={i}>Row {i + 1}</li>
        ))}
      </ul>
    </main>
  );
};

export default Detail;
