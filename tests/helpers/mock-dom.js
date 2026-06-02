class ClassList {
  constructor(element) {
    this.element = element;
  }

  add(...tokens) {
    const classes = new Set(this._tokens());
    tokens.filter(Boolean).forEach((token) => classes.add(String(token)));
    this.element.className = Array.from(classes).join(" ");
  }

  remove(...tokens) {
    const removeSet = new Set(tokens.map(String));
    this.element.className = this._tokens().filter((token) => !removeSet.has(token)).join(" ");
  }

  toggle(token, force) {
    const hasToken = this.contains(token);
    const shouldHave = force === undefined ? !hasToken : Boolean(force);
    if (shouldHave) {
      this.add(token);
    } else {
      this.remove(token);
    }
    return shouldHave;
  }

  contains(token) {
    return this._tokens().includes(String(token));
  }

  _tokens() {
    return String(this.element.className || "").split(/\s+/).filter(Boolean);
  }
}

class MockElement {
  constructor(tagName) {
    this.tagName = String(tagName || "").toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.attributes = new Map();
    this.style = {};
    this.eventListeners = new Map();
    this.className = "";
    this.textContent = "";
    this.value = "";
    this.disabled = false;
    this.title = "";
    this.type = "";
    this.min = "";
    this.max = "";
    this.step = "";
    this.inputMode = "";
    this.tabIndex = 0;
    this.classList = new ClassList(this);
  }

  get firstChild() {
    return this.children.length > 0 ? this.children[0] : null;
  }

  appendChild(child) {
    if (child.parentNode) {
      child.parentNode.removeChild(child);
    }
    this.children.push(child);
    child.parentNode = this;
    return child;
  }

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index < 0) {
      throw new Error("child is not attached");
    }
    this.children.splice(index, 1);
    child.parentNode = null;
    return child;
  }

  setAttribute(name, value) {
    this.attributes.set(String(name), String(value));
  }

  getAttribute(name) {
    return this.attributes.has(String(name)) ? this.attributes.get(String(name)) : null;
  }

  removeAttribute(name) {
    this.attributes.delete(String(name));
  }

  addEventListener(type, listener) {
    const key = String(type);
    const listeners = this.eventListeners.get(key) || [];
    listeners.push(listener);
    this.eventListeners.set(key, listeners);
  }

  dispatchEvent(event) {
    const listeners = this.eventListeners.get(String(event && event.type)) || [];
    event.target = event.target || this;
    for (const listener of listeners) {
      listener(event);
    }
    return true;
  }

  focus() {}

  select() {}

  querySelector(selector) {
    return findFirstDescendant(this, selector);
  }

  querySelectorAll(selector) {
    const matches = [];
    collectDescendants(this, selector, matches);
    return matches;
  }
}

class MockDocument {
  constructor() {
    this.body = new MockElement("body");
  }

  createElement(tagName) {
    return new MockElement(tagName);
  }

  querySelector(selector) {
    return this.body.querySelector(selector);
  }

  querySelectorAll(selector) {
    return this.body.querySelectorAll(selector);
  }
}

class MockEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.bubbles = Boolean(options.bubbles);
    this.defaultPrevented = false;
    this.target = null;
    this.key = options.key || "";
    this.altKey = Boolean(options.altKey);
    this.ctrlKey = Boolean(options.ctrlKey);
    this.shiftKey = Boolean(options.shiftKey);
  }

  preventDefault() {
    this.defaultPrevented = true;
  }
}

function findFirstDescendant(root, selector) {
  for (const child of root.children) {
    if (matchesSelector(child, selector)) {
      return child;
    }
    const nested = findFirstDescendant(child, selector);
    if (nested) {
      return nested;
    }
  }
  return null;
}

function collectDescendants(root, selector, matches) {
  for (const child of root.children) {
    if (matchesSelector(child, selector)) {
      matches.push(child);
    }
    collectDescendants(child, selector, matches);
  }
}

function matchesSelector(element, selector) {
  if (!selector) {
    return false;
  }
  if (selector.startsWith(".")) {
    return element.classList.contains(selector.slice(1));
  }
  return element.tagName.toLowerCase() === selector.toLowerCase();
}

function textOf(element) {
  if (!element) {
    return "";
  }
  if (element.children.length > 0) {
    return element.children.map(textOf).join("");
  }
  return String(element.textContent || "");
}

function hasClass(element, className) {
  return Boolean(element && element.classList.contains(className));
}

module.exports = {
  MockDocument,
  MockElement,
  MockEvent,
  hasClass,
  textOf,
};
