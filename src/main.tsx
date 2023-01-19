import React, { useCallback, useState, useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
import { MyClass } from "./1.worker";
import { myObj } from "./2.worker";
import useComlink, {
  createComlink,
  createComlinkSingleton,
  Comlink,
} from "react-use-comlink";

const useMyClass = createComlink<typeof MyClass>(
  () => new Worker(new URL("./1.worker.ts", import.meta.url))
);

type MainProps = {
  startAt: number;
  myclass: Comlink<typeof MyClass>;
};

const Main: React.FC<MainProps> = ({ startAt, myclass }) => {
  const [counter, setCounter] = useState(0);
  const [unmounted, setUnmounted] = useState(false);
  const [result, setResult] = useState("");

  const instance = useMemo(() => {
    console.log(myclass);
    const res = new myclass.proxy(0);
    console.log(`memo: ${res}`);
    console.log(res);
    return res;
  }, [myclass]);

  const cb = useCallback(async () => {
    console.log("Getting instance");
    console.log(instance);
    const use = await instance;
    console.log("have it ");
    await use.increment(1);
    setCounter(await use.counter);
  }, [instance, setCounter]);

  const fcb = useCallback(async () => {
    const use = await instance;
    const res = await use.fetcher("http://localhost:3000");
    console.log(res);
    setResult(res);
  }, [instance, setCounter]);

  const toggleUnmount = useCallback(() => {
    setUnmounted((state) => !state);
  }, [setUnmounted]);

  return (
    <div>
      <p>Counter: {counter}</p>
      <p>Results: {result}</p>
      <button onClick={cb}>Increase from Comlink</button>
      <button onClick={fcb}>Fetch from Comlink</button>
      <hr />
      {unmounted ? null : <Sub />}
      <hr />
      <button onClick={toggleUnmount}>
        {unmounted ? "Mount Sub" : "Unmount Sub"}
      </button>
    </div>
  );
};

/**
 * initialize a hook from your worker class.
 * it doesn't actually import MyClass from worker.js, but only the defitions
 * when you're using Typescript! So your code is still strongly typed
 *
 * This is important for performance so the `new Worker()` isn't eagerly
 * evaluated on every render, like it happens with
 *
 *    useComlink(new Worker('./worker.js')) // created every render
 *
 * best to be
 *
 *    const myWorker = new Worker('./worker') // outside
 *
 *    const App = () => {
 *      useComlink(myWorker)
 *    }
 */
const useObj = createComlinkSingleton<typeof myObj>(
  new Worker(new URL("./2.worker.ts", import.meta.url))
);

const Sub: React.FunctionComponent = () => {
  const [state, setState] = useState({ globalcount: 0, localcount: 0 });
  const directly = useComlink<typeof myObj>(() => {
    return new Worker(new URL("./2.worker.ts", import.meta.url));
  });

  const globalObj = useObj();

  const incCounts = async () => {
    const localcount = await directly.proxy.inc();

    setState((prevState) => {
      return { ...prevState, localcount };
    });
  };

  useEffect(() => {
    incCounts();
  }, [directly, setState]);

  useEffect(() => {
    (async () => {
      const globalcount = await globalObj.proxy.inc();

      setState((prevState) => {
        return { ...prevState, globalcount };
      });
    })();
  }, [globalObj, setState]);

  const cb = useCallback(() => {
    incCounts();
  }, [directly]);

  return (
    <div>
      <button onClick={cb}>Increase local</button>
      <p>Global worker instance count: {state.globalcount}</p>
      <p>Local worker instance count: {state.localcount}</p>
    </div>
  );
};

export const MainApp: React.FunctionComponent = () => {
  // Doing this here allows my worker communication to
  // work in the development server.
  const myclass = useMyClass();

  return (
    <React.StrictMode>
      <React.Suspense fallback={<p>Loading</p>}>
        <Main startAt={Date.now()} myclass={myclass} />
      </React.Suspense>
    </React.StrictMode>
  );
};

//ReactDOM.render(<App />, document.getElementById("root"));
