import { AddressInfo } from "node:net";
import { SMTPServer } from "smtp-server";
import { ParsedMail, simpleParser } from "mailparser";

export class MockSMTPServer {
  private server: SMTPServer;

  private mailQueue: ParsedMail[] = [];
  private mailPromiseQueue: ((mail: ParsedMail) => void)[] = [];

  constructor() {
    this.server = new SMTPServer({
      secure: false,
      authOptional: true,
      onData: async (stream, session, callback) => {
        const parsedMail = await simpleParser(stream);
        callback();

        if (this.mailPromiseQueue.length) {
          this.mailPromiseQueue.pop()!(parsedMail);
        } else {
          this.mailQueue.unshift(parsedMail);
        }
      },
    });
  }

  listen() {
    return new Promise<AddressInfo>((resolve, reject) =>
      this.server.listen(0, () => {
        const address = this.server.server.address();

        if (!address || typeof address === "string") {
          return reject(new Error("SMTP server failed to start as expected"));
        }

        resolve(address);
      })
    );
  }

  close() {
    return new Promise<void>((resolve) => this.server.close(resolve));
  }

  async getMail() {
    if (this.mailQueue.length) {
      return this.mailQueue.pop()!;
    } else {
      return new Promise<ParsedMail>((resolve) => {
        this.mailPromiseQueue.unshift(resolve);
      });
    }
  }
}
