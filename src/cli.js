// Parses argv only. No printing and no file access, so it is safe to import.
export class UsageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UsageError';
  }
}

export function parseArgs(argv) {
  const [command, path] = argv;
  if (command !== 'inspect') {
    throw new UsageError(
      `Unknown command: ${command ?? '(none)'}. Usage: inspect <config-path>`
    );
  }
  if (!path) {
    throw new UsageError('Missing config path. Usage: inspect <config-path>');
  }
  return { command, path };
}