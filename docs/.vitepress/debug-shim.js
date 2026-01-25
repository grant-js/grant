// ESM shim for debug module
// This re-exports the original debug module with a proper default export

import debug from 'debug';

// Re-export the debug function as both default and named export
export const createDebugger = debug;
export default debug;
