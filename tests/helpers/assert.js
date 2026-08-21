const state = { passed: 0, failed: 0, failures: [] };
const running = [];

function test(name, fn) {
  try {
    fn();
    state.passed += 1;
    console.log("  PASS " + name);
  } catch (error) {
    state.failed += 1;
    state.failures.push({ name, error });
    console.log("  FAIL " + name + " — " + error.message);
  }
}

function testAsync(name, fn) {
  const promise = (async () => {
    try {
      await fn();
      state.passed += 1;
      console.log("  PASS " + name);
    } catch (error) {
      state.failed += 1;
      state.failures.push({ name, error });
      console.log("  FAIL " + name + " — " + error.message);
    }
  })();
  running.push(promise);
  return promise;
}

async function flush() {
  await Promise.all(running);
  running.length = 0;
}

function section(name) {
  console.log("\n" + name);
}

function summary() {
  console.log("\n" + state.passed + " passed, " + state.failed + " failed");
  if (state.failed > 0) {
    process.exitCode = 1;
  }
}

module.exports = { test, testAsync, flush, section, summary };
