import { parseArgs } from './cli.js';
import { inspectConfig } from './project.js';

export async function runScenario(argv) {
  const { path } = parseArgs(argv);
  const report = await inspectConfig(path);
  // Print only after everything succeeded, so failures never write to stdout.
  console.log(JSON.stringify(report));
}