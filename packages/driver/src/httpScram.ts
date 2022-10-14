import {ProtocolError} from "./errors";
import {
  decodeB64,
  encodeB64,
  utf8Decoder,
  utf8Encoder
} from "./primitives/buffer";
import {
  bufferEquals,
  buildClientFinalMessage,
  buildClientFirstMessage,
  generateNonce,
  parseServerFinalMessage,
  parseServerFirstMessage
} from "./scram";

const AUTH_ENDPOINT = "/auth/token";

function utf8ToB64(str: string): string {
  return encodeB64(utf8Encoder.encode(str));
}

function b64ToUtf8(str: string): string {
  return utf8Decoder.decode(decodeB64(str));
}

export async function HTTPSCRAMAuth(
  baseUrl: string,
  username: string,
  password: string
): Promise<string> {
  const authUrl = baseUrl + AUTH_ENDPOINT;
  const clientNonce = await generateNonce();
  const [clientFirst, clientFirstBare] = buildClientFirstMessage(
    clientNonce,
    username
  );

  const serverFirstRes = await fetch(authUrl, {
    headers: {
      Authorization: `SCRAM-SHA-256 data=${utf8ToB64(clientFirst)}`
    }
  });
  if (serverFirstRes.status === 403) {
    console.log(serverFirstRes);
    throw new Error(`Server doesn't support HTTP SCRAM authentication`);
  }
  const firstAttrs = parseHeaders(serverFirstRes.headers, "WWW-Authenticate");
  if (firstAttrs.size === 0) {
    throw new Error("Invalid credentials");
  }
  if (!firstAttrs.has("sid") || !firstAttrs.has("data")) {
    throw new ProtocolError(
      `server response doesn't contain '${
        !firstAttrs.has("sid") ? "sid" : "data"
      }' attribute`
    );
  }
  const sid = firstAttrs.get("sid")!;
  const serverFirst = b64ToUtf8(firstAttrs.get("data")!);

  const [serverNonce, salt, iterCount] = parseServerFirstMessage(serverFirst);

  const [clientFinal, expectedServerSig] = await buildClientFinalMessage(
    password,
    salt,
    iterCount,
    clientFirstBare,
    serverFirst,
    serverNonce
  );

  const serverFinalRes = await fetch(authUrl, {
    headers: {
      Authorization: `SCRAM-SHA-256 sid=${sid}, data=${utf8ToB64(clientFinal)}`
    }
  });
  if (!serverFinalRes.ok) {
    throw new Error("Invalid credentials");
  }
  const finalAttrs = parseHeaders(
    serverFinalRes.headers,
    "Authentication-Info",
    false
  );
  if (!firstAttrs.has("sid") || !firstAttrs.has("data")) {
    throw new ProtocolError(
      `server response doesn't contain '${
        !firstAttrs.has("sid") ? "sid" : "data"
      }' attribute`
    );
  }
  if (finalAttrs.get("sid") !== sid) {
    throw new ProtocolError("SCRAM session id does not match");
  }
  const serverFinal = b64ToUtf8(finalAttrs.get("data")!);

  const serverSig = parseServerFinalMessage(serverFinal);

  if (!bufferEquals(serverSig, expectedServerSig)) {
    throw new ProtocolError("server SCRAM proof does not match");
  }

  const authToken = await serverFinalRes.text();

  return authToken;
}

function parseHeaders(headers: Headers, headerName: string, checkAlgo = true) {
  const header = headers.get(headerName);
  if (!header) {
    throw new ProtocolError(`response doesn't contain '${headerName}' header`);
  }
  let rawAttrs: string;
  if (checkAlgo) {
    const [algo, ..._rawAttrs] = header.split(" ");
    if (algo !== "SCRAM-SHA-256") {
      throw new ProtocolError(`invalid scram algo '${algo}'`);
    }
    rawAttrs = _rawAttrs.join(" ");
  } else {
    rawAttrs = header;
  }
  return new Map(
    rawAttrs
      ? rawAttrs.split(",").map(attr => {
          const [key, val] = attr.split("=", 2);
          return [key.trim(), val.trim()];
        })
      : []
  );
}
