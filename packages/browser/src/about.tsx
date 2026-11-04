import { useStackRouter } from "@ahnseungchan/webviewkit";

const About = () => {
  const { back, push } = useStackRouter();

  return (
    <main style={{ padding: 16 }}>
      <h2>About</h2>
      <button onClick={() => push("/detail/99")}>Detail 99</button>
      <button onClick={() => back()}>Back</button>
    </main>
  );
};

export default About;
