import { fork, type ChildProcess } from "node:child_process";
import path from "node:path";
import readline from "node:readline";

class Deferred<T> {
  promise: Promise<T>;
  resolve!: (t: T) => void;
  reject!: (reason?: any) => void;

  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}

export class TSServer {
  _exitPromise: Promise<number | null>;
  _pendingResponses: number;
  _isClosed: boolean;
  _server: ChildProcess;
  _seq: number;
  deferred: Deferred<unknown> | null = null;

  constructor(tsserverPath: string) {
    const logfile = path.join(__dirname, "log.txt");
    const server = fork(
      tsserverPath,
      ["--logVerbosity", "verbose", "--logFile", logfile],
      {
        cwd: path.join(__dirname, "..", "project-fixture"),
        stdio: ["pipe", "pipe", "pipe", "ipc"],
      }
    );
    this._exitPromise = new Promise((resolve, reject) => {
      server.on("exit", (code) => resolve(code));
      server.on("error", (reason) => reject(reason));
    });

    if (!server.stdout || !server.stderr) {
      throw new Error("Could not initialize server process");
    }

    server.stdout.setEncoding("utf-8");

    readline
      .createInterface({
        input: server.stderr,
      })
      .on("line", (line) => console.warn(line));

    readline
      .createInterface({
        input: server.stdout,
      })
      .on("line", (line) => {
        if (line[0] !== "{") {
          return;
        }
        try {
          const result = JSON.parse(line);
          if (result.type === "response") {
            --this._pendingResponses;
            this.deferred?.resolve(result);

            if (this._pendingResponses <= 0 && this._isClosed) {
              this._shutdown();
            }
          }
        } catch (e) {
          // noop
        }
      });

    this._isClosed = false;
    this._server = server;
    this._seq = 0;
    this._pendingResponses = 0;
  }

  send(command: Record<string, unknown>, responseExpected: boolean = false) {
    if (this._isClosed) {
      throw new Error("server is closed");
    }
    if (responseExpected) {
      ++this._pendingResponses;
    }
    const seq = ++this._seq;
    const deferred = new Deferred();
    this.deferred = deferred;
    const req =
      JSON.stringify(Object.assign({ seq, type: "request" }, command)) + "\n";
    if (!this._server.stdin) {
      throw new Error(
        "Could not write to server process due to process not having a stdin interface at runtime"
      );
    }
    this._server.stdin.write(req);

    return deferred.promise;
  }

  sendCommand(name: string, args: Record<string, unknown>) {
    this.send({ command: name, arguments: args }, true);
  }

  async requestCommand(name: string, args: Record<string, unknown>) {
    return this.send({ command: name, arguments: args }, true);
  }

  close() {
    if (!this._isClosed) {
      this._isClosed = true;
      if (this._pendingResponses <= 0) {
        this._shutdown();
      }
    }
    return this._exitPromise;
  }

  _shutdown() {
    if (!this._server.stdin) {
      throw new Error(
        "Shutdown command issued when server process did not have a stdin interface"
      );
    }
    this._server.stdin.end();
    this._server.kill();
  }
}

export function createServer(tsserverPath: string) {
  return new TSServer(tsserverPath);
}
