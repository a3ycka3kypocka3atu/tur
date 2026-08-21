function makeRequest({ method = "POST", body = "{}", headers = { "content-type": "application/json" } } = {}) {
  return { method, body, headers };
}

function makeResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

module.exports = { makeRequest, makeResponse };
