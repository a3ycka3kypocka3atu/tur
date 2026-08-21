const files = ["static", "proxy", "apps-script", "fidelity", "frontend"];
const assert = require("./helpers/assert");

(async () => {
  for (const name of files) {
    console.log("\n========== " + name + ".test.js ==========");
    require("./" + name + ".test.js");
    await assert.flush();
  }
  assert.summary();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
