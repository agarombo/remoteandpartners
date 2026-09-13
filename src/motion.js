// Same easing at 60 Hz, 120 Hz, or after a missed frame.
export function approach(current, target, elapsed) {
  if (Math.abs(target - current) < 0.01) return target;
  return (
    current + (target - current) * (1 - Math.pow(0.93, elapsed / (1000 / 60)))
  );
}

// Own exactly one animation request. Inactive views and hidden documents sleep.
export function createFrameLoop(render, host = window) {
  let pending = null;
  let previous = null;
  let stopped = false;
  const request = () => {
    if (stopped || pending !== null || host.document.hidden) return;
    pending = host.requestAnimationFrame(tick);
  };
  function tick(now) {
    pending = null;
    const elapsed =
      previous === null ? 1000 / 60 : Math.min(100, now - previous);
    previous = now;
    if (render(now, elapsed)) request();
    else previous = null;
  }
  function visibility() {
    if (pending !== null) host.cancelAnimationFrame(pending);
    pending = null;
    previous = null;
    host.document.documentElement.classList.toggle(
      "app-hidden",
      host.document.hidden,
    );
    request();
  }
  host.document.addEventListener("visibilitychange", visibility);
  return {
    request,
    stop() {
      stopped = true;
      if (pending !== null) host.cancelAnimationFrame(pending);
      pending = null;
      host.document.removeEventListener("visibilitychange", visibility);
    },
  };
}
