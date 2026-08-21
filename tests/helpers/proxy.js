const path = require("path");
const { makeRequest, makeResponse } = require("./vercel-mock");

const handler = require(path.join(__dirname, "..", "..", "api", "submit.js"));

const originalFetch = global.fetch;

async function submit(payload, { method = "POST", rawBody = null, mode = "success" } = {}) {
  let forwarded = null;
  let calls = 0;

  global.fetch = async (url, init) => {
    calls += 1;
    forwarded = init ? JSON.parse(init.body) : null;

    if (mode === "http-error") {
      return { ok: false, status: 500 };
    }

    if (mode === "invalid-response") {
      return { ok: true, text: async () => "<html>not json</html>" };
    }

    if (mode === "backend-error") {
      return { ok: true, text: async () => JSON.stringify({ status: "error", message: "Backend rejected the request" }) };
    }

    if (mode === "unreachable") {
      throw new Error("connection refused");
    }

    return { ok: true, text: async () => JSON.stringify({ status: "success" }) };
  };

  try {
    const req = makeRequest({ method, body: rawBody !== null ? rawBody : JSON.stringify(payload) });
    const res = makeResponse();
    await handler(req, res);
    return { res, forwarded, calls };
  } finally {
    global.fetch = originalFetch;
  }
}

module.exports = { submit };
