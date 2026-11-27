// Polyfills to get around the issue of in-browser translators crashing the page
// upon DOM mutations. See: https://github.com/react/react/issues/11538

let installed = false;

function childOf(parent: Node, node: Node) {
  let current: Node | null = node;

  while (current && current.parentNode !== parent) {
    current = current.parentNode;
  }

  return current;
}

export function installTranslatorGuard() {
  if (installed || typeof Node !== "function") {
    return;
  }

  installed = true;

  const removeChild = Node.prototype.removeChild;
  const insertBefore = Node.prototype.insertBefore;

  Node.prototype.removeChild = function guardedRemoveChild<T extends Node>(
    this: Node,
    child: T,
  ): T {
    if (child.parentNode === this) {
      return removeChild.call(this, child) as T;
    }

    // wrapped by the translator: remove it from the wrapper
    if (child.parentNode && this.contains(child)) {
      return removeChild.call(child.parentNode, child) as T;
    }

    // already replaced by the translator
    return child;
  };

  Node.prototype.insertBefore = function guardedInsertBefore<T extends Node>(
    this: Node,
    node: T,
    child: Node | null,
  ): T {
    if (!child || child.parentNode === this) {
      return insertBefore.call(this, node, child) as T;
    }

    // wrapped by the translator: insert before the wrapper
    const wrapper = this.contains(child) ? childOf(this, child) : null;

    if (wrapper) {
      return insertBefore.call(this, node, wrapper) as T;
    }

    // already replaced by the translator, so its position is lost: showing
    // the node out of place beats leaving it out
    return insertBefore.call(this, node, null) as T;
  };
}
