
import 'element-qsa-scope';
import LiveRegion from 'live-region';
import createDebug from 'debug';
import Emitter from 'component-emitter';
// import matches from 'dom-matches';
import defaults from './lib/defaults';
import queryAll from './lib/query-all';

const debug = createDebug('drag-on-drop:index');
const arrayHandler = (containers, userOptions = {}) => {
  const { nested /* Was:, dragulaOptions = {} */ } = userOptions;
  const instances = [];

  containers.forEach(container => {
    instances.push(new KeyboardDrop(container, userOptions, nested));
  });

  if (nested) {
    const onDrag = (el, source) => {
      const instance = instances.find(inst => inst.container === source);
      if (instance) {
        instance.announcement('grabbed', el);
      }
    };
    const onDrop = (el, source) => {
      const instance = instances.find(inst => inst.container === source);
      if (instance) {
        instance.announcement('dropped', el).setItems();
      }
    };

    const topMost = containers[0];
    const lists = Array.from(containers);
    lists.shift(); // remove the top-most conatainer

    // Was: const topLevelDragula = dragula([topMost], { ...
  }

  return instances;
};

export default class KeyboardDrop {
  /**
   * Keyboard Drop
   * @param  {HTMLElement} container - The containing list
   * @param  {Object} userOptions - The user provided options
   *
   * @option {String} item - The selector for the drag items (qualified within
   *                         container). Defaults to `'li'`.
   * @option {String} handle - The selector for the handle. If set to
   *                            false, the entire item will be used as the draggable region.
   *                            Defaults to `'button'`.
   * @option {String} activeClass - The class to be added to the item being dragged.
   *                                Defaults to `'dragon-active'`.
   * @option {String} inactiveClass - The class to be added to all of the other
   *                                  items when an item is being dragged. Defaults
   *                                  to `'dragon-inactive'`.
   * @option {Object} annnouncement - The configuration object for live region announcements
   * @option {Function} announcement.grabbed - The function called when an item is picked up.
   *                                           The currently grabbed element along with an
   *                                           array of all items are passed as arguments
   *                                           respectively. The function should return a
   *                                           string of text to be announced in the live region.
   * @option {Function} announcement.dropped - The function called with an item is dropped. The
   *                                           newly dropped item along with an array of items
   *                                           are passed as arguments respectively. The function
   *                                           should return a string of text to be announced in
   *                                           the live region.
   * @option {Function} announcement.reorder - The function called when the list has been reordered.
   *                                           The newly dropped item along with an array of items
   *                                           are passed as arguments respectively. The function
   *                                           should return a string of text to be announced in
   *                                           the live region.
   * @option {Function} announcement.cancel - The function called when the reorder is cancelled
   *                                          (via ESC). No arguments passed in.
   */
  constructor(container, userOptions = {}) {
    if (Array.isArray(container)) {
      return arrayHandler(container, userOptions);
    }
    // make the dragon an emitter
    Emitter(this);
    this.handledHandles = [];
    this.initOptions(userOptions);

    // Was: const { nested } = this.options; ...

    // init live region for custom announcements
    this.liveRegion = new LiveRegion({
      ariaLive: 'assertive',
      ariaRelevant: 'additions',
      ariaAtomic: 'true'
    });

    this.onKeydown = this.onKeydown.bind(this);

    // initialize elements / events
    this
      .initElements(container)
      .mouseEvents();

    debug('dragon initialized: ', this);

    return this;
  }

  /**
   * Sets the dragon drop options (extending user opts with defaults)
   * @param  {Object} userOptions the user provided options
   */
  initOptions(userOptions) {
    userOptions.announcement = userOptions.announcement || {};
    this.options = {
      ...defaults,
      ...userOptions,
      announcement: {
        ...defaults.announcement,
        ...userOptions.announcement
      }
    };

    return this;
  }

  initClick() {
    const { activeClass, inactiveClass, nested } = this.options;

    this.handles.forEach(handle => {
      if (this.handledHandles.includes(handle)) {
        return;
      }

      handle.addEventListener('click', e => {
        if (nested) { e.stopPropagation(); }
        const wasPressed = handle.getAttribute('data-drag-on') === 'true';
        const type = wasPressed ? 'dropped' : 'grabbed';

        // clean up
        this.handles
          .filter(h => h.getAttribute('aria-pressed') === 'true')
          .forEach(h => {
            h.setAttribute('aria-pressed', 'false');
            h.setAttribute('data-drag-on', 'false');
            h.classList.remove(activeClass);
          });

        handle.setAttribute('aria-pressed', `${!wasPressed}`);
        handle.setAttribute('data-drag-on', `${!wasPressed}`);

        const thisItem = this.items.find(itm => {
          return itm === handle || itm.contains(handle);
        });

        this.announcement(type, thisItem);
        this.emit(type, this.container, thisItem);

        // configure classes (active and inactive)
        this.items.forEach(it => {
          const method = !wasPressed ? 'add' : 'remove';
          const isTarget = it === handle || it.contains(handle);

          it.classList[(isTarget && !wasPressed) ? 'add' : 'remove'](activeClass);
          it.classList[(isTarget && !wasPressed) ? 'remove' : method](inactiveClass);
        });

        if (!wasPressed) {
          // cache the initial order to allow for escape cancellation
          this.cachedItems = queryAll(this.options.item, this.container);
        }
      });

      this.handledHandles.push(handle);
    });

    return this;
  }

  /**
   * Sets all element refs
   * @param {HTMLElement} container the containing element
   */
  initElements(container) {
    this.container = container;
    this.setItems().initClick();


    // set all attrs/props/events on handle elements
    this.handles.forEach(handle => {
      handle.tabIndex = 0; // ensure it is focusable

      if (handle.tagName !== 'BUTTON') {
        handle.setAttribute('role', 'button');
      }

      // events
      handle.removeEventListener('keydown', this.onKeydown);
      handle.addEventListener('keydown', this.onKeydown);
    });

    return this;
  }

  setItems() {
    const opts = this.options;
    this.items = queryAll(opts.item, this.container);
    this.handles = opts.handle
      ? queryAll([opts.item, opts.handle].join(' '), this.container)
      : this.items;

    return this;
  }

  onKeydown(e) {
    const { nested } = this.options;
    const { target, which } = e;
    const isDrag = () => target.getAttribute('data-drag-on') === 'true';

    // https://w3.org/TR/2014/WD-DOM-Level-3-Events-20140925/#legacy-key-models
    switch (which) {
      case 13: // 'Enter'
      case 32: // 'Space'
        if (nested) { e.stopPropagation(); }
        e.preventDefault();
        target.click();

        break;
      case 37: // 'ArrowLeft'
      case 38:
      case 39:
      case 40: // 'ArrowDown'
        if (isDrag()) {
          e.preventDefault();
          this.arrow(which, target);
        }

        break;
      case 9: // 'Tab'
        if (isDrag()) {
          target.click();
        }

        break;
      case 27: // 'Escape'
        if (isDrag()) {
          target.click();
          this.cancel();
        }
    }

    return this;
  }

  arrow(which, target) {
    const handles = this.handles;
    const items = this.items;
    const isUp = which === 37 || which === 38;
    const index = handles.indexOf(target);
    const adjacentIndex = isUp ? index - 1 : index + 1;
    const adjacentItem = handles[adjacentIndex];
    const oldItem = items[index];

    if (!adjacentItem || !oldItem) {
      return;
    }

    const newItem = items[adjacentIndex];
    const refNode = isUp ? newItem : newItem.nextElementSibling;
    // move the item in the DOM
    oldItem.parentNode.insertBefore(oldItem, refNode);

    target.focus();
    this
      .setItems()
      // new ~ added final three callback parameters (not 'newItem')
      .emit('reorder', this.container, oldItem, index, adjacentIndex, isUp ? 'up' : 'down')
      .announcement('reorder', oldItem);

    return this;
  }

  announcement(type, item) {
    debug(`${type} announcement`, item);
    const config = this.options.announcement || {};
    const funk = config[type];

    if (funk && typeof funk === 'function') {
      const msg = funk(item, this.items);
      this.liveRegion.announce(msg, 5e3);
      this.emit('announcement', msg);
    }

    return this;
  }

  mouseEvents() {
    // Was: ...
    return this;
  }

  cancel() {
    // cache active element so it can be focused after reorder
    const focused = document.activeElement;
    // restore the order of the list
    this.cachedItems.forEach(item => this.container.appendChild(item));
    this.items = this.cachedItems;
    // ensure the handle stays focused
    focused.focus();
    this
      .announcement('cancel')
      .emit('cancel')
      .setItems();

    return this;
  }
}

// make window.KeyboardDrop available rather than window.KeyboardDrop.default
// Was: module.exports = KeyboardDrop;
