import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import fsPromises, { mkdtemp, writeFile, rm, access } from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { inspectConfig, ConfigError } from '../src/project.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const fixture = (name) => join(root, 'fixtures', name);

// Run the real CLI from the project root, with PORT cleared unless a test sets it.
const { PORT: _removed, ...baseEnv } = process.env;
function runCli(args, extraEnv = {}) {
  return spawnSync(process.execPath, ['src/run.js', ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...baseEnv, ...extraEnv },
  });
}

// Creates a temp config file, runs fn(path), always cleans up.
async function withConfig(content, fn) {
  const dir = await mkdtemp(join(tmpdir(), 'p01-'));
  const path = join(dir, 'config.json');
  try {
    await writeFile(path, content);
    return await fn(path);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('Runtime is the pinned Node major', () => {
  assert.match(process.version, /^v24\./);
});

test('Valid file', async () => {
  await withConfig('{"appName":"inspector","port":3000}', async (path) => {
    assert.deepStrictEqual(await inspectConfig(path, {}), {
      appName: 'inspector',
      port: 3000,
      runtimeMajor: 24, // literal from the spec table, not recomputed
    });
  });
});

test('Environment override', async () => {
  await withConfig('{"appName":"inspector","port":3000}', async (path) => {
    const report = await inspectConfig(path, { PORT: '4000' });
    assert.equal(report.port, 4000);
  });
});

test('Malformed JSON', async () => {
  await withConfig('{', async (path) => {
    await assert.rejects(inspectConfig(path, {}), (error) => {
      assert.equal(error.kind, 'invalid-json');
      assert.match(error.message, /invalid json/i);
      return true;
    });
  });
});

test('Valid JSON that is not an object', async () => {
  for (const content of ['null', '[]', '42']) {
    await withConfig(content, async (path) => {
      await assert.rejects(inspectConfig(path, {}), { kind: 'invalid-field' });
    });
  }
});

test('Missing file', async () => {
  await assert.rejects(inspectConfig(fixture('missing.json'), {}), (error) => {
    assert.ok(error instanceof ConfigError);
    assert.equal(error.kind, 'missing');
    assert.match(error.message, /configuration file not found/i);
    return true;
  });
});

test('Bad port', async () => {
  for (const port of ['0', '65536', '3000.5', '"3000"', 'null']) {
    await withConfig(`{"appName":"inspector","port":${port}}`, async (path) => {
      await assert.rejects(inspectConfig(path, {}), { kind: 'invalid-field' });
    });
  }
  await withConfig('{"appName":"inspector","port":3000}', async (path) => {
    for (const bad of ['abc', '3000abc', '0', '99999', '-1', '']) {
      await assert.rejects(inspectConfig(path, { PORT: bad }), { kind: 'invalid-field' });
    }
  });
});

test('Bad appName', async () => {
  for (const name of ['""', '"   "', '42', 'null']) {
    await withConfig(`{"appName":${name},"port":3000}`, async (path) => {
      await assert.rejects(inspectConfig(path, {}), { kind: 'invalid-field' });
    });
  }
});

test('Rejected operation: simulated permission failure is one handled failure', async () => {
  const unhandled = [];
  const onUnhandled = (reason) => unhandled.push(reason);
  process.on('unhandledRejection', onUnhandled);

  const fake = mock.method(fsPromises, 'readFile', async () => {
    throw Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' });
  });
  syncBuiltinESMExports(); // make project.js's imported readFile see the mock

  try {
    await assert.rejects(inspectConfig(fixture('config.json'), {}), (error) => {
      assert.ok(error instanceof ConfigError);
      assert.equal(error.kind, 'unreadable');
      assert.match(error.message, /EACCES/);
      return true;
    });
    assert.equal(fake.mock.callCount(), 1);
    await new Promise((resolve) => setImmediate(resolve)); // let any stray rejection surface
    assert.deepStrictEqual(unhandled, []);
  } finally {
    mock.restoreAll();
    syncBuiltinESMExports();
    process.off('unhandledRejection', onUnhandled);
  }
});

test('Rejected operation: a directory is also unreadable', async () => {
  await assert.rejects(inspectConfig(join(root, 'fixtures'), {}), { kind: 'unreadable' });
});

test('Temp fixtures are cleaned up', async () => {
  let dir;
  await withConfig('{}', async (path) => {
    dir = dirname(path);
  });
  await assert.rejects(access(dir), { code: 'ENOENT' });
});

test('CLI: valid file prints the report and exits 0', () => {
  const result = runCli(['inspect', 'fixtures/config.json']);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.deepStrictEqual(JSON.parse(result.stdout), { appName: 'inspector', port: 3000, runtimeMajor: 24 });
});

test('CLI: PORT overrides the file', () => {
  const result = runCli(['inspect', 'fixtures/config.json'], { PORT: '4000' });
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).port, 4000);
});

test('CLI: bad PORT exits 1 with nothing on stdout', () => {
  const result = runCli(['inspect', 'fixtures/config.json'], { PORT: 'abc' });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /PORT/);
});

test('CLI: missing and malformed differ in message, share exit code 1', () => {
  const missing = runCli(['inspect', 'fixtures/missing.json']);
  const malformed = runCli(['inspect', 'fixtures/bad.json']);
  assert.equal(missing.status, 1);
  assert.equal(malformed.status, 1);
  assert.equal(missing.stdout, '');
  assert.equal(malformed.stdout, '');
  assert.match(missing.stderr, /configuration file not found/i);
  assert.match(malformed.stderr, /invalid json/i);
  assert.notEqual(missing.stderr, malformed.stderr);
});

test('CLI: unreadable path gives one short stderr line, no stack, exit 1', () => {
  const result = runCli(['inspect', 'fixtures']); // a directory
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr.trim().split('\n').length, 1);
  assert.doesNotMatch(result.stderr, /\n\s+at /);
  assert.doesNotMatch(result.stderr, /unhandled/i);
});

test('CLI: usage errors exit 1', () => {
  assert.equal(runCli([]).status, 1);
  assert.equal(runCli(['inspect']).status, 1);
});