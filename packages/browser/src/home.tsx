import { useStackRouter } from "../../core/src/stack-router/stack-router-provider";
import Header from "../../core/src/stack-router/_components/header";

const Home = () => {
  const { push } = useStackRouter();

  return (
    <div>
      {/* <Header /> */}
      <h1>Home</h1>
      <button onClick={() => push("/about", { title: "About" })}>
        Go to About
      </button>
    </div>
  );
};

export default Home;
