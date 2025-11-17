// ESM shim for debug module
// This provides a minimal implementation that satisfies the debug import

export function formatArgs(args) {
  return args;
}

export function save(namespaces) {
  // No-op in browser
}

export function load() {
  // No-op in browser
  return '';
}

export function useColors() {
  return false;
}

export function createDebugger(namespace) {
  // Return a no-op debug function
  const debug = () => {};
  debug.enabled = false;
  debug.namespace = namespace;
  return debug;
}

// Default export
export default createDebugger;
