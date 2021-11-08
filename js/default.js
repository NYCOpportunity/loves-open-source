(function () {
  'use strict';

  /**
   * The Icon module
   * @class
   */
  class Icons {
    /**
     * @constructor
     * @param  {String} path The path of the icon file
     * @return {object} The class
     */
    constructor(path) {
      path = (path) ? path : Icons.path;

      fetch(path)
        .then((response) => {
          if (response.ok)
            return response.text();
        })
        .catch((error) => {
        })
        .then((data) => {
          const sprite = document.createElement('div');
          sprite.innerHTML = data;
          sprite.setAttribute('aria-hidden', true);
          sprite.setAttribute('style', 'display: none;');
          document.body.appendChild(sprite);
        });

      return this;
    }
  }

  /** @type {String} The path of the icon file */
  Icons.path = 'svg/icons.svg';

  class TonicTemplate {
    constructor (rawText, templateStrings, unsafe) {
      this.isTonicTemplate = true;
      this.unsafe = unsafe;
      this.rawText = rawText;
      this.templateStrings = templateStrings;
    }

    valueOf () { return this.rawText }
    toString () { return this.rawText }
  }

  class Tonic extends window.HTMLElement {
    constructor () {
      super();
      const state = Tonic._states[super.id];
      delete Tonic._states[super.id];
      this._state = state || {};
      this.preventRenderOnReconnect = false;
      this.props = {};
      this.elements = [...this.children];
      this.elements.__children__ = true;
      this.nodes = [...this.childNodes];
      this.nodes.__children__ = true;
      this._events();
    }

    static _createId () {
      return `tonic${Tonic._index++}`
    }

    static _splitName (s) {
      return s.match(/[A-Z][a-z0-9]*/g).join('-')
    }

    static _normalizeAttrs (o, x = {}) {
      [...o].forEach(o => (x[o.name] = o.value));
      return x
    }

    _checkId () {
      const _id = super.id;
      if (!_id) {
        const html = this.outerHTML.replace(this.innerHTML, '...');
        throw new Error(`Component: ${html} has no id`)
      }
      return _id
    }

    get state () {
      return (this._checkId(), this._state)
    }

    set state (newState) {
      this._state = (this._checkId(), newState);
    }

    get id () { return this._checkId() }

    set id (newId) { super.id = newId; }

    _events () {
      const hp = Object.getOwnPropertyNames(window.HTMLElement.prototype);
      for (const p of this._props) {
        if (hp.indexOf('on' + p) === -1) continue
        this.addEventListener(p, this);
      }
    }

    _prop (o) {
      const id = this._id;
      const p = `__${id}__${Tonic._createId()}__`;
      Tonic._data[id] = Tonic._data[id] || {};
      Tonic._data[id][p] = o;
      return p
    }

    _placehold (r) {
      const id = this._id;
      const ref = `placehold:${id}:${Tonic._createId()}__`;
      Tonic._children[id] = Tonic._children[id] || {};
      Tonic._children[id][ref] = r;
      return ref
    }

    static match (el, s) {
      if (!el.matches) el = el.parentElement;
      return el.matches(s) ? el : el.closest(s)
    }

    static getPropertyNames (proto) {
      const props = [];
      while (proto && proto !== Tonic.prototype) {
        props.push(...Object.getOwnPropertyNames(proto));
        proto = Object.getPrototypeOf(proto);
      }
      return props
    }

    static add (c, htmlName) {
      const hasValidName = htmlName || (c.name && c.name.length > 1);
      if (!hasValidName) {
        throw Error('Mangling. https://bit.ly/2TkJ6zP')
      }

      if (!htmlName) htmlName = Tonic._splitName(c.name).toLowerCase();
      if (!Tonic.ssr && window.customElements.get(htmlName)) {
        throw new Error(`Cannot Tonic.add(${c.name}, '${htmlName}') twice`)
      }

      if (!c.prototype || !c.prototype.isTonicComponent) {
        const tmp = { [c.name]: class extends Tonic {} }[c.name];
        tmp.prototype.render = c;
        c = tmp;
      }

      c.prototype._props = Tonic.getPropertyNames(c.prototype);

      Tonic._reg[htmlName] = c;
      Tonic._tags = Object.keys(Tonic._reg).join();
      window.customElements.define(htmlName, c);

      if (typeof c.stylesheet === 'function') {
        Tonic.registerStyles(c.stylesheet);
      }

      return c
    }

    static registerStyles (stylesheetFn) {
      if (Tonic._stylesheetRegistry.includes(stylesheetFn)) return
      Tonic._stylesheetRegistry.push(stylesheetFn);

      const styleNode = document.createElement('style');
      if (Tonic.nonce) styleNode.setAttribute('nonce', Tonic.nonce);
      styleNode.appendChild(document.createTextNode(stylesheetFn()));
      if (document.head) document.head.appendChild(styleNode);
    }

    static escape (s) {
      return s.replace(Tonic.ESC, c => Tonic.MAP[c])
    }

    static unsafeRawString (s, templateStrings) {
      return new TonicTemplate(s, templateStrings, true)
    }

    dispatch (eventName, detail = null) {
      const opts = { bubbles: true, detail };
      this.dispatchEvent(new window.CustomEvent(eventName, opts));
    }

    html (strings, ...values) {
      const refs = o => {
        if (o && o.__children__) return this._placehold(o)
        if (o && o.isTonicTemplate) return o.rawText
        switch (Object.prototype.toString.call(o)) {
          case '[object HTMLCollection]':
          case '[object NodeList]': return this._placehold([...o])
          case '[object Array]':
            if (o.every(x => x.isTonicTemplate && !x.unsafe)) {
              return new TonicTemplate(o.join('\n'), null, false)
            }
            return this._prop(o)
          case '[object Object]':
          case '[object Function]': return this._prop(o)
          case '[object NamedNodeMap]':
            return this._prop(Tonic._normalizeAttrs(o))
          case '[object Number]': return `${o}__float`
          case '[object String]': return Tonic.escape(o)
          case '[object Boolean]': return `${o}__boolean`
          case '[object Null]': return `${o}__null`
          case '[object HTMLElement]':
            return this._placehold([o])
        }
        if (
          typeof o === 'object' && o && o.nodeType === 1 &&
          typeof o.cloneNode === 'function'
        ) {
          return this._placehold([o])
        }
        return o
      };

      const out = [];
      for (let i = 0; i < strings.length - 1; i++) {
        out.push(strings[i], refs(values[i]));
      }
      out.push(strings[strings.length - 1]);

      const htmlStr = out.join('').replace(Tonic.SPREAD, (_, p) => {
        const o = Tonic._data[p.split('__')[1]][p];
        return Object.entries(o).map(([key, value]) => {
          const k = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
          if (value === true) return k
          else if (value) return `${k}="${Tonic.escape(String(value))}"`
          else return ''
        }).filter(Boolean).join(' ')
      });
      return new TonicTemplate(htmlStr, strings, false)
    }

    scheduleReRender (oldProps) {
      if (this.pendingReRender) return this.pendingReRender

      this.pendingReRender = new Promise(resolve => setTimeout(() => {
        if (!this.isInDocument(this.shadowRoot || this)) return
        const p = this._set(this.shadowRoot || this, this.render);
        this.pendingReRender = null;

        if (p && p.then) {
          return p.then(() => {
            this.updated && this.updated(oldProps);
            resolve();
          })
        }

        this.updated && this.updated(oldProps);
        resolve();
      }, 0));

      return this.pendingReRender
    }

    reRender (o = this.props) {
      const oldProps = { ...this.props };
      this.props = typeof o === 'function' ? o(oldProps) : o;
      return this.scheduleReRender(oldProps)
    }

    handleEvent (e) {
      this[e.type](e);
    }

    _drainIterator (target, iterator) {
      return iterator.next().then((result) => {
        this._set(target, null, result.value);
        if (result.done) return
        return this._drainIterator(target, iterator)
      })
    }

    _set (target, render, content = '') {
      for (const node of target.querySelectorAll(Tonic._tags)) {
        if (!node.isTonicComponent) continue

        const id = node.getAttribute('id');
        if (!id || !Tonic._refIds.includes(id)) continue
        Tonic._states[id] = node.state;
      }

      if (render instanceof Tonic.AsyncFunction) {
        return render.call(this).then(content => this._apply(target, content))
      } else if (render instanceof Tonic.AsyncFunctionGenerator) {
        return this._drainIterator(target, render.call(this))
      } else if (render === null) {
        this._apply(target, content);
      } else if (render instanceof Function) {
        this._apply(target, render.call(this) || '');
      }
    }

    _apply (target, content) {
      if (content && content.isTonicTemplate) {
        content = content.rawText;
      } else if (typeof content === 'string') {
        content = Tonic.escape(content);
      }

      if (typeof content === 'string') {
        if (this.stylesheet) {
          content = `<style nonce=${Tonic.nonce || ''}>${this.stylesheet()}</style>${content}`;
        }

        target.innerHTML = content;

        if (this.styles) {
          const styles = this.styles();
          for (const node of target.querySelectorAll('[styles]')) {
            for (const s of node.getAttribute('styles').split(/\s+/)) {
              Object.assign(node.style, styles[s.trim()]);
            }
          }
        }

        const children = Tonic._children[this._id] || {};

        const walk = (node, fn) => {
          if (node.nodeType === 3) {
            const id = node.textContent.trim();
            if (children[id]) fn(node, children[id], id);
          }

          const childNodes = node.childNodes;
          if (!childNodes) return

          for (let i = 0; i < childNodes.length; i++) {
            walk(childNodes[i], fn);
          }
        };

        walk(target, (node, children, id) => {
          for (const child of children) {
            node.parentNode.insertBefore(child, node);
          }
          delete Tonic._children[this._id][id];
          node.parentNode.removeChild(node);
        });
      } else {
        target.innerHTML = '';
        target.appendChild(content.cloneNode(true));
      }
    }

    connectedCallback () {
      this.root = this.shadowRoot || this; // here for back compat

      if (super.id && !Tonic._refIds.includes(super.id)) {
        Tonic._refIds.push(super.id);
      }
      const cc = s => s.replace(/-(.)/g, (_, m) => m.toUpperCase());

      for (const { name: _name, value } of this.attributes) {
        const name = cc(_name);
        const p = this.props[name] = value;

        if (/__\w+__\w+__/.test(p)) {
          const { 1: root } = p.split('__');
          this.props[name] = Tonic._data[root][p];
        } else if (/\d+__float/.test(p)) {
          this.props[name] = parseFloat(p, 10);
        } else if (p === 'null__null') {
          this.props[name] = null;
        } else if (/\w+__boolean/.test(p)) {
          this.props[name] = p.includes('true');
        } else if (/placehold:\w+:\w+__/.test(p)) {
          const { 1: root } = p.split(':');
          this.props[name] = Tonic._children[root][p][0];
        }
      }

      this.props = Object.assign(
        this.defaults ? this.defaults() : {},
        this.props
      );

      this._id = this._id || Tonic._createId();

      this.willConnect && this.willConnect();

      if (!this.isInDocument(this.root)) return
      if (!this.preventRenderOnReconnect) {
        if (!this._source) {
          this._source = this.innerHTML;
        } else {
          this.innerHTML = this._source;
        }
        const p = this._set(this.root, this.render);
        if (p && p.then) return p.then(() => this.connected && this.connected())
      }

      this.connected && this.connected();
    }

    isInDocument (target) {
      const root = target.getRootNode();
      return root === document || root.toString() === '[object ShadowRoot]'
    }

    disconnectedCallback () {
      this.disconnected && this.disconnected();
      delete Tonic._data[this._id];
      delete Tonic._children[this._id];
    }
  }

  Tonic.prototype.isTonicComponent = true;

  Object.assign(Tonic, {
    _tags: '',
    _refIds: [],
    _data: {},
    _states: {},
    _children: {},
    _reg: {},
    _stylesheetRegistry: [],
    _index: 0,
    version: typeof require !== 'undefined' ? require('./package').version : null,
    SPREAD: /\.\.\.\s?(__\w+__\w+__)/g,
    ESC: /["&'<>`/]/g,
    AsyncFunctionGenerator: async function * () {}.constructor,
    AsyncFunction: async function () {}.constructor,
    MAP: { '"': '&quot;', '&': '&amp;', '\'': '&#x27;', '<': '&lt;', '>': '&gt;', '`': '&#x60;', '/': '&#x2F;' }
  });

  class NycoRepoArchive extends Tonic {
    /**
     * Gets data from a local JSON data path
     *
     * @param   {String}  path  The name of the file without extension
     *
     * @return  {Object}        JSON object of the response
     */
    async get(path) {
      try {
        const response = await fetch(`data/${path}.json`, {
          method: 'GET',
          mode: 'same-origin',
          // cache: 'force-cache'
        });

        return await response.json();
      } catch (error) {
      }
    }

    /**
     * Main render method for the component
     *
     * @return  {String}  String representing HTML markup
     */
    async * render() {
      yield this.html`<p>Loading Repositories...</p>`;

      const repositories = await this.get('repositories');

      let list = [];

      for (let index = 0; index < repositories.length; index++) {
        const repo = repositories[index];

        list.push(this.html`
        <article class="c-card p-2 small:p-3 border-navy hover:shadow-up">
          <header class="c-card__header items-start">
            <h2 class="c-card__title mie-1">
              <small class="text-blue font-normal inline-flex items-center">
                <svg aria-hidden="true" class="icon-ui mie-1">
                  <use xlink:href="#feather-github"></use>
                </svg>${repo.organization} /
              </small> <br> ${repo.name}
            </h2>

            <mark class="badge flex items-center text-green flex-shrink-0">
              <b>${String(repo.language)}</b>
            </mark>
          </header>

          <dl class="c-card__inline-description-list">
            <dt>Language</dt>
            <dd>${String(repo.language)}</dd>

            <dt>Stars</dt>
            <dd>${String(repo.stargazers_count)}</dd>

            <dt>Forks</dt>
            <dd>${String(repo.forks)}</dd>
          </dl>

          <div>
            <p>${String(repo.description)}</p>
          </div>

          <a class="c-card__cta" href="${repo.url}" target="_blank"></a>
        </article>
      `);
      }

      return this.html(list);
    }
  }

  new Icons('svg/svgs.svg');
  new Icons('https://cdn.jsdelivr.net/gh/cityofnewyork/nyco-patterns@v2.6.13/dist/svg/icons.svg');
  new Icons('https://cdn.jsdelivr.net/gh/cityofnewyork/nyco-patterns@v2.6.13/dist/svg/feather.svg');

  Tonic.add(NycoRepoArchive);

}());
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzL0BueWNvcHBvcnR1bml0eS9wdHRybi1zY3JpcHRzL3NyYy9pY29ucy9pY29ucy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9Ab3B0b29sY28vdG9uaWMvaW5kZXguZXNtLmpzIiwiLi4vLi4vc3JjL2pzL255Y28tcmVwby1hcmNoaXZlLmpzIiwiLi4vLi4vc3JjL2pzL2RlZmF1bHQuanMiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFRoZSBJY29uIG1vZHVsZVxuICogQGNsYXNzXG4gKi9cbmNsYXNzIEljb25zIHtcbiAgLyoqXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IHBhdGggVGhlIHBhdGggb2YgdGhlIGljb24gZmlsZVxuICAgKiBAcmV0dXJuIHtvYmplY3R9IFRoZSBjbGFzc1xuICAgKi9cbiAgY29uc3RydWN0b3IocGF0aCkge1xuICAgIHBhdGggPSAocGF0aCkgPyBwYXRoIDogSWNvbnMucGF0aDtcblxuICAgIGZldGNoKHBhdGgpXG4gICAgICAudGhlbigocmVzcG9uc2UpID0+IHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLm9rKVxuICAgICAgICAgIHJldHVybiByZXNwb25zZS50ZXh0KCk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKVxuICAgICAgICAgICAgY29uc29sZS5kaXIocmVzcG9uc2UpO1xuICAgICAgfSlcbiAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpXG4gICAgICAgICAgY29uc29sZS5kaXIoZXJyb3IpO1xuICAgICAgfSlcbiAgICAgIC50aGVuKChkYXRhKSA9PiB7XG4gICAgICAgIGNvbnN0IHNwcml0ZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICBzcHJpdGUuaW5uZXJIVE1MID0gZGF0YTtcbiAgICAgICAgc3ByaXRlLnNldEF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nLCB0cnVlKTtcbiAgICAgICAgc3ByaXRlLnNldEF0dHJpYnV0ZSgnc3R5bGUnLCAnZGlzcGxheTogbm9uZTsnKTtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChzcHJpdGUpO1xuICAgICAgfSk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxufVxuXG4vKiogQHR5cGUge1N0cmluZ30gVGhlIHBhdGggb2YgdGhlIGljb24gZmlsZSAqL1xuSWNvbnMucGF0aCA9ICdzdmcvaWNvbnMuc3ZnJztcblxuZXhwb3J0IGRlZmF1bHQgSWNvbnM7XG4iLCJjbGFzcyBUb25pY1RlbXBsYXRlIHtcbiAgY29uc3RydWN0b3IgKHJhd1RleHQsIHRlbXBsYXRlU3RyaW5ncywgdW5zYWZlKSB7XG4gICAgdGhpcy5pc1RvbmljVGVtcGxhdGUgPSB0cnVlXG4gICAgdGhpcy51bnNhZmUgPSB1bnNhZmVcbiAgICB0aGlzLnJhd1RleHQgPSByYXdUZXh0XG4gICAgdGhpcy50ZW1wbGF0ZVN0cmluZ3MgPSB0ZW1wbGF0ZVN0cmluZ3NcbiAgfVxuXG4gIHZhbHVlT2YgKCkgeyByZXR1cm4gdGhpcy5yYXdUZXh0IH1cbiAgdG9TdHJpbmcgKCkgeyByZXR1cm4gdGhpcy5yYXdUZXh0IH1cbn1cblxuY2xhc3MgVG9uaWMgZXh0ZW5kcyB3aW5kb3cuSFRNTEVsZW1lbnQge1xuICBjb25zdHJ1Y3RvciAoKSB7XG4gICAgc3VwZXIoKVxuICAgIGNvbnN0IHN0YXRlID0gVG9uaWMuX3N0YXRlc1tzdXBlci5pZF1cbiAgICBkZWxldGUgVG9uaWMuX3N0YXRlc1tzdXBlci5pZF1cbiAgICB0aGlzLl9zdGF0ZSA9IHN0YXRlIHx8IHt9XG4gICAgdGhpcy5wcmV2ZW50UmVuZGVyT25SZWNvbm5lY3QgPSBmYWxzZVxuICAgIHRoaXMucHJvcHMgPSB7fVxuICAgIHRoaXMuZWxlbWVudHMgPSBbLi4udGhpcy5jaGlsZHJlbl1cbiAgICB0aGlzLmVsZW1lbnRzLl9fY2hpbGRyZW5fXyA9IHRydWVcbiAgICB0aGlzLm5vZGVzID0gWy4uLnRoaXMuY2hpbGROb2Rlc11cbiAgICB0aGlzLm5vZGVzLl9fY2hpbGRyZW5fXyA9IHRydWVcbiAgICB0aGlzLl9ldmVudHMoKVxuICB9XG5cbiAgc3RhdGljIF9jcmVhdGVJZCAoKSB7XG4gICAgcmV0dXJuIGB0b25pYyR7VG9uaWMuX2luZGV4Kyt9YFxuICB9XG5cbiAgc3RhdGljIF9zcGxpdE5hbWUgKHMpIHtcbiAgICByZXR1cm4gcy5tYXRjaCgvW0EtWl1bYS16MC05XSovZykuam9pbignLScpXG4gIH1cblxuICBzdGF0aWMgX25vcm1hbGl6ZUF0dHJzIChvLCB4ID0ge30pIHtcbiAgICBbLi4ub10uZm9yRWFjaChvID0+ICh4W28ubmFtZV0gPSBvLnZhbHVlKSlcbiAgICByZXR1cm4geFxuICB9XG5cbiAgX2NoZWNrSWQgKCkge1xuICAgIGNvbnN0IF9pZCA9IHN1cGVyLmlkXG4gICAgaWYgKCFfaWQpIHtcbiAgICAgIGNvbnN0IGh0bWwgPSB0aGlzLm91dGVySFRNTC5yZXBsYWNlKHRoaXMuaW5uZXJIVE1MLCAnLi4uJylcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ29tcG9uZW50OiAke2h0bWx9IGhhcyBubyBpZGApXG4gICAgfVxuICAgIHJldHVybiBfaWRcbiAgfVxuXG4gIGdldCBzdGF0ZSAoKSB7XG4gICAgcmV0dXJuICh0aGlzLl9jaGVja0lkKCksIHRoaXMuX3N0YXRlKVxuICB9XG5cbiAgc2V0IHN0YXRlIChuZXdTdGF0ZSkge1xuICAgIHRoaXMuX3N0YXRlID0gKHRoaXMuX2NoZWNrSWQoKSwgbmV3U3RhdGUpXG4gIH1cblxuICBnZXQgaWQgKCkgeyByZXR1cm4gdGhpcy5fY2hlY2tJZCgpIH1cblxuICBzZXQgaWQgKG5ld0lkKSB7IHN1cGVyLmlkID0gbmV3SWQgfVxuXG4gIF9ldmVudHMgKCkge1xuICAgIGNvbnN0IGhwID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMod2luZG93LkhUTUxFbGVtZW50LnByb3RvdHlwZSlcbiAgICBmb3IgKGNvbnN0IHAgb2YgdGhpcy5fcHJvcHMpIHtcbiAgICAgIGlmIChocC5pbmRleE9mKCdvbicgKyBwKSA9PT0gLTEpIGNvbnRpbnVlXG4gICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIocCwgdGhpcylcbiAgICB9XG4gIH1cblxuICBfcHJvcCAobykge1xuICAgIGNvbnN0IGlkID0gdGhpcy5faWRcbiAgICBjb25zdCBwID0gYF9fJHtpZH1fXyR7VG9uaWMuX2NyZWF0ZUlkKCl9X19gXG4gICAgVG9uaWMuX2RhdGFbaWRdID0gVG9uaWMuX2RhdGFbaWRdIHx8IHt9XG4gICAgVG9uaWMuX2RhdGFbaWRdW3BdID0gb1xuICAgIHJldHVybiBwXG4gIH1cblxuICBfcGxhY2Vob2xkIChyKSB7XG4gICAgY29uc3QgaWQgPSB0aGlzLl9pZFxuICAgIGNvbnN0IHJlZiA9IGBwbGFjZWhvbGQ6JHtpZH06JHtUb25pYy5fY3JlYXRlSWQoKX1fX2BcbiAgICBUb25pYy5fY2hpbGRyZW5baWRdID0gVG9uaWMuX2NoaWxkcmVuW2lkXSB8fCB7fVxuICAgIFRvbmljLl9jaGlsZHJlbltpZF1bcmVmXSA9IHJcbiAgICByZXR1cm4gcmVmXG4gIH1cblxuICBzdGF0aWMgbWF0Y2ggKGVsLCBzKSB7XG4gICAgaWYgKCFlbC5tYXRjaGVzKSBlbCA9IGVsLnBhcmVudEVsZW1lbnRcbiAgICByZXR1cm4gZWwubWF0Y2hlcyhzKSA/IGVsIDogZWwuY2xvc2VzdChzKVxuICB9XG5cbiAgc3RhdGljIGdldFByb3BlcnR5TmFtZXMgKHByb3RvKSB7XG4gICAgY29uc3QgcHJvcHMgPSBbXVxuICAgIHdoaWxlIChwcm90byAmJiBwcm90byAhPT0gVG9uaWMucHJvdG90eXBlKSB7XG4gICAgICBwcm9wcy5wdXNoKC4uLk9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHByb3RvKSlcbiAgICAgIHByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHByb3RvKVxuICAgIH1cbiAgICByZXR1cm4gcHJvcHNcbiAgfVxuXG4gIHN0YXRpYyBhZGQgKGMsIGh0bWxOYW1lKSB7XG4gICAgY29uc3QgaGFzVmFsaWROYW1lID0gaHRtbE5hbWUgfHwgKGMubmFtZSAmJiBjLm5hbWUubGVuZ3RoID4gMSlcbiAgICBpZiAoIWhhc1ZhbGlkTmFtZSkge1xuICAgICAgdGhyb3cgRXJyb3IoJ01hbmdsaW5nLiBodHRwczovL2JpdC5seS8yVGtKNnpQJylcbiAgICB9XG5cbiAgICBpZiAoIWh0bWxOYW1lKSBodG1sTmFtZSA9IFRvbmljLl9zcGxpdE5hbWUoYy5uYW1lKS50b0xvd2VyQ2FzZSgpXG4gICAgaWYgKCFUb25pYy5zc3IgJiYgd2luZG93LmN1c3RvbUVsZW1lbnRzLmdldChodG1sTmFtZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IFRvbmljLmFkZCgke2MubmFtZX0sICcke2h0bWxOYW1lfScpIHR3aWNlYClcbiAgICB9XG5cbiAgICBpZiAoIWMucHJvdG90eXBlIHx8ICFjLnByb3RvdHlwZS5pc1RvbmljQ29tcG9uZW50KSB7XG4gICAgICBjb25zdCB0bXAgPSB7IFtjLm5hbWVdOiBjbGFzcyBleHRlbmRzIFRvbmljIHt9IH1bYy5uYW1lXVxuICAgICAgdG1wLnByb3RvdHlwZS5yZW5kZXIgPSBjXG4gICAgICBjID0gdG1wXG4gICAgfVxuXG4gICAgYy5wcm90b3R5cGUuX3Byb3BzID0gVG9uaWMuZ2V0UHJvcGVydHlOYW1lcyhjLnByb3RvdHlwZSlcblxuICAgIFRvbmljLl9yZWdbaHRtbE5hbWVdID0gY1xuICAgIFRvbmljLl90YWdzID0gT2JqZWN0LmtleXMoVG9uaWMuX3JlZykuam9pbigpXG4gICAgd2luZG93LmN1c3RvbUVsZW1lbnRzLmRlZmluZShodG1sTmFtZSwgYylcblxuICAgIGlmICh0eXBlb2YgYy5zdHlsZXNoZWV0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBUb25pYy5yZWdpc3RlclN0eWxlcyhjLnN0eWxlc2hlZXQpXG4gICAgfVxuXG4gICAgcmV0dXJuIGNcbiAgfVxuXG4gIHN0YXRpYyByZWdpc3RlclN0eWxlcyAoc3R5bGVzaGVldEZuKSB7XG4gICAgaWYgKFRvbmljLl9zdHlsZXNoZWV0UmVnaXN0cnkuaW5jbHVkZXMoc3R5bGVzaGVldEZuKSkgcmV0dXJuXG4gICAgVG9uaWMuX3N0eWxlc2hlZXRSZWdpc3RyeS5wdXNoKHN0eWxlc2hlZXRGbilcblxuICAgIGNvbnN0IHN0eWxlTm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJylcbiAgICBpZiAoVG9uaWMubm9uY2UpIHN0eWxlTm9kZS5zZXRBdHRyaWJ1dGUoJ25vbmNlJywgVG9uaWMubm9uY2UpXG4gICAgc3R5bGVOb2RlLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHN0eWxlc2hlZXRGbigpKSlcbiAgICBpZiAoZG9jdW1lbnQuaGVhZCkgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzdHlsZU5vZGUpXG4gIH1cblxuICBzdGF0aWMgZXNjYXBlIChzKSB7XG4gICAgcmV0dXJuIHMucmVwbGFjZShUb25pYy5FU0MsIGMgPT4gVG9uaWMuTUFQW2NdKVxuICB9XG5cbiAgc3RhdGljIHVuc2FmZVJhd1N0cmluZyAocywgdGVtcGxhdGVTdHJpbmdzKSB7XG4gICAgcmV0dXJuIG5ldyBUb25pY1RlbXBsYXRlKHMsIHRlbXBsYXRlU3RyaW5ncywgdHJ1ZSlcbiAgfVxuXG4gIGRpc3BhdGNoIChldmVudE5hbWUsIGRldGFpbCA9IG51bGwpIHtcbiAgICBjb25zdCBvcHRzID0geyBidWJibGVzOiB0cnVlLCBkZXRhaWwgfVxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgd2luZG93LkN1c3RvbUV2ZW50KGV2ZW50TmFtZSwgb3B0cykpXG4gIH1cblxuICBodG1sIChzdHJpbmdzLCAuLi52YWx1ZXMpIHtcbiAgICBjb25zdCByZWZzID0gbyA9PiB7XG4gICAgICBpZiAobyAmJiBvLl9fY2hpbGRyZW5fXykgcmV0dXJuIHRoaXMuX3BsYWNlaG9sZChvKVxuICAgICAgaWYgKG8gJiYgby5pc1RvbmljVGVtcGxhdGUpIHJldHVybiBvLnJhd1RleHRcbiAgICAgIHN3aXRjaCAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pKSB7XG4gICAgICAgIGNhc2UgJ1tvYmplY3QgSFRNTENvbGxlY3Rpb25dJzpcbiAgICAgICAgY2FzZSAnW29iamVjdCBOb2RlTGlzdF0nOiByZXR1cm4gdGhpcy5fcGxhY2Vob2xkKFsuLi5vXSlcbiAgICAgICAgY2FzZSAnW29iamVjdCBBcnJheV0nOlxuICAgICAgICAgIGlmIChvLmV2ZXJ5KHggPT4geC5pc1RvbmljVGVtcGxhdGUgJiYgIXgudW5zYWZlKSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBUb25pY1RlbXBsYXRlKG8uam9pbignXFxuJyksIG51bGwsIGZhbHNlKVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gdGhpcy5fcHJvcChvKVxuICAgICAgICBjYXNlICdbb2JqZWN0IE9iamVjdF0nOlxuICAgICAgICBjYXNlICdbb2JqZWN0IEZ1bmN0aW9uXSc6IHJldHVybiB0aGlzLl9wcm9wKG8pXG4gICAgICAgIGNhc2UgJ1tvYmplY3QgTmFtZWROb2RlTWFwXSc6XG4gICAgICAgICAgcmV0dXJuIHRoaXMuX3Byb3AoVG9uaWMuX25vcm1hbGl6ZUF0dHJzKG8pKVxuICAgICAgICBjYXNlICdbb2JqZWN0IE51bWJlcl0nOiByZXR1cm4gYCR7b31fX2Zsb2F0YFxuICAgICAgICBjYXNlICdbb2JqZWN0IFN0cmluZ10nOiByZXR1cm4gVG9uaWMuZXNjYXBlKG8pXG4gICAgICAgIGNhc2UgJ1tvYmplY3QgQm9vbGVhbl0nOiByZXR1cm4gYCR7b31fX2Jvb2xlYW5gXG4gICAgICAgIGNhc2UgJ1tvYmplY3QgTnVsbF0nOiByZXR1cm4gYCR7b31fX251bGxgXG4gICAgICAgIGNhc2UgJ1tvYmplY3QgSFRNTEVsZW1lbnRdJzpcbiAgICAgICAgICByZXR1cm4gdGhpcy5fcGxhY2Vob2xkKFtvXSlcbiAgICAgIH1cbiAgICAgIGlmIChcbiAgICAgICAgdHlwZW9mIG8gPT09ICdvYmplY3QnICYmIG8gJiYgby5ub2RlVHlwZSA9PT0gMSAmJlxuICAgICAgICB0eXBlb2Ygby5jbG9uZU5vZGUgPT09ICdmdW5jdGlvbidcbiAgICAgICkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGxhY2Vob2xkKFtvXSlcbiAgICAgIH1cbiAgICAgIHJldHVybiBvXG4gICAgfVxuXG4gICAgY29uc3Qgb3V0ID0gW11cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHN0cmluZ3MubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICBvdXQucHVzaChzdHJpbmdzW2ldLCByZWZzKHZhbHVlc1tpXSkpXG4gICAgfVxuICAgIG91dC5wdXNoKHN0cmluZ3Nbc3RyaW5ncy5sZW5ndGggLSAxXSlcblxuICAgIGNvbnN0IGh0bWxTdHIgPSBvdXQuam9pbignJykucmVwbGFjZShUb25pYy5TUFJFQUQsIChfLCBwKSA9PiB7XG4gICAgICBjb25zdCBvID0gVG9uaWMuX2RhdGFbcC5zcGxpdCgnX18nKVsxXV1bcF1cbiAgICAgIHJldHVybiBPYmplY3QuZW50cmllcyhvKS5tYXAoKFtrZXksIHZhbHVlXSkgPT4ge1xuICAgICAgICBjb25zdCBrID0ga2V5LnJlcGxhY2UoLyhbYS16XSkoW0EtWl0pL2csICckMS0kMicpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgaWYgKHZhbHVlID09PSB0cnVlKSByZXR1cm4ga1xuICAgICAgICBlbHNlIGlmICh2YWx1ZSkgcmV0dXJuIGAke2t9PVwiJHtUb25pYy5lc2NhcGUoU3RyaW5nKHZhbHVlKSl9XCJgXG4gICAgICAgIGVsc2UgcmV0dXJuICcnXG4gICAgICB9KS5maWx0ZXIoQm9vbGVhbikuam9pbignICcpXG4gICAgfSlcbiAgICByZXR1cm4gbmV3IFRvbmljVGVtcGxhdGUoaHRtbFN0ciwgc3RyaW5ncywgZmFsc2UpXG4gIH1cblxuICBzY2hlZHVsZVJlUmVuZGVyIChvbGRQcm9wcykge1xuICAgIGlmICh0aGlzLnBlbmRpbmdSZVJlbmRlcikgcmV0dXJuIHRoaXMucGVuZGluZ1JlUmVuZGVyXG5cbiAgICB0aGlzLnBlbmRpbmdSZVJlbmRlciA9IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBpZiAoIXRoaXMuaXNJbkRvY3VtZW50KHRoaXMuc2hhZG93Um9vdCB8fCB0aGlzKSkgcmV0dXJuXG4gICAgICBjb25zdCBwID0gdGhpcy5fc2V0KHRoaXMuc2hhZG93Um9vdCB8fCB0aGlzLCB0aGlzLnJlbmRlcilcbiAgICAgIHRoaXMucGVuZGluZ1JlUmVuZGVyID0gbnVsbFxuXG4gICAgICBpZiAocCAmJiBwLnRoZW4pIHtcbiAgICAgICAgcmV0dXJuIHAudGhlbigoKSA9PiB7XG4gICAgICAgICAgdGhpcy51cGRhdGVkICYmIHRoaXMudXBkYXRlZChvbGRQcm9wcylcbiAgICAgICAgICByZXNvbHZlKClcbiAgICAgICAgfSlcbiAgICAgIH1cblxuICAgICAgdGhpcy51cGRhdGVkICYmIHRoaXMudXBkYXRlZChvbGRQcm9wcylcbiAgICAgIHJlc29sdmUoKVxuICAgIH0sIDApKVxuXG4gICAgcmV0dXJuIHRoaXMucGVuZGluZ1JlUmVuZGVyXG4gIH1cblxuICByZVJlbmRlciAobyA9IHRoaXMucHJvcHMpIHtcbiAgICBjb25zdCBvbGRQcm9wcyA9IHsgLi4udGhpcy5wcm9wcyB9XG4gICAgdGhpcy5wcm9wcyA9IHR5cGVvZiBvID09PSAnZnVuY3Rpb24nID8gbyhvbGRQcm9wcykgOiBvXG4gICAgcmV0dXJuIHRoaXMuc2NoZWR1bGVSZVJlbmRlcihvbGRQcm9wcylcbiAgfVxuXG4gIGhhbmRsZUV2ZW50IChlKSB7XG4gICAgdGhpc1tlLnR5cGVdKGUpXG4gIH1cblxuICBfZHJhaW5JdGVyYXRvciAodGFyZ2V0LCBpdGVyYXRvcikge1xuICAgIHJldHVybiBpdGVyYXRvci5uZXh0KCkudGhlbigocmVzdWx0KSA9PiB7XG4gICAgICB0aGlzLl9zZXQodGFyZ2V0LCBudWxsLCByZXN1bHQudmFsdWUpXG4gICAgICBpZiAocmVzdWx0LmRvbmUpIHJldHVyblxuICAgICAgcmV0dXJuIHRoaXMuX2RyYWluSXRlcmF0b3IodGFyZ2V0LCBpdGVyYXRvcilcbiAgICB9KVxuICB9XG5cbiAgX3NldCAodGFyZ2V0LCByZW5kZXIsIGNvbnRlbnQgPSAnJykge1xuICAgIGZvciAoY29uc3Qgbm9kZSBvZiB0YXJnZXQucXVlcnlTZWxlY3RvckFsbChUb25pYy5fdGFncykpIHtcbiAgICAgIGlmICghbm9kZS5pc1RvbmljQ29tcG9uZW50KSBjb250aW51ZVxuXG4gICAgICBjb25zdCBpZCA9IG5vZGUuZ2V0QXR0cmlidXRlKCdpZCcpXG4gICAgICBpZiAoIWlkIHx8ICFUb25pYy5fcmVmSWRzLmluY2x1ZGVzKGlkKSkgY29udGludWVcbiAgICAgIFRvbmljLl9zdGF0ZXNbaWRdID0gbm9kZS5zdGF0ZVxuICAgIH1cblxuICAgIGlmIChyZW5kZXIgaW5zdGFuY2VvZiBUb25pYy5Bc3luY0Z1bmN0aW9uKSB7XG4gICAgICByZXR1cm4gcmVuZGVyLmNhbGwodGhpcykudGhlbihjb250ZW50ID0+IHRoaXMuX2FwcGx5KHRhcmdldCwgY29udGVudCkpXG4gICAgfSBlbHNlIGlmIChyZW5kZXIgaW5zdGFuY2VvZiBUb25pYy5Bc3luY0Z1bmN0aW9uR2VuZXJhdG9yKSB7XG4gICAgICByZXR1cm4gdGhpcy5fZHJhaW5JdGVyYXRvcih0YXJnZXQsIHJlbmRlci5jYWxsKHRoaXMpKVxuICAgIH0gZWxzZSBpZiAocmVuZGVyID09PSBudWxsKSB7XG4gICAgICB0aGlzLl9hcHBseSh0YXJnZXQsIGNvbnRlbnQpXG4gICAgfSBlbHNlIGlmIChyZW5kZXIgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgdGhpcy5fYXBwbHkodGFyZ2V0LCByZW5kZXIuY2FsbCh0aGlzKSB8fCAnJylcbiAgICB9XG4gIH1cblxuICBfYXBwbHkgKHRhcmdldCwgY29udGVudCkge1xuICAgIGlmIChjb250ZW50ICYmIGNvbnRlbnQuaXNUb25pY1RlbXBsYXRlKSB7XG4gICAgICBjb250ZW50ID0gY29udGVudC5yYXdUZXh0XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgY29udGVudCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGNvbnRlbnQgPSBUb25pYy5lc2NhcGUoY29udGVudClcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGNvbnRlbnQgPT09ICdzdHJpbmcnKSB7XG4gICAgICBpZiAodGhpcy5zdHlsZXNoZWV0KSB7XG4gICAgICAgIGNvbnRlbnQgPSBgPHN0eWxlIG5vbmNlPSR7VG9uaWMubm9uY2UgfHwgJyd9PiR7dGhpcy5zdHlsZXNoZWV0KCl9PC9zdHlsZT4ke2NvbnRlbnR9YFxuICAgICAgfVxuXG4gICAgICB0YXJnZXQuaW5uZXJIVE1MID0gY29udGVudFxuXG4gICAgICBpZiAodGhpcy5zdHlsZXMpIHtcbiAgICAgICAgY29uc3Qgc3R5bGVzID0gdGhpcy5zdHlsZXMoKVxuICAgICAgICBmb3IgKGNvbnN0IG5vZGUgb2YgdGFyZ2V0LnF1ZXJ5U2VsZWN0b3JBbGwoJ1tzdHlsZXNdJykpIHtcbiAgICAgICAgICBmb3IgKGNvbnN0IHMgb2Ygbm9kZS5nZXRBdHRyaWJ1dGUoJ3N0eWxlcycpLnNwbGl0KC9cXHMrLykpIHtcbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24obm9kZS5zdHlsZSwgc3R5bGVzW3MudHJpbSgpXSlcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY29uc3QgY2hpbGRyZW4gPSBUb25pYy5fY2hpbGRyZW5bdGhpcy5faWRdIHx8IHt9XG5cbiAgICAgIGNvbnN0IHdhbGsgPSAobm9kZSwgZm4pID0+IHtcbiAgICAgICAgaWYgKG5vZGUubm9kZVR5cGUgPT09IDMpIHtcbiAgICAgICAgICBjb25zdCBpZCA9IG5vZGUudGV4dENvbnRlbnQudHJpbSgpXG4gICAgICAgICAgaWYgKGNoaWxkcmVuW2lkXSkgZm4obm9kZSwgY2hpbGRyZW5baWRdLCBpZClcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNoaWxkTm9kZXMgPSBub2RlLmNoaWxkTm9kZXNcbiAgICAgICAgaWYgKCFjaGlsZE5vZGVzKSByZXR1cm5cblxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNoaWxkTm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICB3YWxrKGNoaWxkTm9kZXNbaV0sIGZuKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHdhbGsodGFyZ2V0LCAobm9kZSwgY2hpbGRyZW4sIGlkKSA9PiB7XG4gICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2YgY2hpbGRyZW4pIHtcbiAgICAgICAgICBub2RlLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGNoaWxkLCBub2RlKVxuICAgICAgICB9XG4gICAgICAgIGRlbGV0ZSBUb25pYy5fY2hpbGRyZW5bdGhpcy5faWRdW2lkXVxuICAgICAgICBub2RlLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobm9kZSlcbiAgICAgIH0pXG4gICAgfSBlbHNlIHtcbiAgICAgIHRhcmdldC5pbm5lckhUTUwgPSAnJ1xuICAgICAgdGFyZ2V0LmFwcGVuZENoaWxkKGNvbnRlbnQuY2xvbmVOb2RlKHRydWUpKVxuICAgIH1cbiAgfVxuXG4gIGNvbm5lY3RlZENhbGxiYWNrICgpIHtcbiAgICB0aGlzLnJvb3QgPSB0aGlzLnNoYWRvd1Jvb3QgfHwgdGhpcyAvLyBoZXJlIGZvciBiYWNrIGNvbXBhdFxuXG4gICAgaWYgKHN1cGVyLmlkICYmICFUb25pYy5fcmVmSWRzLmluY2x1ZGVzKHN1cGVyLmlkKSkge1xuICAgICAgVG9uaWMuX3JlZklkcy5wdXNoKHN1cGVyLmlkKVxuICAgIH1cbiAgICBjb25zdCBjYyA9IHMgPT4gcy5yZXBsYWNlKC8tKC4pL2csIChfLCBtKSA9PiBtLnRvVXBwZXJDYXNlKCkpXG5cbiAgICBmb3IgKGNvbnN0IHsgbmFtZTogX25hbWUsIHZhbHVlIH0gb2YgdGhpcy5hdHRyaWJ1dGVzKSB7XG4gICAgICBjb25zdCBuYW1lID0gY2MoX25hbWUpXG4gICAgICBjb25zdCBwID0gdGhpcy5wcm9wc1tuYW1lXSA9IHZhbHVlXG5cbiAgICAgIGlmICgvX19cXHcrX19cXHcrX18vLnRlc3QocCkpIHtcbiAgICAgICAgY29uc3QgeyAxOiByb290IH0gPSBwLnNwbGl0KCdfXycpXG4gICAgICAgIHRoaXMucHJvcHNbbmFtZV0gPSBUb25pYy5fZGF0YVtyb290XVtwXVxuICAgICAgfSBlbHNlIGlmICgvXFxkK19fZmxvYXQvLnRlc3QocCkpIHtcbiAgICAgICAgdGhpcy5wcm9wc1tuYW1lXSA9IHBhcnNlRmxvYXQocCwgMTApXG4gICAgICB9IGVsc2UgaWYgKHAgPT09ICdudWxsX19udWxsJykge1xuICAgICAgICB0aGlzLnByb3BzW25hbWVdID0gbnVsbFxuICAgICAgfSBlbHNlIGlmICgvXFx3K19fYm9vbGVhbi8udGVzdChwKSkge1xuICAgICAgICB0aGlzLnByb3BzW25hbWVdID0gcC5pbmNsdWRlcygndHJ1ZScpXG4gICAgICB9IGVsc2UgaWYgKC9wbGFjZWhvbGQ6XFx3KzpcXHcrX18vLnRlc3QocCkpIHtcbiAgICAgICAgY29uc3QgeyAxOiByb290IH0gPSBwLnNwbGl0KCc6JylcbiAgICAgICAgdGhpcy5wcm9wc1tuYW1lXSA9IFRvbmljLl9jaGlsZHJlbltyb290XVtwXVswXVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMucHJvcHMgPSBPYmplY3QuYXNzaWduKFxuICAgICAgdGhpcy5kZWZhdWx0cyA/IHRoaXMuZGVmYXVsdHMoKSA6IHt9LFxuICAgICAgdGhpcy5wcm9wc1xuICAgIClcblxuICAgIHRoaXMuX2lkID0gdGhpcy5faWQgfHwgVG9uaWMuX2NyZWF0ZUlkKClcblxuICAgIHRoaXMud2lsbENvbm5lY3QgJiYgdGhpcy53aWxsQ29ubmVjdCgpXG5cbiAgICBpZiAoIXRoaXMuaXNJbkRvY3VtZW50KHRoaXMucm9vdCkpIHJldHVyblxuICAgIGlmICghdGhpcy5wcmV2ZW50UmVuZGVyT25SZWNvbm5lY3QpIHtcbiAgICAgIGlmICghdGhpcy5fc291cmNlKSB7XG4gICAgICAgIHRoaXMuX3NvdXJjZSA9IHRoaXMuaW5uZXJIVE1MXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmlubmVySFRNTCA9IHRoaXMuX3NvdXJjZVxuICAgICAgfVxuICAgICAgY29uc3QgcCA9IHRoaXMuX3NldCh0aGlzLnJvb3QsIHRoaXMucmVuZGVyKVxuICAgICAgaWYgKHAgJiYgcC50aGVuKSByZXR1cm4gcC50aGVuKCgpID0+IHRoaXMuY29ubmVjdGVkICYmIHRoaXMuY29ubmVjdGVkKCkpXG4gICAgfVxuXG4gICAgdGhpcy5jb25uZWN0ZWQgJiYgdGhpcy5jb25uZWN0ZWQoKVxuICB9XG5cbiAgaXNJbkRvY3VtZW50ICh0YXJnZXQpIHtcbiAgICBjb25zdCByb290ID0gdGFyZ2V0LmdldFJvb3ROb2RlKClcbiAgICByZXR1cm4gcm9vdCA9PT0gZG9jdW1lbnQgfHwgcm9vdC50b1N0cmluZygpID09PSAnW29iamVjdCBTaGFkb3dSb290XSdcbiAgfVxuXG4gIGRpc2Nvbm5lY3RlZENhbGxiYWNrICgpIHtcbiAgICB0aGlzLmRpc2Nvbm5lY3RlZCAmJiB0aGlzLmRpc2Nvbm5lY3RlZCgpXG4gICAgZGVsZXRlIFRvbmljLl9kYXRhW3RoaXMuX2lkXVxuICAgIGRlbGV0ZSBUb25pYy5fY2hpbGRyZW5bdGhpcy5faWRdXG4gIH1cbn1cblxuVG9uaWMucHJvdG90eXBlLmlzVG9uaWNDb21wb25lbnQgPSB0cnVlXG5cbk9iamVjdC5hc3NpZ24oVG9uaWMsIHtcbiAgX3RhZ3M6ICcnLFxuICBfcmVmSWRzOiBbXSxcbiAgX2RhdGE6IHt9LFxuICBfc3RhdGVzOiB7fSxcbiAgX2NoaWxkcmVuOiB7fSxcbiAgX3JlZzoge30sXG4gIF9zdHlsZXNoZWV0UmVnaXN0cnk6IFtdLFxuICBfaW5kZXg6IDAsXG4gIHZlcnNpb246IHR5cGVvZiByZXF1aXJlICE9PSAndW5kZWZpbmVkJyA/IHJlcXVpcmUoJy4vcGFja2FnZScpLnZlcnNpb24gOiBudWxsLFxuICBTUFJFQUQ6IC9cXC5cXC5cXC5cXHM/KF9fXFx3K19fXFx3K19fKS9nLFxuICBFU0M6IC9bXCImJzw+YC9dL2csXG4gIEFzeW5jRnVuY3Rpb25HZW5lcmF0b3I6IGFzeW5jIGZ1bmN0aW9uICogKCkge30uY29uc3RydWN0b3IsXG4gIEFzeW5jRnVuY3Rpb246IGFzeW5jIGZ1bmN0aW9uICgpIHt9LmNvbnN0cnVjdG9yLFxuICBNQVA6IHsgJ1wiJzogJyZxdW90OycsICcmJzogJyZhbXA7JywgJ1xcJyc6ICcmI3gyNzsnLCAnPCc6ICcmbHQ7JywgJz4nOiAnJmd0OycsICdgJzogJyYjeDYwOycsICcvJzogJyYjeDJGOycgfVxufSlcblxuZXhwb3J0IGRlZmF1bHQgVG9uaWNcbiIsImltcG9ydCBUb25pYyBmcm9tICdAb3B0b29sY28vdG9uaWMvaW5kZXguZXNtJztcblxuY2xhc3MgTnljb1JlcG9BcmNoaXZlIGV4dGVuZHMgVG9uaWMge1xuICAvKipcbiAgICogR2V0cyBkYXRhIGZyb20gYSBsb2NhbCBKU09OIGRhdGEgcGF0aFxuICAgKlxuICAgKiBAcGFyYW0gICB7U3RyaW5nfSAgcGF0aCAgVGhlIG5hbWUgb2YgdGhlIGZpbGUgd2l0aG91dCBleHRlbnNpb25cbiAgICpcbiAgICogQHJldHVybiAge09iamVjdH0gICAgICAgIEpTT04gb2JqZWN0IG9mIHRoZSByZXNwb25zZVxuICAgKi9cbiAgYXN5bmMgZ2V0KHBhdGgpIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgZGF0YS8ke3BhdGh9Lmpzb25gLCB7XG4gICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgIG1vZGU6ICdzYW1lLW9yaWdpbicsXG4gICAgICAgIC8vIGNhY2hlOiAnZm9yY2UtY2FjaGUnXG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9ICdwcm9kdWN0aW9uJylcbiAgICAgICAgY29uc29sZS5kaXIoZXJyb3IpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWNvbnNvbGVcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogTWFpbiByZW5kZXIgbWV0aG9kIGZvciB0aGUgY29tcG9uZW50XG4gICAqXG4gICAqIEByZXR1cm4gIHtTdHJpbmd9ICBTdHJpbmcgcmVwcmVzZW50aW5nIEhUTUwgbWFya3VwXG4gICAqL1xuICBhc3luYyAqIHJlbmRlcigpIHtcbiAgICB5aWVsZCB0aGlzLmh0bWxgPHA+TG9hZGluZyBSZXBvc2l0b3JpZXMuLi48L3A+YDtcblxuICAgIGNvbnN0IHJlcG9zaXRvcmllcyA9IGF3YWl0IHRoaXMuZ2V0KCdyZXBvc2l0b3JpZXMnKTtcblxuICAgIGxldCBsaXN0ID0gW107XG5cbiAgICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgcmVwb3NpdG9yaWVzLmxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgY29uc3QgcmVwbyA9IHJlcG9zaXRvcmllc1tpbmRleF07XG5cbiAgICAgIGxpc3QucHVzaCh0aGlzLmh0bWxgXG4gICAgICAgIDxhcnRpY2xlIGNsYXNzPVwiYy1jYXJkIHAtMiBzbWFsbDpwLTMgYm9yZGVyLW5hdnkgaG92ZXI6c2hhZG93LXVwXCI+XG4gICAgICAgICAgPGhlYWRlciBjbGFzcz1cImMtY2FyZF9faGVhZGVyIGl0ZW1zLXN0YXJ0XCI+XG4gICAgICAgICAgICA8aDIgY2xhc3M9XCJjLWNhcmRfX3RpdGxlIG1pZS0xXCI+XG4gICAgICAgICAgICAgIDxzbWFsbCBjbGFzcz1cInRleHQtYmx1ZSBmb250LW5vcm1hbCBpbmxpbmUtZmxleCBpdGVtcy1jZW50ZXJcIj5cbiAgICAgICAgICAgICAgICA8c3ZnIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIGNsYXNzPVwiaWNvbi11aSBtaWUtMVwiPlxuICAgICAgICAgICAgICAgICAgPHVzZSB4bGluazpocmVmPVwiI2ZlYXRoZXItZ2l0aHViXCI+PC91c2U+XG4gICAgICAgICAgICAgICAgPC9zdmc+JHtyZXBvLm9yZ2FuaXphdGlvbn0gL1xuICAgICAgICAgICAgICA8L3NtYWxsPiA8YnI+ICR7cmVwby5uYW1lfVxuICAgICAgICAgICAgPC9oMj5cblxuICAgICAgICAgICAgPG1hcmsgY2xhc3M9XCJiYWRnZSBmbGV4IGl0ZW1zLWNlbnRlciB0ZXh0LWdyZWVuIGZsZXgtc2hyaW5rLTBcIj5cbiAgICAgICAgICAgICAgPGI+JHtTdHJpbmcocmVwby5sYW5ndWFnZSl9PC9iPlxuICAgICAgICAgICAgPC9tYXJrPlxuICAgICAgICAgIDwvaGVhZGVyPlxuXG4gICAgICAgICAgPGRsIGNsYXNzPVwiYy1jYXJkX19pbmxpbmUtZGVzY3JpcHRpb24tbGlzdFwiPlxuICAgICAgICAgICAgPGR0Pkxhbmd1YWdlPC9kdD5cbiAgICAgICAgICAgIDxkZD4ke1N0cmluZyhyZXBvLmxhbmd1YWdlKX08L2RkPlxuXG4gICAgICAgICAgICA8ZHQ+U3RhcnM8L2R0PlxuICAgICAgICAgICAgPGRkPiR7U3RyaW5nKHJlcG8uc3RhcmdhemVyc19jb3VudCl9PC9kZD5cblxuICAgICAgICAgICAgPGR0PkZvcmtzPC9kdD5cbiAgICAgICAgICAgIDxkZD4ke1N0cmluZyhyZXBvLmZvcmtzKX08L2RkPlxuICAgICAgICAgIDwvZGw+XG5cbiAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgPHA+JHtTdHJpbmcocmVwby5kZXNjcmlwdGlvbil9PC9wPlxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgPGEgY2xhc3M9XCJjLWNhcmRfX2N0YVwiIGhyZWY9XCIke3JlcG8udXJsfVwiIHRhcmdldD1cIl9ibGFua1wiPjwvYT5cbiAgICAgICAgPC9hcnRpY2xlPlxuICAgICAgYCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuaHRtbChsaXN0KTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBOeWNvUmVwb0FyY2hpdmU7IiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBVdGlsaXRpZXNcbmltcG9ydCBJY29ucyBmcm9tICdAbnljb3Bwb3J0dW5pdHkvcHR0cm4tc2NyaXB0cy9zcmMvaWNvbnMvaWNvbnMnO1xuXG4vLyBDb21wb25lbnRzXG5pbXBvcnQgVG9uaWMgZnJvbSAnQG9wdG9vbGNvL3RvbmljL2luZGV4LmVzbSc7IC8vIGh0dHBzOi8vdG9uaWNmcmFtZXdvcmsuZGV2XG5pbXBvcnQgTnljb1JlcG9BcmNoaXZlIGZyb20gJy4vbnljby1yZXBvLWFyY2hpdmUnO1xuXG5pZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT0gJ3Byb2R1Y3Rpb24nKVxuICBjb25zb2xlLmRpcignRGV2ZWxvcG1lbnQgTW9kZScpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWNvbnNvbGVcblxubmV3IEljb25zKCdzdmcvc3Zncy5zdmcnKTtcbm5ldyBJY29ucygnaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L2doL2NpdHlvZm5ld3lvcmsvbnljby1wYXR0ZXJuc0B2Mi42LjEzL2Rpc3Qvc3ZnL2ljb25zLnN2ZycpO1xubmV3IEljb25zKCdodHRwczovL2Nkbi5qc2RlbGl2ci5uZXQvZ2gvY2l0eW9mbmV3eW9yay9ueWNvLXBhdHRlcm5zQHYyLjYuMTMvZGlzdC9zdmcvZmVhdGhlci5zdmcnKTtcblxuVG9uaWMuYWRkKE55Y29SZXBvQXJjaGl2ZSk7XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0VBRUE7RUFDQTtFQUNBO0VBQ0E7RUFDQSxNQUFNLEtBQUssQ0FBQztFQUNaO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxFQUFFLFdBQVcsQ0FBQyxJQUFJLEVBQUU7RUFDcEIsSUFBSSxJQUFJLEdBQUcsQ0FBQyxJQUFJLElB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
