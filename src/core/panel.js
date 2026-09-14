import { LANG } from "../content.js";

export function createPanel(panel, dismiss) {
  let gesture = null,
    suppressClick = false;
  const interactive =
    'a,button,input,textarea,select,label,[role="button"],[contenteditable]';

  function cancel() {
    const pointerId = gesture?.pointerId;
    gesture = null;
    panel.classList.remove("dragging");
    panel.style.removeProperty("--panel-drag-y");
    if (pointerId !== undefined && panel.hasPointerCapture(pointerId))
      panel.releasePointerCapture(pointerId);
  }
  function start(event, point, pointerId) {
    suppressClick = false;
    const handle = event.target.closest(".panel-handle");
    if (
      window.innerWidth > 820 ||
      !panel.classList.contains("open") ||
      (!handle && (panel.scrollTop > 0 || event.target.closest(interactive)))
    )
      return;
    const height = panel.offsetHeight;
    gesture = {
      x: point.clientX,
      y: point.clientY,
      started: performance.now(),
      distance: 0,
      threshold: Math.min(100, height * 0.2),
      offset: Math.max(0, panel.getBoundingClientRect().top - (innerHeight - height)),
      pointerId,
    };
  }
  function move(event, point) {
    if (!gesture) return;
    const dx = point.clientX - gesture.x,
      dy = point.clientY - gesture.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 8 && !gesture.dragging) return;
    suppressClick = true;
    if (!gesture.dragging && (dy <= 0 || Math.abs(dx) > dy)) {
      cancel();
      return;
    }
    if (!event.cancelable) {
      cancel();
      return;
    }
    event.preventDefault();
    gesture.dragging = true;
    gesture.distance = Math.max(0, dy);
    panel.classList.add("dragging");
    panel.style.setProperty(
      "--panel-drag-y",
      `${gesture.offset + gesture.distance}px`,
    );
  }
  function end() {
    if (!gesture) return;
    const { dragging, distance, threshold, started } = gesture;
    const close =
      dragging &&
      (distance >= threshold ||
        (distance > 28 && distance / Math.max(1, performance.now() - started) > 0.5));
    cancel();
    if (close) dismiss();
  }

  panel.addEventListener("click", (event) => {
    if (suppressClick && event.detail !== 0) {
      suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
    } else if (
      event.target.closest(".panel-handle") &&
      window.innerWidth <= 820 &&
      panel.classList.contains("open")
    ) {
      event.preventDefault();
      event.stopPropagation();
      dismiss();
    }
  }, true);
  panel.addEventListener("pointerdown", (event) => {
    suppressClick = false;
    if (event.pointerType === "touch" || event.button !== 0 || !event.isPrimary)
      return;
    if (!event.target.closest(".panel-handle")) return;
    start(event, event, event.pointerId);
    if (gesture) panel.setPointerCapture(event.pointerId);
  });
  panel.addEventListener("pointermove", (event) => {
    if (gesture?.pointerId === event.pointerId) move(event, event);
  });
  panel.addEventListener("pointerup", (event) => {
    if (gesture?.pointerId === event.pointerId) end();
  });
  // Touch has implicit pointer capture; its release precedes touchend.
  // Only cancel a gesture owned by these pointer handlers here.
  function cancelPointer(event) {
    if (gesture?.pointerId === event.pointerId) cancel();
  }
  panel.addEventListener("lostpointercapture", cancelPointer);
  panel.addEventListener("pointercancel", cancelPointer);
  panel.addEventListener("touchstart", (event) => {
    cancel();
    if (event.touches.length === 1) start(event, event.touches[0]);
  }, { passive: true });
  panel.addEventListener("touchmove", (event) => {
    if (event.touches.length === 1) move(event, event.touches[0]);
    else cancel();
  }, { passive: false });
  panel.addEventListener("touchend", end);
  panel.addEventListener("touchcancel", cancel);

  return {
    cancel,
    render(html) {
      cancel();
      panel.innerHTML = html;
      const handle = document.createElement("button");
      handle.type = "button";
      handle.className = "panel-handle";
      handle.setAttribute("aria-label", LANG === "en" ? "Close panel" : "Cerrar panel");
      panel.prepend(handle);
    },
  };
}
