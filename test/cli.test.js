import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, UsageError } from '../src/cli.js';

test('parses the inspect command', () => {
  assert.deepStrictEqual(parseArgs(['inspect', 'fixtures/config.json']), {
    command: 'inspect',
    path: 'fixtures/config.json',
  });
});

test('rejects no arguments', () => {
  assert.throws(() => parseArgs([]), UsageError);
});

test('rejects a missing path', () => {
  assert.throws(() => parseArgs(['inspect']), UsageError);
});

test('rejects an unknown command', () => {
  assert.throws(() => parseArgs(['frobnicate', 'x']), UsageError);
});