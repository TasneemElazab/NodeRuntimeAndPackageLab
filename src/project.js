import { readFile } from 'node:fs/promises';

export class ConfigError extends Error {
  constructor(kind, message, options) {
    super(message, options);
    this.name = 'ConfigError';
    this.kind = kind; // 'missing' | 'unreadable' | 'invalid-json' | 'invalid-field'
  }
}

function invalid(message) {
  return new ConfigError('invalid-field', message);
}

// Validates a port that came from the environment (always a string).
function portFromEnv(text) {
  if (!/^\d+$/.test(text)) {
    throw invalid(`PORT must be an integer from 1 to 65535, got "${text}"`);
  }
  const port = Number(text);
  if (port < 1 || port > 65535) {
    throw invalid(`PORT must be an integer from 1 to 65535, got "${text}"`);
  }
  return port;
}

// Validates a port that came from the JSON file (already a JSON value).
function portFromFile(value) {
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw invalid('port in config must be an integer from 1 to 65535');
  }
  return value;
}

// Return the validated report; reject with a classified error on bad input.
export async function inspectConfig(path, env = process.env) {
  // 1. Read (async). Missing and unreadable are different failures.
  let text;
  try {
    text = await readFile(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new ConfigError('missing', `Configuration file not found: ${path}`, { cause: error });
    }
    throw new ConfigError('unreadable', `Cannot read configuration file: ${path} (${error.code ?? error.message})`, { cause: error });
  }

  // 2. Parse. Separate try/catch so a bad file is not confused with a missing one.
  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new ConfigError('invalid-json', `Invalid JSON in ${path}`, { cause: error });
  }

  // 3. JSON.parse('null') and JSON.parse('[]') succeed, but are not configs.
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw invalid('Configuration must be a JSON object');
  }

  // 4. Validate appName.
  const { appName } = data;
  if (typeof appName !== 'string' || appName.trim() === '') {
    throw invalid('appName must be a nonempty string');
  }

  // 5. Choose the port source: PORT (if present) wins, otherwise the file.
  const port = env.PORT !== undefined ? portFromEnv(env.PORT) : portFromFile(data.port);

  // 6. Report.
  const runtimeMajor = Number(process.versions.node.split('.')[0]);
  return { appName: appName.trim(), port, runtimeMajor };
}