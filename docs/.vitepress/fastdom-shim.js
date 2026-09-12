/**
 * ESM port of fastdom@1.0.12 for VitePress.
 * Upstream is UMD/CJS; mermaid.core default-imports it and Vite serves it without a default export.
 */
const raf = globalThis.requestAnimationFrame?.bind(globalThis) || ((cb) => setTimeout(cb, 16));

function FastDom() {
  this.reads = [];
  this.writes = [];
  this.raf = raf;
}

function scheduleFlush(fastdom) {
  if (!fastdom.scheduled) {
    fastdom.scheduled = true;
    fastdom.raf(() => flush(fastdom));
  }
}

function flush(fastdom) {
  const writes = fastdom.writes;
  const reads = fastdom.reads;
  let error;

  try {
    fastdom.runTasks(reads);
    fastdom.runTasks(writes);
  } catch (e) {
    error = e;
  }

  fastdom.scheduled = false;
  if (reads.length || writes.length) scheduleFlush(fastdom);
  if (error) {
    if (fastdom.catch) fastdom.catch(error);
    else throw error;
  }
}

function remove(array, item) {
  const index = array.indexOf(item);
  return !!~index && !!array.splice(index, 1);
}

function mixin(target, source) {
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) target[key] = source[key];
  }
}

FastDom.prototype = {
  constructor: FastDom,
  runTasks(tasks) {
    let task;
    while ((task = tasks.shift())) task();
  },
  measure(fn, ctx) {
    const task = !ctx ? fn : fn.bind(ctx);
    this.reads.push(task);
    scheduleFlush(this);
    return task;
  },
  mutate(fn, ctx) {
    const task = !ctx ? fn : fn.bind(ctx);
    this.writes.push(task);
    scheduleFlush(this);
    return task;
  },
  clear(task) {
    return remove(this.reads, task) || remove(this.writes, task);
  },
  extend(props) {
    if (typeof props != 'object') throw new Error('expected object');
    const child = Object.create(this);
    mixin(child, props);
    child.fastdom = this;
    if (child.initialize) child.initialize();
    return child;
  },
  catch: null,
};

const fastdom = globalThis.fastdom || new FastDom();
globalThis.fastdom = fastdom;

export default fastdom;
