# P01 decisions

## Decision 1: PORT from the environment wins over the file
- **Policy:** If `env.PORT` is present, the program uses it and ignores the `port` in the file. If it is absent, the file's `port` is used.
- **Alternative rejected:** The file always wins and `PORT` is ignored.
- **Reason:** The same config file can be used in different places, and the person running the program often needs a different port. With this policy they set `PORT` without editing a committed file.
- **Consequence to check:** The file says `port: 3000`. Running with `PORT=4000` prints `port: 4000`.
- **Verification:**
  - Test: "Environment override" and "CLI: PORT overrides the file".
  - Manual (PowerShell): `$env:PORT = "4000"; node src/run.js inspect fixtures/config.json; Remove-Item Env:PORT`
  - Observed: `{"appName":"inspector","port":4000,"runtimeMajor":24}`, exit 0.
- **Side effect:** When `PORT` is present, the file's own `port` is not checked, because it is not used.

## Decision 2: Check the PORT text before converting it to a number
- **Policy:** `PORT` must match `/^\d+$/` (digits only), then it is converted with `Number()`, then it must be between 1 and 65535. An empty `PORT` is invalid, not "absent".
- **Alternative rejected:** Convert first with `parseInt` or `Number` and check the result.
- **Reason:** Environment values are always strings. `parseInt("3000abc")` gives `3000`, so a wrong value would be accepted silently. `Number("abc")` gives `NaN`, which fails comparisons in confusing ways. Checking the text first rejects bad values clearly, and an empty value is treated as a mistake rather than quietly ignored.
- **Consequence to check:** `PORT=abc`, `3000abc`, `0`, `99999`, `-1` and an empty string are all rejected with exit 1.
- **Verification:**
  - Test: "Bad port" and "CLI: bad PORT exits 1 with nothing on stdout".
  - Manual: `$env:PORT = "abc"; node src/run.js inspect fixtures/config.json`
  - Observed: `PORT must be an integer from 1 to 65535, got "abc"`, exit 1.

## Decision 3: Classified errors with a `kind` field
- **Policy:** `inspectConfig` rejects with a `ConfigError` whose `kind` is `missing`, `unreadable`, `invalid-json` or `invalid-field`. Reading and parsing use separate `try/catch` blocks.
- **Alternative rejected:** One generic `Error` for every problem, or one shared `try/catch` around reading and parsing.
- **Reason:** A missing file, a broken file and a bad value need different fixes. Separate blocks let the message say which one happened. The `kind` lets tests check the cause without matching message wording.
- **Consequence to check:** A missing file and a malformed file show different messages but both exit with code 1.
- **Verification:**
  - Test: "Missing file", "Malformed JSON" and "CLI: missing and malformed differ in message, share exit code 1".
  - Manual: `node src/run.js inspect fixtures/missing.json` prints `Configuration file not found: fixtures/missing.json`; `node src/run.js inspect fixtures/bad.json` prints `Invalid JSON in fixtures/bad.json`. Both give exit 1.

## Decision 4: Reproducible installs with a committed lock file and `npm ci`
- **Policy:** `package-lock.json` is committed. Teammates install with `npm ci`, not `npm install`.
- **Alternative rejected:** Everyone runs `npm install`.
- **Reason:** `npm ci` installs exactly what the lock file records, starts from a clean `node_modules`, and fails if `package.json` and the lock disagree. Everyone gets the same result, and a mismatch is noticed immediately.
- **Consequence to check:** Add a dependency to `package.json` by hand without updating the lock, then run `npm ci`. It fails and reports that the lock is out of sync.
- **Verification:** `docs/setup-record.md` shows `npm ci`, `npm start -- inspect fixtures/config.json` and `npm test` giving the same results on two machines.

## Decision 5: Only the `inspect` command, no demo or server mode
- **Policy:** The CLI supports one command: `inspect <config-path>`. Any other command is a usage error with exit 1.
- **Alternative rejected:** Add a `demo` or `serve` mode.
- **Reason:** The specification documents only `inspect`. Extra modes would need their own tests and would go beyond the focused deliverable.
- **Verification:** Test "CLI: usage errors exit 1" (no arguments, and `inspect` with no path).