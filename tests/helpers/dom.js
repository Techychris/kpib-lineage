'use strict';

/**
 * Lightweight, zero-dependency DOM, Browser API, and D3 v7 harness
 * tailored to exercise index.html, table.html, tree.html, kpib.js, and icons.js.
 */

class ClassList {
  constructor(el) {
    this._el = el;
    this._set = new Set();
  }
  _syncFromAttr(val) {
    this._set = new Set(String(val || '').trim().split(/\s+/).filter(Boolean));
  }
  _syncToAttr() {
    const str = [...this._set].join(' ');
    if (str) this._el._attrs.set('class', str);
    else this._el._attrs.delete('class');
  }
  add(...names) {
    for (const n of names) if (n) this._set.add(n);
    this._syncToAttr();
  }
  remove(...names) {
    for (const n of names) this._set.delete(n);
    this._syncToAttr();
  }
  contains(name) {
    return this._set.has(name);
  }
  toggle(name, force) {
    const add = force === undefined ? !this._set.has(name) : Boolean(force);
    if (add) this._set.add(name);
    else this._set.delete(name);
    this._syncToAttr();
    return add;
  }
}

class StyleMap {
  constructor() {
    this._props = new Map();
  }
  setProperty(name, value) {
    this._props.set(name, String(value));
  }
  getPropertyValue(name) {
    return this._props.get(name) ?? '';
  }
}

class EventObj {
  constructor(type, init = {}) {
    this.type = type;
    this.key = init.key ?? '';
    this.button = init.button ?? 0;
    this.target = init.target ?? null;
    this.currentTarget = null;
    this.defaultPrevented = Boolean(init.defaultPrevented);
    this.bubbles = init.bubbles ?? true;
    this._stopped = false;
  }
  preventDefault() {
    this.defaultPrevented = true;
  }
  stopPropagation() {
    this._stopped = true;
  }
}

function parseSimpleSelector(sel) {
  sel = sel.trim();
  const parts = [];
  // Match combinators: '>', ' '
  const tokens = sel.replace(/\s*>\s*/g, ' > ').split(/\s+/).filter(Boolean);
  for (const t of tokens) parts.push(t);
  return parts;
}

function matchesSingle(el, simple) {
  if (!el || el.nodeType !== 1) return false;
  let rest = simple;
  // Tag
  const tagMatch = rest.match(/^[a-zA-Z0-9_-]+/);
  if (tagMatch) {
    if (el.tagName.toLowerCase() !== tagMatch[0].toLowerCase()) return false;
    rest = rest.slice(tagMatch[0].length);
  }
  while (rest.length) {
    if (rest.startsWith('*')) {
      rest = rest.slice(1);
    } else if (rest.startsWith('#')) {
      const m = rest.match(/^#([a-zA-Z0-9_-]+)/);
      if (!m || el.id !== m[1]) return false;
      rest = rest.slice(m[0].length);
    } else if (rest.startsWith('.')) {
      const m = rest.match(/^\.([a-zA-Z0-9_-]+)/);
      if (!m || !el.classList.contains(m[1])) return false;
      rest = rest.slice(m[0].length);
    } else if (rest.startsWith('[')) {
      const m = rest.match(/^\[([a-zA-Z0-9_-]+)(?:(\^?=)"?([^"\]]*)"?)?\]/);
      if (!m) return false;
      const [, attr, op, val] = m;
      const actual = el.getAttribute(attr);
      if (op === '=') {
        if (actual !== val) return false;
      } else if (op === '^=') {
        if (actual === null || !actual.startsWith(val)) return false;
      } else {
        if (actual === null) return false;
      }
      rest = rest.slice(m[0].length);
    } else {
      return false;
    }
  }
  return true;
}

function matchesSelector(el, selector) {
  for (const group of selector.split(',')) {
    const parts = parseSimpleSelector(group);
    if (!parts.length) continue;
    let idx = parts.length - 1;
    if (!matchesSingle(el, parts[idx])) continue;
    idx--;
    let cur = el.parentNode;
    let ok = true;
    while (idx >= 0) {
      if (parts[idx] === '>') {
        idx--;
        if (!cur || !matchesSingle(cur, parts[idx])) {
          ok = false;
          break;
        }
        cur = cur.parentNode;
        idx--;
      } else {
        while (cur && !matchesSingle(cur, parts[idx])) cur = cur.parentNode;
        if (!cur) {
          ok = false;
          break;
        }
        cur = cur.parentNode;
        idx--;
      }
    }
    if (ok) return true;
  }
  return false;
}

class Node {
  constructor(nodeType) {
    this.nodeType = nodeType;
    this.parentNode = null;
    this.childNodes = [];
    this._listeners = new Map();
  }
  get children() {
    return this.childNodes.filter(n => n.nodeType === 1);
  }
  get firstChild() {
    return this.childNodes[0] ?? null;
  }
  appendChild(node) {
    if (node.nodeType === 11) {
      const items = [...node.childNodes];
      for (const item of items) this.appendChild(item);
      return node;
    }
    if (node.parentNode) node.parentNode.removeChild(node);
    node.parentNode = this;
    this.childNodes.push(node);
    return node;
  }
  insertBefore(node, ref) {
    if (!ref) return this.appendChild(node);
    if (node.parentNode) node.parentNode.removeChild(node);
    const idx = this.childNodes.indexOf(ref);
    if (idx < 0) return this.appendChild(node);
    node.parentNode = this;
    this.childNodes.splice(idx, 0, node);
    return node;
  }
  removeChild(node) {
    const idx = this.childNodes.indexOf(node);
    if (idx >= 0) {
      this.childNodes.splice(idx, 1);
      node.parentNode = null;
    }
    return node;
  }
  remove() {
    if (this.parentNode) this.parentNode.removeChild(this);
  }
  append(...items) {
    for (const item of items) {
      if (typeof item === 'string' || typeof item === 'number') {
        this.appendChild(new TextNode(String(item)));
      } else if (item) {
        this.appendChild(item);
      }
    }
  }
  replaceChildren(...items) {
    for (const c of [...this.childNodes]) c.parentNode = null;
    this.childNodes = [];
    this.append(...items);
  }
  contains(target) {
    let cur = target;
    while (cur) {
      if (cur === this) return true;
      cur = cur.parentNode;
    }
    return false;
  }
  addEventListener(type, fn) {
    if (!this._listeners.has(type)) this._listeners.set(type, []);
    this._listeners.get(type).push(fn);
  }
  removeEventListener(type, fn) {
    const list = this._listeners.get(type);
    if (!list) return;
    const i = list.indexOf(fn);
    if (i >= 0) list.splice(i, 1);
  }
  dispatchEvent(event) {
    if (!(event instanceof EventObj)) {
      event = new EventObj(event.type, event);
    }
    if (!event.target) event.target = this;
    let cur = this;
    while (cur) {
      event.currentTarget = cur;
      const list = cur._listeners.get(event.type);
      if (list) {
        for (const fn of [...list]) fn.call(cur, event);
      }
      if (!event.bubbles || event._stopped) break;
      cur = cur.parentNode;
    }
    return !event.defaultPrevented;
  }
}

class TextNode extends Node {
  constructor(text) {
    super(3);
    this.data = text;
  }
  get textContent() {
    return this.data;
  }
  set textContent(v) {
    this.data = String(v);
  }
}

class DocumentFragment extends Node {
  constructor() {
    super(11);
  }
}

class Element extends Node {
  constructor(tagName, ownerDocument) {
    super(1);
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this._attrs = new Map();
    this.classList = new ClassList(this);
    this.style = new StyleMap();
    this.hidden = false;
    this.open = false;
    this.checked = false;
    this.scrollTop = 0;
    this.clientWidth = 1024;
    this.clientHeight = 768;
    this.offsetHeight = 72;
    this._value = '';
    this._innerHTML = '';
    this._focused = false;
    this._scrolledIntoView = null;
    this._modalOpen = false;
    this.dataset = new Proxy({}, {
      get: (_, prop) => {
        const attr = 'data-' + String(prop).replace(/[A-Z]/g, m => '-' + m.toLowerCase());
        return this._attrs.get(attr);
      },
      set: (_, prop, value) => {
        const attr = 'data-' + String(prop).replace(/[A-Z]/g, m => '-' + m.toLowerCase());
        this._attrs.set(attr, String(value));
        return true;
      },
    });
  }
  get id() {
    return this._attrs.get('id') ?? '';
  }
  set id(v) {
    this._attrs.set('id', String(v));
  }
  get className() {
    return this._attrs.get('class') ?? '';
  }
  set className(v) {
    this._attrs.set('class', String(v));
    this.classList._syncFromAttr(v);
  }
  get href() {
    return this._attrs.get('href') ?? '';
  }
  set href(v) {
    this._attrs.set('href', String(v));
  }
  get title() {
    return this._attrs.get('title') ?? '';
  }
  set title(v) {
    this._attrs.set('title', String(v));
  }
  get type() {
    return this._attrs.get('type') ?? '';
  }
  set type(v) {
    this._attrs.set('type', String(v));
  }
  get value() {
    if (this.tagName === 'SELECT') {
      const opts = this.querySelectorAll('option');
      if (this._value !== '' && opts.some(o => o.value === this._value)) return this._value;
      const sel = opts.find(o => o.selected);
      if (sel) return sel.value;
      return opts[0]?.value ?? '';
    }
    return this._value;
  }
  set value(v) {
    const s = String(v);
    if (this.tagName === 'SELECT') {
      const opts = this.querySelectorAll('option');
      if (opts.some(o => o.value === s)) {
        this._value = s;
        for (const o of opts) o.selected = o.value === s;
      } else {
        this._value = '';
        for (const o of opts) o.selected = false;
      }
      return;
    }
    this._value = s;
  }
  get options() {
    return this.querySelectorAll('option');
  }
  add(opt) {
    this.appendChild(opt);
  }
  get textContent() {
    if (!this.childNodes.length) return this._innerHTML ? this._innerHTML.replace(/<[^>]+>/g, '') : '';
    return this.childNodes.map(c => c.textContent).join('');
  }
  set textContent(v) {
    this._innerHTML = '';
    const s = String(v ?? '');
    for (const c of [...this.childNodes]) c.parentNode = null;
    this.childNodes = s ? [new TextNode(s)] : [];
  }
  get innerHTML() {
    return this._innerHTML || this.textContent;
  }
  set innerHTML(v) {
    this.childNodes = [];
    this._innerHTML = String(v ?? '');
  }
  insertAdjacentHTML(position, html) {
    if (position === 'afterbegin') {
      this._innerHTML = String(html) + this._innerHTML;
    } else {
      this._innerHTML += String(html);
    }
  }
  setAttribute(name, value) {
    const val = String(value);
    this._attrs.set(name, val);
    if (name === 'class') this.classList._syncFromAttr(val);
    if (name === 'hidden') this.hidden = true;
  }
  getAttribute(name) {
    return this._attrs.has(name) ? this._attrs.get(name) : null;
  }
  removeAttribute(name) {
    this._attrs.delete(name);
    if (name === 'class') this.classList._syncFromAttr('');
    if (name === 'hidden') this.hidden = false;
  }
  matches(selector) {
    return matchesSelector(this, selector);
  }
  closest(selector) {
    let cur = this;
    while (cur && cur.nodeType === 1) {
      if (cur.matches(selector)) return cur;
      cur = cur.parentNode;
    }
    return null;
  }
  querySelectorAll(selector) {
    const out = [];
    const walk = node => {
      for (const child of node.childNodes) {
        if (child.nodeType === 1) {
          if (matchesSelector(child, selector)) out.push(child);
          walk(child);
        }
      }
    };
    walk(this);
    return out;
  }
  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }
  insertCell() {
    const td = this.ownerDocument.createElement('td');
    this.appendChild(td);
    return td;
  }
  focus(opts) {
    this._focused = true;
    if (this.ownerDocument) this.ownerDocument.activeElement = this;
    this._lastFocusOpts = opts;
  }
  click() {
    this.dispatchEvent(new EventObj('click', { target: this }));
  }
  scrollIntoView(opts) {
    this._scrolledIntoView = opts;
  }
  requestSubmit() {
    this.dispatchEvent(new EventObj('submit', { target: this }));
  }
  showModal() {
    this._modalOpen = true;
    this.open = true;
  }
  close() {
    this._modalOpen = false;
    this.open = false;
    this.dispatchEvent(new EventObj('close', { target: this, bubbles: false }));
  }
}

class Document extends Node {
  constructor() {
    super(9);
    this.documentElement = new Element('html', this);
    this.head = new Element('head', this);
    this.body = new Element('body', this);
    this.documentElement.appendChild(this.head);
    this.documentElement.appendChild(this.body);
    this.documentElement.parentNode = this;
    this.activeElement = null;
    this.fonts = { ready: Promise.resolve() };
  }
  createElement(tag) {
    const el = new Element(tag, this);
    if (tag.toLowerCase() === 'option') {
      el.selected = false;
    }
    return el;
  }
  createDocumentFragment() {
    return new DocumentFragment();
  }
  getElementById(id) {
    return this.querySelector('#' + id);
  }
  querySelector(sel) {
    return this.documentElement.querySelector(sel);
  }
  querySelectorAll(sel) {
    return this.documentElement.querySelectorAll(sel);
  }
}

function createStorage(initial = {}, { throwOnGet = false, throwOnSet = false } = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem(k) {
      if (throwOnGet) throw new Error('storage get denied');
      return store.has(k) ? store.get(k) : null;
    },
    setItem(k, v) {
      if (throwOnSet) throw new Error('storage set denied');
      store.set(k, String(v));
    },
    removeItem(k) {
      store.delete(k);
    },
    _map: store,
  };
}

/**
 * Minimal, faithful D3 v7 harness supporting the exact APIs used by tree.html:
 * select, zoom, zoomIdentity, zoomTransform, hierarchy, tree, min, max,
 * linkVertical, linkHorizontal.
 */
function createD3Harness() {
  class ZoomTransform {
    constructor(k = 1, x = 0, y = 0) {
      this.k = k;
      this.x = x;
      this.y = y;
    }
    translate(dx, dy) {
      return new ZoomTransform(this.k, this.x + dx * this.k, this.y + dy * this.k);
    }
    scale(factor) {
      return new ZoomTransform(this.k * factor, this.x, this.y);
    }
    toString() {
      return `translate(${this.x},${this.y}) scale(${this.k})`;
    }
  }
  const zoomIdentity = new ZoomTransform(1, 0, 0);

  function wrapSelection(nodes) {
    const sel = {
      _nodes: nodes,
      append(tag) {
        const created = nodes.map(n => {
          const el = n.ownerDocument.createElement(tag);
          n.appendChild(el);
          if (n.__data__ !== undefined) el.__data__ = n.__data__;
          return el;
        });
        return wrapSelection(created);
      },
      select(selector) {
        return wrapSelection(nodes.map(n => {
          const found = n.querySelector(selector);
          if (found && n.__data__ !== undefined) found.__data__ = n.__data__;
          return found;
        }).filter(Boolean));
      },
      selectAll(selector) {
        const found = [];
        for (const n of nodes) {
          for (const el of n.querySelectorAll(selector)) found.push(el);
        }
        const s = wrapSelection(found);
        s._parents = nodes;
        return s;
      },
      data(dataArr, keyFn) {
        const parent = (this._parents && this._parents[0]) || nodes[0]?.parentNode;
        const existingByKey = new Map();
        for (const n of nodes) {
          const k = keyFn ? keyFn(n.__data__) : n.__data__;
          existingByKey.set(k, n);
        }
        const matchedKeys = new Set();
        const updateNodes = [];
        const enterData = [];
        for (const d of dataArr) {
          const k = keyFn ? keyFn(d) : d;
          matchedKeys.add(k);
          if (existingByKey.has(k)) {
            const existing = existingByKey.get(k);
            existing.__data__ = d;
            updateNodes.push(existing);
          } else {
            enterData.push(d);
          }
        }
        const exitNodes = [];
        for (const [k, n] of existingByKey.entries()) {
          if (!matchedKeys.has(k)) exitNodes.push(n);
        }
        return {
          join(enterArg) {
            for (const n of exitNodes) n.remove();
            const entered = [];
            for (const d of enterData) {
              if (typeof enterArg === 'string') {
                const el = parent.ownerDocument.createElement(enterArg);
                el.__data__ = d;
                parent.appendChild(el);
                entered.push(el);
              } else {
                const enterSel = {
                  append(tag) {
                    const el = parent.ownerDocument.createElement(tag);
                    el.__data__ = d;
                    parent.appendChild(el);
                    return wrapSelection([el]);
                  },
                };
                const res = enterArg(enterSel);
                entered.push(...res._nodes);
              }
            }
            const merged = [...updateNodes, ...entered];
            // Re-order according to dataArr
            const byKey = new Map(merged.map(n => [keyFn ? keyFn(n.__data__) : n.__data__, n]));
            const ordered = dataArr.map(d => byKey.get(keyFn ? keyFn(d) : d)).filter(Boolean);
            return wrapSelection(ordered);
          },
        };
      },
      attr(name, val) {
        for (const n of nodes) {
          const v = typeof val === 'function' ? val.call(n, n.__data__) : val;
          if (v === null || v === undefined) n.removeAttribute(name);
          else n.setAttribute(name, v);
        }
        return sel;
      },
      text(val) {
        for (const n of nodes) {
          const v = typeof val === 'function' ? val.call(n, n.__data__) : val;
          n.textContent = v ?? '';
        }
        return sel;
      },
      lower() {
        for (const n of [...nodes].reverse()) {
          const p = n.parentNode;
          if (p && p.firstChild !== n) p.insertBefore(n, p.firstChild);
        }
        return sel;
      },
      on(type, handler) {
        const eventType = type.split('.')[0];
        for (const n of nodes) {
          if (handler === null) {
            n._d3Handlers?.delete(type);
          } else {
            if (!n._d3Handlers) n._d3Handlers = new Map();
            const prev = n._d3Handlers.get(type);
            if (prev) n.removeEventListener(eventType, prev);
            const wrapped = event => handler.call(n, event, n.__data__);
            n._d3Handlers.set(type, wrapped);
            n.addEventListener(eventType, wrapped);
          }
        }
        return sel;
      },
      each(fn) {
        for (const n of nodes) fn.call(n, n.__data__);
        return sel;
      },
      call(fn, ...args) {
        fn(sel, ...args);
        return sel;
      },
    };
    return sel;
  }

  function zoom() {
    let scaleExt = [0, Infinity];
    let extFn = () => [[0, 0], [0, 0]];
    let filterFn = () => true;
    let onZoom = null;

    function applyTransform(el, next) {
      const k = Math.max(scaleExt[0], Math.min(scaleExt[1], next.k));
      const t = new ZoomTransform(k, next.x, next.y);
      el.__zoom = t;
      extFn();
      if (onZoom) onZoom({ transform: t });
    }

    function behavior(selection) {
      for (const el of selection._nodes) {
        el.__zoom = zoomIdentity;
        el.__zoomFilter = filterFn;
      }
    }
    behavior.scaleExtent = ext => { scaleExt = ext; return behavior; };
    behavior.extent = fn => { extFn = fn; return behavior; };
    behavior.filter = fn => { filterFn = fn; return behavior; };
    behavior.on = (type, fn) => { if (type === 'zoom') onZoom = fn; return behavior; };
    behavior.transform = (selection, t) => {
      for (const el of selection._nodes) applyTransform(el, t);
    };
    behavior.scaleBy = (selection, factor) => {
      for (const el of selection._nodes) {
        const cur = el.__zoom || zoomIdentity;
        applyTransform(el, cur.scale(factor));
      }
    };
    behavior.translateBy = (selection, dx, dy) => {
      for (const el of selection._nodes) {
        const cur = el.__zoom || zoomIdentity;
        applyTransform(el, cur.translate(dx, dy));
      }
    };
    return behavior;
  }

  function hierarchy(rootData, childrenFn) {
    function build(data, parent, depth) {
      const node = { data, parent, depth, children: undefined, x: 0, y: 0 };
      const rawKids = childrenFn ? childrenFn(data) : null;
      if (rawKids && rawKids.length) {
        node.children = rawKids.map(k => build(k, node, depth + 1));
      }
      return node;
    }
    const root = build(rootData, null, 0);
    root.descendants = () => {
      const out = [];
      const walk = n => {
        out.push(n);
        if (n.children) for (const c of n.children) walk(c);
      };
      walk(root);
      return out;
    };
    root.links = () => {
      const out = [];
      const walk = n => {
        if (n.children) {
          for (const c of n.children) {
            out.push({ source: n, target: c });
            walk(c);
          }
        }
      };
      walk(root);
      return out;
    };
    return root;
  }

  function tree() {
    let spacing = [1, 1];
    function layout(root) {
      let leafIdx = 0;
      const assign = n => {
        n.y = n.depth * spacing[1];
        if (!n.children || !n.children.length) {
          n.x = leafIdx * spacing[0];
          leafIdx++;
        } else {
          for (const c of n.children) assign(c);
          n.x = (n.children[0].x + n.children[n.children.length - 1].x) / 2;
        }
      };
      assign(root);
      return root;
    }
    layout.nodeSize = s => { spacing = s; return layout; };
    return layout;
  }

  function makeLink(vertical) {
    let xFn = p => p.x;
    let yFn = p => p.y;
    function gen(d) {
      const sx = xFn(d.source), sy = yFn(d.source);
      const tx = xFn(d.target), ty = yFn(d.target);
      return vertical
        ? `M${sx},${sy}C${sx},${(sy + ty) / 2} ${tx},${(sy + ty) / 2} ${tx},${ty}`
        : `M${sx},${sy}C${(sx + tx) / 2},${sy} ${(sx + tx) / 2},${ty} ${tx},${ty}`;
    }
    gen.x = fn => { xFn = fn; return gen; };
    gen.y = fn => { yFn = fn; return gen; };
    return gen;
  }

  return {
    select: el => wrapSelection([el]),
    zoom,
    zoomIdentity,
    zoomTransform: el => el.__zoom || zoomIdentity,
    hierarchy,
    tree,
    min: (arr, fn) => Math.min(...arr.map(fn)),
    max: (arr, fn) => Math.max(...arr.map(fn)),
    linkVertical: () => makeLink(true),
    linkHorizontal: () => makeLink(false),
  };
}

function createOptionClass(doc) {
  return class Option {
    constructor(text, value) {
      const el = doc.createElement('option');
      el.textContent = text;
      el._value = String(value);
      return el;
    }
  };
}

function createWindowEnv(options = {}) {
  const doc = new Document();
  const winListeners = new Map();
  const mqlList = new Map();
  const rafQueue = [];
  const timeouts = [];
  const ioInstances = [];
  const roInstances = [];

  const mediaMatches = options.mediaMatches || {};
  function matchMedia(query) {
    if (!mqlList.has(query)) {
      const listeners = [];
      const mql = {
        media: query,
        matches: Boolean(mediaMatches[query]),
        addEventListener(type, fn) {
          if (type === 'change') listeners.push(fn);
        },
        _setMatches(val) {
          mql.matches = Boolean(val);
          for (const fn of [...listeners]) fn({ matches: mql.matches });
        },
      };
      mqlList.set(query, mql);
    }
    return mqlList.get(query);
  }

  class IntersectionObserver {
    constructor(cb, opts) {
      this._cb = cb;
      this._opts = opts;
      this.observed = new Set();
      ioInstances.push(this);
    }
    observe(el) { this.observed.add(el); }
    unobserve(el) { this.observed.delete(el); }
    _trigger(entries) { this._cb(entries, this); }
  }

  class ResizeObserver {
    constructor(cb) {
      this._cb = cb;
      this.observed = new Set();
      roInstances.push(this);
    }
    observe(el) { this.observed.add(el); }
    _trigger() { this._cb([], this); }
  }

  const localStorage = createStorage(options.localStorage, options.localStorageOpts);
  const sessionStorage = createStorage(options.sessionStorage, options.sessionStorageOpts);
  const location = {
    search: options.search || '',
    pathname: options.pathname ?? '/tree.html',
    href: options.href || 'http://localhost/',
  };
  const historyCalls = [];
  const history = options.history ?? {
    replaceState(state, title, url) {
      if (options.throwOnHistory) throw new Error('history denied');
      historyCalls.push(url);
    },
  };

  const win = {
    document: doc,
    localStorage,
    sessionStorage,
    location,
    history,
    _historyCalls: historyCalls,
    scrollY: options.scrollY || 0,
    URLSearchParams,
    Intl,
    Map,
    Set,
    Array,
    Number,
    Math,
    Object,
    String,
    Boolean,
    Promise,
    JSON,
    RegExp,
    Error,
    Option: createOptionClass(doc),
    d3: createD3Harness(),
    matchMedia,
    requestAnimationFrame(cb) {
      rafQueue.push(cb);
      return rafQueue.length;
    },
    setTimeout(cb, ms) {
      timeouts.push({ cb, ms });
      return timeouts.length;
    },
    addEventListener(type, fn) {
      if (!winListeners.has(type)) winListeners.set(type, []);
      winListeners.get(type).push(fn);
    },
    dispatchEvent(event) {
      const list = winListeners.get(event.type);
      if (list) for (const fn of [...list]) fn(event);
    },
    ResizeObserver,
    _flushRaf() {
      const batch = rafQueue.splice(0, rafQueue.length);
      for (const cb of batch) cb();
    },
    _flushTimeouts() {
      const batch = timeouts.splice(0, timeouts.length);
      for (const t of batch) t.cb();
    },
    _ioInstances: ioInstances,
    _roInstances: roInstances,
    _mql: matchMedia,
  };
  if (options.hasIntersectionObserver !== false) {
    win.IntersectionObserver = IntersectionObserver;
  }
  win.window = win;
  win.globalThis = win;
  return win;
}

module.exports = {
  Element,
  Document,
  EventObj,
  createWindowEnv,
  createStorage,
  createD3Harness,
};
