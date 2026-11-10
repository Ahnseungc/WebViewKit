import { StackHeader, useStackRouter } from "@ahnseungchan/webviewkit";

import { href } from "./base";

const About = () => {
  const { back, push } = useStackRouter();

  return (
    <>
      <StackHeader title="About" />
      <main className="page">
        <h2>About</h2>
        <p className="lead">
          Every push adds a history entry, so browser and hardware back work
          too.
        </p>
        <div className="card">
          <button className="row" onClick={() => push(href("/detail/99"))}>
            Detail 99
          </button>
          <button className="row" onClick={() => back()}>
            Back
          </button>
        </div>
      </main>
    </>
  );
};

export default About;
