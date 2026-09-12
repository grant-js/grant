/**
 * ESM default export for fastdom/extensions/fastdom-promised.js.
 * The upstream file is UMD/CJS; mermaid.core imports it as `import x from '...'`.
 */
function create(promised, type, fn, ctx) {
  const tasks = promised._tasks;
  const fastdom = promised.fastdom;
  let task;

  const promise = new Promise((resolve, reject) => {
    task = fastdom[type](() => {
      tasks.delete(promise);
      try {
        resolve(ctx ? fn.call(ctx) : fn());
      } catch (e) {
        reject(e);
      }
    }, ctx);
  });

  tasks.set(promise, task);
  return promise;
}

const fastdomPromised = {
  initialize() {
    this._tasks = new Map();
  },
  mutate(fn, ctx) {
    return create(this, 'mutate', fn, ctx);
  },
  measure(fn, ctx) {
    return create(this, 'measure', fn, ctx);
  },
  clear(promise) {
    const task = this._tasks.get(promise);
    this.fastdom.clear(task);
    this._tasks.delete(promise);
  },
};

export default fastdomPromised;
