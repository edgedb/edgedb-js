// tslint:disable:no-console
// import e from "./generated/example";

function func(this: any) {
  console.log(this.asdf);
}
const arg: any = {
  asdf: 42,
};
arg.func = func.bind(arg);

arg.func();
const f = arg.func;
f();
export {};
