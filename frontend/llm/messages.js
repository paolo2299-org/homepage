export function clearContent(element) {
  if (!element) return;
  element.replaceChildren();
}

export function setMessage(element, className, text, doc = document) {
  if (!element) return;

  const span = doc.createElement('span');
  span.className = className;
  span.textContent = text;
  element.replaceChildren(span);
}
