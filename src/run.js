import { runScenario } from './scenario.js';
import { UsageError } from './cli.js';
import { ConfigError } from './project.js';

try {
  await runScenario(process.argv.slice(2));
} catch (error) {
  if (error instanceof UsageError || error instanceof ConfigError) {
    console.error(error.message);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
}
