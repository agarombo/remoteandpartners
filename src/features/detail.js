import { LANG } from "../content.js";
import { byId, show } from "../core/dom.js";
import { detailHTML } from "./detail-view.js";

export function createFeature(app) {
  const element = byId("detail");
  let kind = "wall",
    key;
  function render() {
    const next = LANG + ":" + kind;
    if (next !== key) {
      element.innerHTML = detailHTML(kind);
      key = next;
    }
    show(element, true, "on");
  }
  return {
    open(value) {
      kind = value === "auto" ? "auto" : "wall";
      render();
      app.sound.pick(1);
    },
    render,
    close() {
      show(element, false, "on");
      app.sound.back();
    },
  };
}
