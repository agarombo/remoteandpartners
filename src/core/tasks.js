// A feature owns its delayed work. Leaving it invalidates every callback,
// including callbacks already queued by the browser and pending module loads.
export function createTasks(host = window) {
  const pending = new Set();
  let generation = 0;
  return {
    after(delay, callback) {
      const version = generation;
      const id = host.setTimeout(
        () => {
          pending.delete(id);
          if (version === generation) callback();
        },
        Math.max(0, delay),
      );
      pending.add(id);
      return id;
    },
    reset() {
      generation++;
      for (const id of pending) host.clearTimeout(id);
      pending.clear();
    },
  };
}
