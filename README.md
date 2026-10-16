# Node Runtime and Package Lab

A small command-line tool that inspects a JSON configuration file, reports the
Node.js runtime, and exits predictably when its inputs are wrong.

Given a config file, it checks that `appName` is a nonempty string and `port` is an
integer from 1 to 65535, applies an optional `PORT` environment override, and prints
a JSON report. Any problem produces one short message on stderr and exit code 1.

## Requirements

- Node.js 24.15 or newer, below 25 (`node --version`)
- npm (installed with Node.js)
- Git

No external packages are used.

## Important: run every command from the project root

The project root is the folder that contains `package.json`. File paths such as
`fixtures/config.json` are relative to your current folder.

    cd path\to\P01-NodeRuntime
    ls package.json        # PowerShell: should list the file (macOS/Linux: ls package.json)

## Setup

    git clone <repository-url>
    cd <project-folder>
    node --version
    npm ci

Use `npm ci` (not `npm install`) so everyone gets the exact versions recorded in
`package-lock.json`. It deletes any existing `node_modules` and fails if
`package.json` and the lock file disagree.

## Run

The documented command is `inspect <config-path>`. The `--` after `npm start` is
required: it passes the rest to the script instead of to npm.

    npm start -- inspect fixtures/config.json

Output (exit code 0):

    {"appName":"inspector","port":3000,"runtimeMajor":24}

### Environment override

`PORT`, when set, wins over the port in the file. It must be an integer from
1 to 65535.

PowerShell:

    $env:PORT = "4000"
    npm start -- inspect fixtures/config.json
    Remove-Item Env:PORT

macOS / Linux:

    PORT=4000 npm start -- inspect fixtures/config.json

Output: `{"appName":"inspector","port":4000,"runtimeMajor":24}`

### Check the exit code

PowerShell: `echo $LASTEXITCODE`   macOS / Linux: `echo $?`

## Test

    npm test

A complete run ends with `fail 0`, `skipped 0` and `todo 0`.

## Configuration file

    {"appName":"inspector","port":3000}

| Field | Rule |
|---|---|
| `appName` | nonempty string (spaces only is rejected) |
| `port` | integer from 1 to 65535 (strings and decimals are rejected) |

## Exit codes and messages

| Situation | stdout | stderr | Exit |
|---|---|---|---|
| Valid config | JSON report | empty | 0 |
| File does not exist | empty | `Configuration file not found: <path>` | 1 |
| File cannot be read (permissions, directory) | empty | `Cannot read configuration file: <path> (<code>)` | 1 |
| File is not valid JSON | empty | `Invalid JSON in <path>` | 1 |
| JSON is not an object | empty | `Configuration must be a JSON object` | 1 |
| Bad `appName` | empty | `appName must be a nonempty string` | 1 |
| Bad port in file | empty | `port in config must be an integer from 1 to 65535` | 1 |
| Bad `PORT` environment value | empty | `PORT must be an integer from 1 to 65535, got "<value>"` | 1 |
| Missing or unknown command | empty | usage message | 1 |

## Project structure

    package.json            scripts, ES module setting, Node version range
    package-lock.json       exact dependency record (committed)
    src/run.js              entry point: prints errors, sets the exit code
    src/scenario.js         connects argument parsing to the inspector
    src/cli.js              parses the command line (no file access)
    src/project.js          inspectConfig(path, env): read, parse, validate
    fixtures/config.json    valid example configuration
    fixtures/bad.json       deliberately invalid JSON, used by tests
    test/                   automated tests (node:test)
    docs/decisions.md       design decisions and how to verify them
    docs/setup-record.md    the same commands run on two machines

## Troubleshooting

| Symptom | Check |
|---|---|
| `Cannot use import statement` | `"type": "module"` in `package.json`; imports end in `.js`; Node is 24.x |
| `Configuration file not found` for a file that exists | You are not in the project root |
| `npm ci` reports the lock is out of sync | `package.json` changed without regenerating the lock: `npm install --package-lock-only` |
| Wrong Node version | Install Node 24.15 or newer, below 25 |
| `PORT` seems stuck | PowerShell keeps it for the session: `Remove-Item Env:PORT` |

## What is not in the repository

`node_modules/`, `.env`, `secrets/`, `data/` and private keys are ignored by Git.
Fixtures contain only synthetic data.