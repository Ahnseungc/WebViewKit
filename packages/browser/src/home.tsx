import { useStackRouter } from "@ahnseungchan/webviewkit";

const Home = () => {
  const { push, resetPush } = useStackRouter();

  return (
    <main style={{ padding: 16 }}>
      <h2>Home</h2>
      <button onClick={() => push("/about")}>Go to About</button>
      <ul>
        {[1, 2, 3].map((id) => (
          <li key={id}>
            <button onClick={() => push(`/detail/${id}?tab=info`, { id })}>
              Detail {id}
            </button>
          </li>
        ))}
      </ul>
      <button onClick={() => resetPush("/detail/1")}>Reset + Detail 1</button>
    </main>
  );
};

export default Home;
