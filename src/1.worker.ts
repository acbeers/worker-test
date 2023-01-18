import { expose } from "comlink";

console.log("worker load");

export class MyClass {
  private _counter: number;

  constructor(init: number) {
    console.log("Constructor");
    this._counter = init;
  }

  get counter() {
    return this._counter;
  }

  fetcher(url: string) {
    return fetch(url).then((resp) => resp.text());
  }

  increment(delta = 1) {
    this._counter += delta;
  }
}

expose(MyClass);
