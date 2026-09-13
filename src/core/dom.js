export const byId = (id) => document.getElementById(id);
export const svgElement = (tag, attributes = {}) => {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [name, value] of Object.entries(attributes))
    node.setAttribute(name, value);
  return node;
};
export function setAttribute(node, name, value) {
  value = String(value);
  if (node.getAttribute(name) !== value) node.setAttribute(name, value);
}
export function setText(node, value) {
  if (node.textContent !== value) node.textContent = value;
}
export function toggle(node, name, on) {
  if (node.classList.contains(name) !== !!on) node.classList.toggle(name, !!on);
}
export function show(node, on, className = "open") {
  toggle(node, className, on);
  setAttribute(node, "aria-hidden", !on);
  node.inert = !on;
}
export function block(rows) {
  return rows
    .map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`)
    .join("");
}
