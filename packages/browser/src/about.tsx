import { useStackRouter } from "../../core/src/stack-router/stack-router-provider";

import BackRouter from "../../core/src/stack-router/_components/back-router";

const About = () => {
  const { back } = useStackRouter();

  return (
    <div>
      <BackRouter />
      <h1>About</h1>
      <button onClick={() => back()}>back to Home</button>
    </div>
  );
};

export default About;
