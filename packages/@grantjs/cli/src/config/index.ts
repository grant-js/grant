// Commands import config *types* straight from ../types/config.js, so this barrel
// re-exports functions only. It is not part of the published surface either way --
// @grantjs/cli's exports map declares only ".", whose built d.ts is `export {}`.
export {
  DEFAULT_PROFILE_NAME,
  getConfigPath,
  listProfileNames,
  loadConfigFile,
  loadProfile,
  saveConfigFile,
} from './storage.js';
