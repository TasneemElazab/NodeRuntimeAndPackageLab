# Setup record

Commands run from the project root on a fresh clone:
    node --version
    npm ci
    npm start -- inspect fixtures/config.json
    npm test

## Machine A (Tasneem, windows)
- node --version: v24.19.0
- npm ci: up to date, audited 1 package, found 0 vulnerabilities
- npm start -- inspect fixtures/config.json: {"appName":"inspector","port":3000,"runtimeMajor":24}, exit code 0
- npm test: tests 21, pass 21, fail 0, skipped 0, todo 0

## Machine B (Tasneem, windows - second run after fixes)
- node --version: v24.19.0
- npm ci: up to date, audited 1 package, found 0 vulnerabilities
- npm start -- inspect fixtures/config.json: {"appName":"inspector","port":3000,"runtimeMajor":24}, exit code 0
- npm test: tests 21, pass 21, fail 0, skipped 0, todo 0

## Differences or problems
none - both runs give identical JSON report and identical test counts.
