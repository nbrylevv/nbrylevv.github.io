
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.20.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe,
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    var TYPE;
    (function (TYPE) {
        /**
         * Raw text
         */
        TYPE[TYPE["literal"] = 0] = "literal";
        /**
         * Variable w/o any format, e.g `var` in `this is a {var}`
         */
        TYPE[TYPE["argument"] = 1] = "argument";
        /**
         * Variable w/ number format
         */
        TYPE[TYPE["number"] = 2] = "number";
        /**
         * Variable w/ date format
         */
        TYPE[TYPE["date"] = 3] = "date";
        /**
         * Variable w/ time format
         */
        TYPE[TYPE["time"] = 4] = "time";
        /**
         * Variable w/ select format
         */
        TYPE[TYPE["select"] = 5] = "select";
        /**
         * Variable w/ plural format
         */
        TYPE[TYPE["plural"] = 6] = "plural";
        /**
         * Only possible within plural argument.
         * This is the `#` symbol that will be substituted with the count.
         */
        TYPE[TYPE["pound"] = 7] = "pound";
    })(TYPE || (TYPE = {}));
    /**
     * Type Guards
     */
    function isLiteralElement(el) {
        return el.type === TYPE.literal;
    }
    function isArgumentElement(el) {
        return el.type === TYPE.argument;
    }
    function isNumberElement(el) {
        return el.type === TYPE.number;
    }
    function isDateElement(el) {
        return el.type === TYPE.date;
    }
    function isTimeElement(el) {
        return el.type === TYPE.time;
    }
    function isSelectElement(el) {
        return el.type === TYPE.select;
    }
    function isPluralElement(el) {
        return el.type === TYPE.plural;
    }
    function isPoundElement(el) {
        return el.type === TYPE.pound;
    }
    function isNumberSkeleton(el) {
        return !!(el && typeof el === 'object' && el.type === 0 /* number */);
    }
    function isDateTimeSkeleton(el) {
        return !!(el && typeof el === 'object' && el.type === 1 /* dateTime */);
    }

    // tslint:disable:only-arrow-functions
    // tslint:disable:object-literal-shorthand
    // tslint:disable:trailing-comma
    // tslint:disable:object-literal-sort-keys
    // tslint:disable:one-variable-per-declaration
    // tslint:disable:max-line-length
    // tslint:disable:no-consecutive-blank-lines
    // tslint:disable:align
    var __extends = (undefined && undefined.__extends) || (function () {
        var extendStatics = function (d, b) {
            extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
                function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
            return extendStatics(d, b);
        };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    var __assign = (undefined && undefined.__assign) || function () {
        __assign = Object.assign || function(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                    t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };
    var SyntaxError = /** @class */ (function (_super) {
        __extends(SyntaxError, _super);
        function SyntaxError(message, expected, found, location) {
            var _this = _super.call(this) || this;
            _this.message = message;
            _this.expected = expected;
            _this.found = found;
            _this.location = location;
            _this.name = "SyntaxError";
            if (typeof Error.captureStackTrace === "function") {
                Error.captureStackTrace(_this, SyntaxError);
            }
            return _this;
        }
        SyntaxError.buildMessage = function (expected, found) {
            function hex(ch) {
                return ch.charCodeAt(0).toString(16).toUpperCase();
            }
            function literalEscape(s) {
                return s
                    .replace(/\\/g, "\\\\")
                    .replace(/"/g, "\\\"")
                    .replace(/\0/g, "\\0")
                    .replace(/\t/g, "\\t")
                    .replace(/\n/g, "\\n")
                    .replace(/\r/g, "\\r")
                    .replace(/[\x00-\x0F]/g, function (ch) { return "\\x0" + hex(ch); })
                    .replace(/[\x10-\x1F\x7F-\x9F]/g, function (ch) { return "\\x" + hex(ch); });
            }
            function classEscape(s) {
                return s
                    .replace(/\\/g, "\\\\")
                    .replace(/\]/g, "\\]")
                    .replace(/\^/g, "\\^")
                    .replace(/-/g, "\\-")
                    .replace(/\0/g, "\\0")
                    .replace(/\t/g, "\\t")
                    .replace(/\n/g, "\\n")
                    .replace(/\r/g, "\\r")
                    .replace(/[\x00-\x0F]/g, function (ch) { return "\\x0" + hex(ch); })
                    .replace(/[\x10-\x1F\x7F-\x9F]/g, function (ch) { return "\\x" + hex(ch); });
            }
            function describeExpectation(expectation) {
                switch (expectation.type) {
                    case "literal":
                        return "\"" + literalEscape(expectation.text) + "\"";
                    case "class":
                        var escapedParts = expectation.parts.map(function (part) {
                            return Array.isArray(part)
                                ? classEscape(part[0]) + "-" + classEscape(part[1])
                                : classEscape(part);
                        });
                        return "[" + (expectation.inverted ? "^" : "") + escapedParts + "]";
                    case "any":
                        return "any character";
                    case "end":
                        return "end of input";
                    case "other":
                        return expectation.description;
                }
            }
            function describeExpected(expected1) {
                var descriptions = expected1.map(describeExpectation);
                var i;
                var j;
                descriptions.sort();
                if (descriptions.length > 0) {
                    for (i = 1, j = 1; i < descriptions.length; i++) {
                        if (descriptions[i - 1] !== descriptions[i]) {
                            descriptions[j] = descriptions[i];
                            j++;
                        }
                    }
                    descriptions.length = j;
                }
                switch (descriptions.length) {
                    case 1:
                        return descriptions[0];
                    case 2:
                        return descriptions[0] + " or " + descriptions[1];
                    default:
                        return descriptions.slice(0, -1).join(", ")
                            + ", or "
                            + descriptions[descriptions.length - 1];
                }
            }
            function describeFound(found1) {
                return found1 ? "\"" + literalEscape(found1) + "\"" : "end of input";
            }
            return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
        };
        return SyntaxError;
    }(Error));
    function peg$parse(input, options) {
        options = options !== undefined ? options : {};
        var peg$FAILED = {};
        var peg$startRuleFunctions = { start: peg$parsestart };
        var peg$startRuleFunction = peg$parsestart;
        var peg$c0 = function (parts) {
            return parts.join('');
        };
        var peg$c1 = function (messageText) {
            return __assign({ type: TYPE.literal, value: messageText }, insertLocation());
        };
        var peg$c2 = "#";
        var peg$c3 = peg$literalExpectation("#", false);
        var peg$c4 = function () {
            return __assign({ type: TYPE.pound }, insertLocation());
        };
        var peg$c5 = peg$otherExpectation("argumentElement");
        var peg$c6 = "{";
        var peg$c7 = peg$literalExpectation("{", false);
        var peg$c8 = "}";
        var peg$c9 = peg$literalExpectation("}", false);
        var peg$c10 = function (value) {
            return __assign({ type: TYPE.argument, value: value }, insertLocation());
        };
        var peg$c11 = peg$otherExpectation("numberSkeletonId");
        var peg$c12 = /^['\/{}]/;
        var peg$c13 = peg$classExpectation(["'", "/", "{", "}"], false, false);
        var peg$c14 = peg$anyExpectation();
        var peg$c15 = peg$otherExpectation("numberSkeletonTokenOption");
        var peg$c16 = "/";
        var peg$c17 = peg$literalExpectation("/", false);
        var peg$c18 = function (option) { return option; };
        var peg$c19 = peg$otherExpectation("numberSkeletonToken");
        var peg$c20 = function (stem, options) {
            return { stem: stem, options: options };
        };
        var peg$c21 = function (tokens) {
            return __assign({ type: 0 /* number */, tokens: tokens }, insertLocation());
        };
        var peg$c22 = "::";
        var peg$c23 = peg$literalExpectation("::", false);
        var peg$c24 = function (skeleton) { return skeleton; };
        var peg$c25 = function () { messageCtx.push('numberArgStyle'); return true; };
        var peg$c26 = function (style) {
            messageCtx.pop();
            return style.replace(/\s*$/, '');
        };
        var peg$c27 = ",";
        var peg$c28 = peg$literalExpectation(",", false);
        var peg$c29 = "number";
        var peg$c30 = peg$literalExpectation("number", false);
        var peg$c31 = function (value, type, style) {
            return __assign({ type: type === 'number' ? TYPE.number : type === 'date' ? TYPE.date : TYPE.time, style: style && style[2], value: value }, insertLocation());
        };
        var peg$c32 = "'";
        var peg$c33 = peg$literalExpectation("'", false);
        var peg$c34 = /^[^']/;
        var peg$c35 = peg$classExpectation(["'"], true, false);
        var peg$c36 = /^[^a-zA-Z'{}]/;
        var peg$c37 = peg$classExpectation([["a", "z"], ["A", "Z"], "'", "{", "}"], true, false);
        var peg$c38 = /^[a-zA-Z]/;
        var peg$c39 = peg$classExpectation([["a", "z"], ["A", "Z"]], false, false);
        var peg$c40 = function (pattern) {
            return __assign({ type: 1 /* dateTime */, pattern: pattern }, insertLocation());
        };
        var peg$c41 = function () { messageCtx.push('dateOrTimeArgStyle'); return true; };
        var peg$c42 = "date";
        var peg$c43 = peg$literalExpectation("date", false);
        var peg$c44 = "time";
        var peg$c45 = peg$literalExpectation("time", false);
        var peg$c46 = "plural";
        var peg$c47 = peg$literalExpectation("plural", false);
        var peg$c48 = "selectordinal";
        var peg$c49 = peg$literalExpectation("selectordinal", false);
        var peg$c50 = "offset:";
        var peg$c51 = peg$literalExpectation("offset:", false);
        var peg$c52 = function (value, pluralType, offset, options) {
            return __assign({ type: TYPE.plural, pluralType: pluralType === 'plural' ? 'cardinal' : 'ordinal', value: value, offset: offset ? offset[2] : 0, options: options.reduce(function (all, _a) {
                    var id = _a.id, value = _a.value, optionLocation = _a.location;
                    if (id in all) {
                        error("Duplicate option \"" + id + "\" in plural element: \"" + text() + "\"", location());
                    }
                    all[id] = {
                        value: value,
                        location: optionLocation
                    };
                    return all;
                }, {}) }, insertLocation());
        };
        var peg$c53 = "select";
        var peg$c54 = peg$literalExpectation("select", false);
        var peg$c55 = function (value, options) {
            return __assign({ type: TYPE.select, value: value, options: options.reduce(function (all, _a) {
                    var id = _a.id, value = _a.value, optionLocation = _a.location;
                    if (id in all) {
                        error("Duplicate option \"" + id + "\" in select element: \"" + text() + "\"", location());
                    }
                    all[id] = {
                        value: value,
                        location: optionLocation
                    };
                    return all;
                }, {}) }, insertLocation());
        };
        var peg$c56 = "=";
        var peg$c57 = peg$literalExpectation("=", false);
        var peg$c58 = function (id) { messageCtx.push('select'); return true; };
        var peg$c59 = function (id, value) {
            messageCtx.pop();
            return __assign({ id: id,
                value: value }, insertLocation());
        };
        var peg$c60 = function (id) { messageCtx.push('plural'); return true; };
        var peg$c61 = function (id, value) {
            messageCtx.pop();
            return __assign({ id: id,
                value: value }, insertLocation());
        };
        var peg$c62 = peg$otherExpectation("whitespace");
        var peg$c63 = /^[\t-\r \x85\xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/;
        var peg$c64 = peg$classExpectation([["\t", "\r"], " ", "\x85", "\xA0", "\u1680", ["\u2000", "\u200A"], "\u2028", "\u2029", "\u202F", "\u205F", "\u3000"], false, false);
        var peg$c65 = peg$otherExpectation("syntax pattern");
        var peg$c66 = /^[!-\/:-@[-\^`{-~\xA1-\xA7\xA9\xAB\xAC\xAE\xB0\xB1\xB6\xBB\xBF\xD7\xF7\u2010-\u2027\u2030-\u203E\u2041-\u2053\u2055-\u205E\u2190-\u245F\u2500-\u2775\u2794-\u2BFF\u2E00-\u2E7F\u3001-\u3003\u3008-\u3020\u3030\uFD3E\uFD3F\uFE45\uFE46]/;
        var peg$c67 = peg$classExpectation([["!", "/"], [":", "@"], ["[", "^"], "`", ["{", "~"], ["\xA1", "\xA7"], "\xA9", "\xAB", "\xAC", "\xAE", "\xB0", "\xB1", "\xB6", "\xBB", "\xBF", "\xD7", "\xF7", ["\u2010", "\u2027"], ["\u2030", "\u203E"], ["\u2041", "\u2053"], ["\u2055", "\u205E"], ["\u2190", "\u245F"], ["\u2500", "\u2775"], ["\u2794", "\u2BFF"], ["\u2E00", "\u2E7F"], ["\u3001", "\u3003"], ["\u3008", "\u3020"], "\u3030", "\uFD3E", "\uFD3F", "\uFE45", "\uFE46"], false, false);
        var peg$c68 = peg$otherExpectation("optional whitespace");
        var peg$c69 = peg$otherExpectation("number");
        var peg$c70 = "-";
        var peg$c71 = peg$literalExpectation("-", false);
        var peg$c72 = function (negative, num) {
            return num
                ? negative
                    ? -num
                    : num
                : 0;
        };
        var peg$c74 = peg$otherExpectation("double apostrophes");
        var peg$c75 = "''";
        var peg$c76 = peg$literalExpectation("''", false);
        var peg$c77 = function () { return "'"; };
        var peg$c78 = function (escapedChar, quotedChars) {
            return escapedChar + quotedChars.replace("''", "'");
        };
        var peg$c79 = function (x) {
            return (x !== '{' &&
                !(isInPluralOption() && x === '#') &&
                !(isNestedMessageText() && x === '}'));
        };
        var peg$c80 = "\n";
        var peg$c81 = peg$literalExpectation("\n", false);
        var peg$c82 = function (x) {
            return x === '{' || x === '}' || (isInPluralOption() && x === '#');
        };
        var peg$c83 = peg$otherExpectation("argNameOrNumber");
        var peg$c84 = peg$otherExpectation("argNumber");
        var peg$c85 = "0";
        var peg$c86 = peg$literalExpectation("0", false);
        var peg$c87 = function () { return 0; };
        var peg$c88 = /^[1-9]/;
        var peg$c89 = peg$classExpectation([["1", "9"]], false, false);
        var peg$c90 = /^[0-9]/;
        var peg$c91 = peg$classExpectation([["0", "9"]], false, false);
        var peg$c92 = function (digits) {
            return parseInt(digits.join(''), 10);
        };
        var peg$c93 = peg$otherExpectation("argName");
        var peg$currPos = 0;
        var peg$savedPos = 0;
        var peg$posDetailsCache = [{ line: 1, column: 1 }];
        var peg$maxFailPos = 0;
        var peg$maxFailExpected = [];
        var peg$silentFails = 0;
        var peg$result;
        if (options.startRule !== undefined) {
            if (!(options.startRule in peg$startRuleFunctions)) {
                throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
            }
            peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
        }
        function text() {
            return input.substring(peg$savedPos, peg$currPos);
        }
        function location() {
            return peg$computeLocation(peg$savedPos, peg$currPos);
        }
        function error(message, location1) {
            location1 = location1 !== undefined
                ? location1
                : peg$computeLocation(peg$savedPos, peg$currPos);
            throw peg$buildSimpleError(message, location1);
        }
        function peg$literalExpectation(text1, ignoreCase) {
            return { type: "literal", text: text1, ignoreCase: ignoreCase };
        }
        function peg$classExpectation(parts, inverted, ignoreCase) {
            return { type: "class", parts: parts, inverted: inverted, ignoreCase: ignoreCase };
        }
        function peg$anyExpectation() {
            return { type: "any" };
        }
        function peg$endExpectation() {
            return { type: "end" };
        }
        function peg$otherExpectation(description) {
            return { type: "other", description: description };
        }
        function peg$computePosDetails(pos) {
            var details = peg$posDetailsCache[pos];
            var p;
            if (details) {
                return details;
            }
            else {
                p = pos - 1;
                while (!peg$posDetailsCache[p]) {
                    p--;
                }
                details = peg$posDetailsCache[p];
                details = {
                    line: details.line,
                    column: details.column
                };
                while (p < pos) {
                    if (input.charCodeAt(p) === 10) {
                        details.line++;
                        details.column = 1;
                    }
                    else {
                        details.column++;
                    }
                    p++;
                }
                peg$posDetailsCache[pos] = details;
                return details;
            }
        }
        function peg$computeLocation(startPos, endPos) {
            var startPosDetails = peg$computePosDetails(startPos);
            var endPosDetails = peg$computePosDetails(endPos);
            return {
                start: {
                    offset: startPos,
                    line: startPosDetails.line,
                    column: startPosDetails.column
                },
                end: {
                    offset: endPos,
                    line: endPosDetails.line,
                    column: endPosDetails.column
                }
            };
        }
        function peg$fail(expected1) {
            if (peg$currPos < peg$maxFailPos) {
                return;
            }
            if (peg$currPos > peg$maxFailPos) {
                peg$maxFailPos = peg$currPos;
                peg$maxFailExpected = [];
            }
            peg$maxFailExpected.push(expected1);
        }
        function peg$buildSimpleError(message, location1) {
            return new SyntaxError(message, [], "", location1);
        }
        function peg$buildStructuredError(expected1, found, location1) {
            return new SyntaxError(SyntaxError.buildMessage(expected1, found), expected1, found, location1);
        }
        function peg$parsestart() {
            var s0;
            s0 = peg$parsemessage();
            return s0;
        }
        function peg$parsemessage() {
            var s0, s1;
            s0 = [];
            s1 = peg$parsemessageElement();
            while (s1 !== peg$FAILED) {
                s0.push(s1);
                s1 = peg$parsemessageElement();
            }
            return s0;
        }
        function peg$parsemessageElement() {
            var s0;
            s0 = peg$parseliteralElement();
            if (s0 === peg$FAILED) {
                s0 = peg$parseargumentElement();
                if (s0 === peg$FAILED) {
                    s0 = peg$parsesimpleFormatElement();
                    if (s0 === peg$FAILED) {
                        s0 = peg$parsepluralElement();
                        if (s0 === peg$FAILED) {
                            s0 = peg$parseselectElement();
                            if (s0 === peg$FAILED) {
                                s0 = peg$parsepoundElement();
                            }
                        }
                    }
                }
            }
            return s0;
        }
        function peg$parsemessageText() {
            var s0, s1, s2;
            s0 = peg$currPos;
            s1 = [];
            s2 = peg$parsedoubleApostrophes();
            if (s2 === peg$FAILED) {
                s2 = peg$parsequotedString();
                if (s2 === peg$FAILED) {
                    s2 = peg$parseunquotedString();
                }
            }
            if (s2 !== peg$FAILED) {
                while (s2 !== peg$FAILED) {
                    s1.push(s2);
                    s2 = peg$parsedoubleApostrophes();
                    if (s2 === peg$FAILED) {
                        s2 = peg$parsequotedString();
                        if (s2 === peg$FAILED) {
                            s2 = peg$parseunquotedString();
                        }
                    }
                }
            }
            else {
                s1 = peg$FAILED;
            }
            if (s1 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c0(s1);
            }
            s0 = s1;
            return s0;
        }
        function peg$parseliteralElement() {
            var s0, s1;
            s0 = peg$currPos;
            s1 = peg$parsemessageText();
            if (s1 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c1(s1);
            }
            s0 = s1;
            return s0;
        }
        function peg$parsepoundElement() {
            var s0, s1;
            s0 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 35) {
                s1 = peg$c2;
                peg$currPos++;
            }
            else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c3);
                }
            }
            if (s1 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c4();
            }
            s0 = s1;
            return s0;
        }
        function peg$parseargumentElement() {
            var s0, s1, s2, s3, s4, s5;
            peg$silentFails++;
            s0 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 123) {
                s1 = peg$c6;
                peg$currPos++;
            }
            else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c7);
                }
            }
            if (s1 !== peg$FAILED) {
                s2 = peg$parse_();
                if (s2 !== peg$FAILED) {
                    s3 = peg$parseargNameOrNumber();
                    if (s3 !== peg$FAILED) {
                        s4 = peg$parse_();
                        if (s4 !== peg$FAILED) {
                            if (input.charCodeAt(peg$currPos) === 125) {
                                s5 = peg$c8;
                                peg$currPos++;
                            }
                            else {
                                s5 = peg$FAILED;
                                if (peg$silentFails === 0) {
                                    peg$fail(peg$c9);
                                }
                            }
                            if (s5 !== peg$FAILED) {
                                peg$savedPos = s0;
                                s1 = peg$c10(s3);
                                s0 = s1;
                            }
                            else {
                                peg$currPos = s0;
                                s0 = peg$FAILED;
                            }
                        }
                        else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                        }
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
            peg$silentFails--;
            if (s0 === peg$FAILED) {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c5);
                }
            }
            return s0;
        }
        function peg$parsenumberSkeletonId() {
            var s0, s1, s2, s3, s4;
            peg$silentFails++;
            s0 = peg$currPos;
            s1 = [];
            s2 = peg$currPos;
            s3 = peg$currPos;
            peg$silentFails++;
            s4 = peg$parsewhiteSpace();
            if (s4 === peg$FAILED) {
                if (peg$c12.test(input.charAt(peg$currPos))) {
                    s4 = input.charAt(peg$currPos);
                    peg$currPos++;
                }
                else {
                    s4 = peg$FAILED;
                    if (peg$silentFails === 0) {
                        peg$fail(peg$c13);
                    }
                }
            }
            peg$silentFails--;
            if (s4 === peg$FAILED) {
                s3 = undefined;
            }
            else {
                peg$currPos = s3;
                s3 = peg$FAILED;
            }
            if (s3 !== peg$FAILED) {
                if (input.length > peg$currPos) {
                    s4 = input.charAt(peg$currPos);
                    peg$currPos++;
                }
                else {
                    s4 = peg$FAILED;
                    if (peg$silentFails === 0) {
                        peg$fail(peg$c14);
                    }
                }
                if (s4 !== peg$FAILED) {
                    s3 = [s3, s4];
                    s2 = s3;
                }
                else {
                    peg$currPos = s2;
                    s2 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s2;
                s2 = peg$FAILED;
            }
            if (s2 !== peg$FAILED) {
                while (s2 !== peg$FAILED) {
                    s1.push(s2);
                    s2 = peg$currPos;
                    s3 = peg$currPos;
                    peg$silentFails++;
                    s4 = peg$parsewhiteSpace();
                    if (s4 === peg$FAILED) {
                        if (peg$c12.test(input.charAt(peg$currPos))) {
                            s4 = input.charAt(peg$currPos);
                            peg$currPos++;
                        }
                        else {
                            s4 = peg$FAILED;
                            if (peg$silentFails === 0) {
                                peg$fail(peg$c13);
                            }
                        }
                    }
                    peg$silentFails--;
                    if (s4 === peg$FAILED) {
                        s3 = undefined;
                    }
                    else {
                        peg$currPos = s3;
                        s3 = peg$FAILED;
                    }
                    if (s3 !== peg$FAILED) {
                        if (input.length > peg$currPos) {
                            s4 = input.charAt(peg$currPos);
                            peg$currPos++;
                        }
                        else {
                            s4 = peg$FAILED;
                            if (peg$silentFails === 0) {
                                peg$fail(peg$c14);
                            }
                        }
                        if (s4 !== peg$FAILED) {
                            s3 = [s3, s4];
                            s2 = s3;
                        }
                        else {
                            peg$currPos = s2;
                            s2 = peg$FAILED;
                        }
                    }
                    else {
                        peg$currPos = s2;
                        s2 = peg$FAILED;
                    }
                }
            }
            else {
                s1 = peg$FAILED;
            }
            if (s1 !== peg$FAILED) {
                s0 = input.substring(s0, peg$currPos);
            }
            else {
                s0 = s1;
            }
            peg$silentFails--;
            if (s0 === peg$FAILED) {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c11);
                }
            }
            return s0;
        }
        function peg$parsenumberSkeletonTokenOption() {
            var s0, s1, s2;
            peg$silentFails++;
            s0 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 47) {
                s1 = peg$c16;
                peg$currPos++;
            }
            else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c17);
                }
            }
            if (s1 !== peg$FAILED) {
                s2 = peg$parsenumberSkeletonId();
                if (s2 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c18(s2);
                    s0 = s1;
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
            peg$silentFails--;
            if (s0 === peg$FAILED) {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c15);
                }
            }
            return s0;
        }
        function peg$parsenumberSkeletonToken() {
            var s0, s1, s2, s3, s4;
            peg$silentFails++;
            s0 = peg$currPos;
            s1 = peg$parse_();
            if (s1 !== peg$FAILED) {
                s2 = peg$parsenumberSkeletonId();
                if (s2 !== peg$FAILED) {
                    s3 = [];
                    s4 = peg$parsenumberSkeletonTokenOption();
                    while (s4 !== peg$FAILED) {
                        s3.push(s4);
                        s4 = peg$parsenumberSkeletonTokenOption();
                    }
                    if (s3 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s1 = peg$c20(s2, s3);
                        s0 = s1;
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
            peg$silentFails--;
            if (s0 === peg$FAILED) {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c19);
                }
            }
            return s0;
        }
        function peg$parsenumberSkeleton() {
            var s0, s1, s2;
            s0 = peg$currPos;
            s1 = [];
            s2 = peg$parsenumberSkeletonToken();
            if (s2 !== peg$FAILED) {
                while (s2 !== peg$FAILED) {
                    s1.push(s2);
                    s2 = peg$parsenumberSkeletonToken();
                }
            }
            else {
                s1 = peg$FAILED;
            }
            if (s1 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c21(s1);
            }
            s0 = s1;
            return s0;
        }
        function peg$parsenumberArgStyle() {
            var s0, s1, s2;
            s0 = peg$currPos;
            if (input.substr(peg$currPos, 2) === peg$c22) {
                s1 = peg$c22;
                peg$currPos += 2;
            }
            else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c23);
                }
            }
            if (s1 !== peg$FAILED) {
                s2 = peg$parsenumberSkeleton();
                if (s2 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c24(s2);
                    s0 = s1;
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
            if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                peg$savedPos = peg$currPos;
                s1 = peg$c25();
                if (s1) {
                    s1 = undefined;
                }
                else {
                    s1 = peg$FAILED;
                }
                if (s1 !== peg$FAILED) {
                    s2 = peg$parsemessageText();
                    if (s2 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s1 = peg$c26(s2);
                        s0 = s1;
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            return s0;
        }
        function peg$parsenumberFormatElement() {
            var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12;
            s0 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 123) {
                s1 = peg$c6;
                peg$currPos++;
            }
            else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c7);
                }
            }
            if (s1 !== peg$FAILED) {
                s2 = peg$parse_();
                if (s2 !== peg$FAILED) {
                    s3 = peg$parseargNameOrNumber();
                    if (s3 !== peg$FAILED) {
                        s4 = peg$parse_();
                        if (s4 !== peg$FAILED) {
                            if (input.charCodeAt(peg$currPos) === 44) {
                                s5 = peg$c27;
                                peg$currPos++;
                            }
                            else {
                                s5 = peg$FAILED;
                                if (peg$silentFails === 0) {
                                    peg$fail(peg$c28);
                                }
                            }
                            if (s5 !== peg$FAILED) {
                                s6 = peg$parse_();
                                if (s6 !== peg$FAILED) {
                                    if (input.substr(peg$currPos, 6) === peg$c29) {
                                        s7 = peg$c29;
                                        peg$currPos += 6;
                                    }
                                    else {
                                        s7 = peg$FAILED;
                                        if (peg$silentFails === 0) {
                                            peg$fail(peg$c30);
                                        }
                                    }
                                    if (s7 !== peg$FAILED) {
                                        s8 = peg$parse_();
                                        if (s8 !== peg$FAILED) {
                                            s9 = peg$currPos;
                                            if (input.charCodeAt(peg$currPos) === 44) {
                                                s10 = peg$c27;
                                                peg$currPos++;
                                            }
                                            else {
                                                s10 = peg$FAILED;
                                                if (peg$silentFails === 0) {
                                                    peg$fail(peg$c28);
                                                }
                                            }
                                            if (s10 !== peg$FAILED) {
                                                s11 = peg$parse_();
                                                if (s11 !== peg$FAILED) {
                                                    s12 = peg$parsenumberArgStyle();
                                                    if (s12 !== peg$FAILED) {
                                                        s10 = [s10, s11, s12];
                                                        s9 = s10;
                                                    }
                                                    else {
                                                        peg$currPos = s9;
                                                        s9 = peg$FAILED;
                                                    }
                                                }
                                                else {
                                                    peg$currPos = s9;
                                                    s9 = peg$FAILED;
                                                }
                                            }
                                            else {
                                                peg$currPos = s9;
                                                s9 = peg$FAILED;
                                            }
                                            if (s9 === peg$FAILED) {
                                                s9 = null;
                                            }
                                            if (s9 !== peg$FAILED) {
                                                s10 = peg$parse_();
                                                if (s10 !== peg$FAILED) {
                                                    if (input.charCodeAt(peg$currPos) === 125) {
                                                        s11 = peg$c8;
                                                        peg$currPos++;
                                                    }
                                                    else {
                                                        s11 = peg$FAILED;
                                                        if (peg$silentFails === 0) {
                                                            peg$fail(peg$c9);
                                                        }
                                                    }
                                                    if (s11 !== peg$FAILED) {
                                                        peg$savedPos = s0;
                                                        s1 = peg$c31(s3, s7, s9);
                                                        s0 = s1;
                                                    }
                                                    else {
                                                        peg$currPos = s0;
                                                        s0 = peg$FAILED;
                                                    }
                                                }
                                                else {
                                                    peg$currPos = s0;
                                                    s0 = peg$FAILED;
                                                }
                                            }
                                            else {
                                                peg$currPos = s0;
                                                s0 = peg$FAILED;
                                            }
                                        }
                                        else {
                                            peg$currPos = s0;
                                            s0 = peg$FAILED;
                                        }
                                    }
                                    else {
                                        peg$currPos = s0;
                                        s0 = peg$FAILED;
                                    }
                                }
                                else {
                                    peg$currPos = s0;
                                    s0 = peg$FAILED;
                                }
                            }
                            else {
                                peg$currPos = s0;
                                s0 = peg$FAILED;
                            }
                        }
                        else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                        }
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
            return s0;
        }
        function peg$parsedateTimeSkeletonLiteral() {
            var s0, s1, s2, s3;
            s0 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 39) {
                s1 = peg$c32;
                peg$currPos++;
            }
            else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c33);
                }
            }
            if (s1 !== peg$FAILED) {
                s2 = [];
                s3 = peg$parsedoubleApostrophes();
                if (s3 === peg$FAILED) {
                    if (peg$c34.test(input.charAt(peg$currPos))) {
                        s3 = input.charAt(peg$currPos);
                        peg$currPos++;
                    }
                    else {
                        s3 = peg$FAILED;
                        if (peg$silentFails === 0) {
                            peg$fail(peg$c35);
                        }
                    }
                }
                if (s3 !== peg$FAILED) {
                    while (s3 !== peg$FAILED) {
                        s2.push(s3);
                        s3 = peg$parsedoubleApostrophes();
                        if (s3 === peg$FAILED) {
                            if (peg$c34.test(input.charAt(peg$currPos))) {
                                s3 = input.charAt(peg$currPos);
                                peg$currPos++;
                            }
                            else {
                                s3 = peg$FAILED;
                                if (peg$silentFails === 0) {
                                    peg$fail(peg$c35);
                                }
                            }
                        }
                    }
                }
                else {
                    s2 = peg$FAILED;
                }
                if (s2 !== peg$FAILED) {
                    if (input.charCodeAt(peg$currPos) === 39) {
                        s3 = peg$c32;
                        peg$currPos++;
                    }
                    else {
                        s3 = peg$FAILED;
                        if (peg$silentFails === 0) {
                            peg$fail(peg$c33);
                        }
                    }
                    if (s3 !== peg$FAILED) {
                        s1 = [s1, s2, s3];
                        s0 = s1;
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
            if (s0 === peg$FAILED) {
                s0 = [];
                s1 = peg$parsedoubleApostrophes();
                if (s1 === peg$FAILED) {
                    if (peg$c36.test(input.charAt(peg$currPos))) {
                        s1 = input.charAt(peg$currPos);
                        peg$currPos++;
                    }
                    else {
                        s1 = peg$FAILED;
                        if (peg$silentFails === 0) {
                            peg$fail(peg$c37);
                        }
                    }
                }
                if (s1 !== peg$FAILED) {
                    while (s1 !== peg$FAILED) {
                        s0.push(s1);
                        s1 = peg$parsedoubleApostrophes();
                        if (s1 === peg$FAILED) {
                            if (peg$c36.test(input.charAt(peg$currPos))) {
                                s1 = input.charAt(peg$currPos);
                                peg$currPos++;
                            }
                            else {
                                s1 = peg$FAILED;
                                if (peg$silentFails === 0) {
                                    peg$fail(peg$c37);
                                }
                            }
                        }
                    }
                }
                else {
                    s0 = peg$FAILED;
                }
            }
            return s0;
        }
        function peg$parsedateTimeSkeletonPattern() {
            var s0, s1;
            s0 = [];
            if (peg$c38.test(input.charAt(peg$currPos))) {
                s1 = input.charAt(peg$currPos);
                peg$currPos++;
            }
            else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c39);
                }
            }
            if (s1 !== peg$FAILED) {
                while (s1 !== peg$FAILED) {
                    s0.push(s1);
                    if (peg$c38.test(input.charAt(peg$currPos))) {
                        s1 = input.charAt(peg$currPos);
                        peg$currPos++;
                    }
                    else {
                        s1 = peg$FAILED;
                        if (peg$silentFails === 0) {
                            peg$fail(peg$c39);
                        }
                    }
                }
            }
            else {
                s0 = peg$FAILED;
            }
            return s0;
        }
        function peg$parsedateTimeSkeleton() {
            var s0, s1, s2, s3;
            s0 = peg$currPos;
            s1 = peg$currPos;
            s2 = [];
            s3 = peg$parsedateTimeSkeletonLiteral();
            if (s3 === peg$FAILED) {
                s3 = peg$parsedateTimeSkeletonPattern();
            }
            if (s3 !== peg$FAILED) {
                while (s3 !== peg$FAILED) {
                    s2.push(s3);
                    s3 = peg$parsedateTimeSkeletonLiteral();
                    if (s3 === peg$FAILED) {
                        s3 = peg$parsedateTimeSkeletonPattern();
                    }
                }
            }
            else {
                s2 = peg$FAILED;
            }
            if (s2 !== peg$FAILED) {
                s1 = input.substring(s1, peg$currPos);
            }
            else {
                s1 = s2;
            }
            if (s1 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c40(s1);
            }
            s0 = s1;
            return s0;
        }
        function peg$parsedateOrTimeArgStyle() {
            var s0, s1, s2;
            s0 = peg$currPos;
            if (input.substr(peg$currPos, 2) === peg$c22) {
                s1 = peg$c22;
                peg$currPos += 2;
            }
            else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c23);
                }
            }
            if (s1 !== peg$FAILED) {
                s2 = peg$parsedateTimeSkeleton();
                if (s2 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c24(s2);
                    s0 = s1;
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
            if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                peg$savedPos = peg$currPos;
                s1 = peg$c41();
                if (s1) {
                    s1 = undefined;
                }
                else {
                    s1 = peg$FAILED;
                }
                if (s1 !== peg$FAILED) {
                    s2 = peg$parsemessageText();
                    if (s2 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s1 = peg$c26(s2);
                        s0 = s1;
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            return s0;
        }
        function peg$parsedateOrTimeFormatElement() {
            var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12;
            s0 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 123) {
                s1 = peg$c6;
                peg$currPos++;
            }
            else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c7);
                }
            }
            if (s1 !== peg$FAILED) {
                s2 = peg$parse_();
                if (s2 !== peg$FAILED) {
                    s3 = peg$parseargNameOrNumber();
                    if (s3 !== peg$FAILED) {
                        s4 = peg$parse_();
                        if (s4 !== peg$FAILED) {
                            if (input.charCodeAt(peg$currPos) === 44) {
                                s5 = peg$c27;
                                peg$currPos++;
                            }
                            else {
                                s5 = peg$FAILED;
                                if (peg$silentFails === 0) {
                                    peg$fail(peg$c28);
                                }
                            }
                            if (s5 !== peg$FAILED) {
                                s6 = peg$parse_();
                                if (s6 !== peg$FAILED) {
                                    if (input.substr(peg$currPos, 4) === peg$c42) {
                                        s7 = peg$c42;
                                        peg$currPos += 4;
                                    }
                                    else {
                                        s7 = peg$FAILED;
                                        if (peg$silentFails === 0) {
                                            peg$fail(peg$c43);
                                        }
                                    }
                                    if (s7 === peg$FAILED) {
                                        if (input.substr(peg$currPos, 4) === peg$c44) {
                                            s7 = peg$c44;
                                            peg$currPos += 4;
                                        }
                                        else {
                                            s7 = peg$FAILED;
                                            if (peg$silentFails === 0) {
                                                peg$fail(peg$c45);
                                            }
                                        }
                                    }
                                    if (s7 !== peg$FAILED) {
                                        s8 = peg$parse_();
                                        if (s8 !== peg$FAILED) {
                                            s9 = peg$currPos;
                                            if (input.charCodeAt(peg$currPos) === 44) {
                                                s10 = peg$c27;
                                                peg$currPos++;
                                            }
                                            else {
                                                s10 = peg$FAILED;
                                                if (peg$silentFails === 0) {
                                                    peg$fail(peg$c28);
                                                }
                                            }
                                            if (s10 !== peg$FAILED) {
                                                s11 = peg$parse_();
                                                if (s11 !== peg$FAILED) {
                                                    s12 = peg$parsedateOrTimeArgStyle();
                                                    if (s12 !== peg$FAILED) {
                                                        s10 = [s10, s11, s12];
                                                        s9 = s10;
                                                    }
                                                    else {
                                                        peg$currPos = s9;
                                                        s9 = peg$FAILED;
                                                    }
                                                }
                                                else {
                                                    peg$currPos = s9;
                                                    s9 = peg$FAILED;
                                                }
                                            }
                                            else {
                                                peg$currPos = s9;
                                                s9 = peg$FAILED;
                                            }
                                            if (s9 === peg$FAILED) {
                                                s9 = null;
                                            }
                                            if (s9 !== peg$FAILED) {
                                                s10 = peg$parse_();
                                                if (s10 !== peg$FAILED) {
                                                    if (input.charCodeAt(peg$currPos) === 125) {
                                                        s11 = peg$c8;
                                                        peg$currPos++;
                                                    }
                                                    else {
                                                        s11 = peg$FAILED;
                                                        if (peg$silentFails === 0) {
                                                            peg$fail(peg$c9);
                                                        }
                                                    }
                                                    if (s11 !== peg$FAILED) {
                                                        peg$savedPos = s0;
                                                        s1 = peg$c31(s3, s7, s9);
                                                        s0 = s1;
                                                    }
                                                    else {
                                                        peg$currPos = s0;
                                                        s0 = peg$FAILED;
                                                    }
                                                }
                                                else {
                                                    peg$currPos = s0;
                                                    s0 = peg$FAILED;
                                                }
                                            }
                                            else {
                                                peg$currPos = s0;
                                                s0 = peg$FAILED;
                                            }
                                        }
                                        else {
                                            peg$currPos = s0;
                                            s0 = peg$FAILED;
                                        }
                                    }
                                    else {
                                        peg$currPos = s0;
                                        s0 = peg$FAILED;
                                    }
                                }
                                else {
                                    peg$currPos = s0;
                                    s0 = peg$FAILED;
                                }
                            }
                            else {
                                peg$currPos = s0;
                                s0 = peg$FAILED;
                            }
                        }
                        else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                        }
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
            return s0;
        }
        function peg$parsesimpleFormatElement() {
            var s0;
            s0 = peg$parsenumberFormatElement();
            if (s0 === peg$FAILED) {
                s0 = peg$parsedateOrTimeFormatElement();
            }
            return s0;
        }
        function peg$parsepluralElement() {
            var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15;
            s0 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 123) {
                s1 = peg$c6;
                peg$currPos++;
            }
            else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c7);
                }
            }
            if (s1 !== peg$FAILED) {
                s2 = peg$parse_();
                if (s2 !== peg$FAILED) {
                    s3 = peg$parseargNameOrNumber();
                    if (s3 !== peg$FAILED) {
                        s4 = peg$parse_();
                        if (s4 !== peg$FAILED) {
                            if (input.charCodeAt(peg$currPos) === 44) {
                                s5 = peg$c27;
                                peg$currPos++;
                            }
                            else {
                                s5 = peg$FAILED;
                                if (peg$silentFails === 0) {
                                    peg$fail(peg$c28);
                                }
                            }
                            if (s5 !== peg$FAILED) {
                                s6 = peg$parse_();
                                if (s6 !== peg$FAILED) {
                                    if (input.substr(peg$currPos, 6) === peg$c46) {
                                        s7 = peg$c46;
                                        peg$currPos += 6;
                                    }
                                    else {
                                        s7 = peg$FAILED;
                                        if (peg$silentFails === 0) {
                                            peg$fail(peg$c47);
                                        }
                                    }
                                    if (s7 === peg$FAILED) {
                                        if (input.substr(peg$currPos, 13) === peg$c48) {
                                            s7 = peg$c48;
                                            peg$currPos += 13;
                                        }
                                        else {
                                            s7 = peg$FAILED;
                                            if (peg$silentFails === 0) {
                                                peg$fail(peg$c49);
                                            }
                                        }
                                    }
                                    if (s7 !== peg$FAILED) {
                                        s8 = peg$parse_();
                                        if (s8 !== peg$FAILED) {
                                            if (input.charCodeAt(peg$currPos) === 44) {
                                                s9 = peg$c27;
                                                peg$currPos++;
                                            }
                                            else {
                                                s9 = peg$FAILED;
                                                if (peg$silentFails === 0) {
                                                    peg$fail(peg$c28);
                                                }
                                            }
                                            if (s9 !== peg$FAILED) {
                                                s10 = peg$parse_();
                                                if (s10 !== peg$FAILED) {
                                                    s11 = peg$currPos;
                                                    if (input.substr(peg$currPos, 7) === peg$c50) {
                                                        s12 = peg$c50;
                                                        peg$currPos += 7;
                                                    }
                                                    else {
                                                        s12 = peg$FAILED;
                                                        if (peg$silentFails === 0) {
                                                            peg$fail(peg$c51);
                                                        }
                                                    }
                                                    if (s12 !== peg$FAILED) {
                                                        s13 = peg$parse_();
                                                        if (s13 !== peg$FAILED) {
                                                            s14 = peg$parsenumber();
                                                            if (s14 !== peg$FAILED) {
                                                                s12 = [s12, s13, s14];
                                                                s11 = s12;
                                                            }
                                                            else {
                                                                peg$currPos = s11;
                                                                s11 = peg$FAILED;
                                                            }
                                                        }
                                                        else {
                                                            peg$currPos = s11;
                                                            s11 = peg$FAILED;
                                                        }
                                                    }
                                                    else {
                                                        peg$currPos = s11;
                                                        s11 = peg$FAILED;
                                                    }
                                                    if (s11 === peg$FAILED) {
                                                        s11 = null;
                                                    }
                                                    if (s11 !== peg$FAILED) {
                                                        s12 = peg$parse_();
                                                        if (s12 !== peg$FAILED) {
                                                            s13 = [];
                                                            s14 = peg$parsepluralOption();
                                                            if (s14 !== peg$FAILED) {
                                                                while (s14 !== peg$FAILED) {
                                                                    s13.push(s14);
                                                                    s14 = peg$parsepluralOption();
                                                                }
                                                            }
                                                            else {
                                                                s13 = peg$FAILED;
                                                            }
                                                            if (s13 !== peg$FAILED) {
                                                                s14 = peg$parse_();
                                                                if (s14 !== peg$FAILED) {
                                                                    if (input.charCodeAt(peg$currPos) === 125) {
                                                                        s15 = peg$c8;
                                                                        peg$currPos++;
                                                                    }
                                                                    else {
                                                                        s15 = peg$FAILED;
                                                                        if (peg$silentFails === 0) {
                                                                            peg$fail(peg$c9);
                                                                        }
                                                                    }
                                                                    if (s15 !== peg$FAILED) {
                                                                        peg$savedPos = s0;
                                                                        s1 = peg$c52(s3, s7, s11, s13);
                                                                        s0 = s1;
                                                                    }
                                                                    else {
                                                                        peg$currPos = s0;
                                                                        s0 = peg$FAILED;
                                                                    }
                                                                }
                                                                else {
                                                                    peg$currPos = s0;
                                                                    s0 = peg$FAILED;
                                                                }
                                                            }
                                                            else {
                                                                peg$currPos = s0;
                                                                s0 = peg$FAILED;
                                                            }
                                                        }
                                                        else {
                                                            peg$currPos = s0;
                                                            s0 = peg$FAILED;
                                                        }
                                                    }
                                                    else {
                                                        peg$currPos = s0;
                                                        s0 = peg$FAILED;
                                                    }
                                                }
                                                else {
                                                    peg$currPos = s0;
                                                    s0 = peg$FAILED;
                                                }
                                            }
                                            else {
                                                peg$currPos = s0;
                                                s0 = peg$FAILED;
                                            }
                                        }
                                        else {
                                            peg$currPos = s0;
                                            s0 = peg$FAILED;
                                        }
                                    }
                                    else {
                                        peg$currPos = s0;
                                        s0 = peg$FAILED;
                                    }
                                }
                                else {
                                    peg$currPos = s0;
                                    s0 = peg$FAILED;
                                }
                            }
                            else {
                                peg$currPos = s0;
                                s0 = peg$FAILED;
                            }
                        }
                        else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                        }
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
            return s0;
        }
        function peg$parseselectElement() {
            var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13;
            s0 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 123) {
                s1 = peg$c6;
                peg$currPos++;
            }
            else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c7);
                }
            }
            if (s1 !== peg$FAILED) {
                s2 = peg$parse_();
                if (s2 !== peg$FAILED) {
                    s3 = peg$parseargNameOrNumber();
                    if (s3 !== peg$FAILED) {
                        s4 = peg$parse_();
                        if (s4 !== peg$FAILED) {
                            if (input.charCodeAt(peg$currPos) === 44) {
                                s5 = peg$c27;
                                peg$currPos++;
                            }
                            else {
                                s5 = peg$FAILED;
                                if (peg$silentFails === 0) {
                                    peg$fail(peg$c28);
                                }
                            }
                            if (s5 !== peg$FAILED) {
                                s6 = peg$parse_();
                                if (s6 !== peg$FAILED) {
                                    if (input.substr(peg$currPos, 6) === peg$c53) {
                                        s7 = peg$c53;
                                        peg$currPos += 6;
                                    }
                                    else {
                                        s7 = peg$FAILED;
                                        if (peg$silentFails === 0) {
                                            peg$fail(peg$c54);
                                        }
                                    }
                                    if (s7 !== peg$FAILED) {
                                        s8 = peg$parse_();
                                        if (s8 !== peg$FAILED) {
                                            if (input.charCodeAt(peg$currPos) === 44) {
                                                s9 = peg$c27;
                                                peg$currPos++;
                                            }
                                            else {
                                                s9 = peg$FAILED;
                                                if (peg$silentFails === 0) {
                                                    peg$fail(peg$c28);
                                                }
                                            }
                                            if (s9 !== peg$FAILED) {
                                                s10 = peg$parse_();
                                                if (s10 !== peg$FAILED) {
                                                    s11 = [];
                                                    s12 = peg$parseselectOption();
                                                    if (s12 !== peg$FAILED) {
                                                        while (s12 !== peg$FAILED) {
                                                            s11.push(s12);
                                                            s12 = peg$parseselectOption();
                                                        }
                                                    }
                                                    else {
                                                        s11 = peg$FAILED;
                                                    }
                                                    if (s11 !== peg$FAILED) {
                                                        s12 = peg$parse_();
                                                        if (s12 !== peg$FAILED) {
                                                            if (input.charCodeAt(peg$currPos) === 125) {
                                                                s13 = peg$c8;
                                                                peg$currPos++;
                                                            }
                                                            else {
                                                                s13 = peg$FAILED;
                                                                if (peg$silentFails === 0) {
                                                                    peg$fail(peg$c9);
                                                                }
                                                            }
                                                            if (s13 !== peg$FAILED) {
                                                                peg$savedPos = s0;
                                                                s1 = peg$c55(s3, s11);
                                                                s0 = s1;
                                                            }
                                                            else {
                                                                peg$currPos = s0;
                                                                s0 = peg$FAILED;
                                                            }
                                                        }
                                                        else {
                                                            peg$currPos = s0;
                                                            s0 = peg$FAILED;
                                                        }
                                                    }
                                                    else {
                                                        peg$currPos = s0;
                                                        s0 = peg$FAILED;
                                                    }
                                                }
                                                else {
                                                    peg$currPos = s0;
                                                    s0 = peg$FAILED;
                                                }
                                            }
                                            else {
                                                peg$currPos = s0;
                                                s0 = peg$FAILED;
                                            }
                                        }
                                        else {
                                            peg$currPos = s0;
                                            s0 = peg$FAILED;
                                        }
                                    }
                                    else {
                                        peg$currPos = s0;
                                        s0 = peg$FAILED;
                                    }
                                }
                                else {
                                    peg$currPos = s0;
                                    s0 = peg$FAILED;
                                }
                            }
                            else {
                                peg$currPos = s0;
                                s0 = peg$FAILED;
                            }
                        }
                        else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                        }
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
            return s0;
        }
        function peg$parsepluralRuleSelectValue() {
            var s0, s1, s2, s3;
            s0 = peg$currPos;
            s1 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 61) {
                s2 = peg$c56;
                peg$currPos++;
            }
            else {
                s2 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c57);
                }
            }
            if (s2 !== peg$FAILED) {
                s3 = peg$parsenumber();
                if (s3 !== peg$FAILED) {
                    s2 = [s2, s3];
                    s1 = s2;
                }
                else {
                    peg$currPos = s1;
                    s1 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s1;
                s1 = peg$FAILED;
            }
            if (s1 !== peg$FAILED) {
                s0 = input.substring(s0, peg$currPos);
            }
            else {
                s0 = s1;
            }
            if (s0 === peg$FAILED) {
                s0 = peg$parseargName();
            }
            return s0;
        }
        function peg$parseselectOption() {
            var s0, s1, s2, s3, s4, s5, s6, s7;
            s0 = peg$currPos;
            s1 = peg$parse_();
            if (s1 !== peg$FAILED) {
                s2 = peg$parseargName();
                if (s2 !== peg$FAILED) {
                    s3 = peg$parse_();
                    if (s3 !== peg$FAILED) {
                        if (input.charCodeAt(peg$currPos) === 123) {
                            s4 = peg$c6;
                            peg$currPos++;
                        }
                        else {
                            s4 = peg$FAILED;
                            if (peg$silentFails === 0) {
                                peg$fail(peg$c7);
                            }
                        }
                        if (s4 !== peg$FAILED) {
                            peg$savedPos = peg$currPos;
                            s5 = peg$c58();
                            if (s5) {
                                s5 = undefined;
                            }
                            else {
                                s5 = peg$FAILED;
                            }
                            if (s5 !== peg$FAILED) {
                                s6 = peg$parsemessage();
                                if (s6 !== peg$FAILED) {
                                    if (input.charCodeAt(peg$currPos) === 125) {
                                        s7 = peg$c8;
                                        peg$currPos++;
                                    }
                                    else {
                                        s7 = peg$FAILED;
                                        if (peg$silentFails === 0) {
                                            peg$fail(peg$c9);
                                        }
                                    }
                                    if (s7 !== peg$FAILED) {
                                        peg$savedPos = s0;
                                        s1 = peg$c59(s2, s6);
                                        s0 = s1;
                                    }
                                    else {
                                        peg$currPos = s0;
                                        s0 = peg$FAILED;
                                    }
                                }
                                else {
                                    peg$currPos = s0;
                                    s0 = peg$FAILED;
                                }
                            }
                            else {
                                peg$currPos = s0;
                                s0 = peg$FAILED;
                            }
                        }
                        else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                        }
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
            return s0;
        }
        function peg$parsepluralOption() {
            var s0, s1, s2, s3, s4, s5, s6, s7;
            s0 = peg$currPos;
            s1 = peg$parse_();
            if (s1 !== peg$FAILED) {
                s2 = peg$parsepluralRuleSelectValue();
                if (s2 !== peg$FAILED) {
                    s3 = peg$parse_();
                    if (s3 !== peg$FAILED) {
                        if (input.charCodeAt(peg$currPos) === 123) {
                            s4 = peg$c6;
                            peg$currPos++;
                        }
                        else {
                            s4 = peg$FAILED;
                            if (peg$silentFails === 0) {
                                peg$fail(peg$c7);
                            }
                        }
                        if (s4 !== peg$FAILED) {
                            peg$savedPos = peg$currPos;
                            s5 = peg$c60();
                            if (s5) {
                                s5 = undefined;
                            }
                            else {
                                s5 = peg$FAILED;
                            }
                            if (s5 !== peg$FAILED) {
                                s6 = peg$parsemessage();
                                if (s6 !== peg$FAILED) {
                                    if (input.charCodeAt(peg$currPos) === 125) {
                                        s7 = peg$c8;
                                        peg$currPos++;
                                    }
                                    else {
                                        s7 = peg$FAILED;
                                        if (peg$silentFails === 0) {
                                            peg$fail(peg$c9);
                                        }
                                    }
                                    if (s7 !== peg$FAILED) {
                                        peg$savedPos = s0;
                                        s1 = peg$c61(s2, s6);
                                        s0 = s1;
                                    }
                                    else {
                                        peg$currPos = s0;
                                        s0 = peg$FAILED;
                                    }
                                }
                                else {
                                    peg$currPos = s0;
                                    s0 = peg$FAILED;
                                }
                            }
                            else {
                                peg$currPos = s0;
                                s0 = peg$FAILED;
                            }
                        }
                        else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                        }
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
            return s0;
        }
        function peg$parsewhiteSpace() {
            var s0;
            peg$silentFails++;
            if (peg$c63.test(input.charAt(peg$currPos))) {
                s0 = input.charAt(peg$currPos);
                peg$currPos++;
            }
            else {
                s0 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c64);
                }
            }
            peg$silentFails--;
            if (s0 === peg$FAILED) {
                if (peg$silentFails === 0) {
                    peg$fail(peg$c62);
                }
            }
            return s0;
        }
        function peg$parsepatternSyntax() {
            var s0;
            peg$silentFails++;
            if (peg$c66.test(input.charAt(peg$currPos))) {
                s0 = input.charAt(peg$currPos);
                peg$currPos++;
            }
            else {
                s0 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c67);
                }
            }
            peg$silentFails--;
            if (s0 === peg$FAILED) {
                if (peg$silentFails === 0) {
                    peg$fail(peg$c65);
                }
            }
            return s0;
        }
        function peg$parse_() {
            var s0, s1, s2;
            peg$silentFails++;
            s0 = peg$currPos;
            s1 = [];
            s2 = peg$parsewhiteSpace();
            while (s2 !== peg$FAILED) {
                s1.push(s2);
                s2 = peg$parsewhiteSpace();
            }
            if (s1 !== peg$FAILED) {
                s0 = input.substring(s0, peg$currPos);
            }
            else {
                s0 = s1;
            }
            peg$silentFails--;
            if (s0 === peg$FAILED) {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c68);
                }
            }
            return s0;
        }
        function peg$parsenumber() {
            var s0, s1, s2;
            peg$silentFails++;
            s0 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 45) {
                s1 = peg$c70;
                peg$currPos++;
            }
            else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c71);
                }
            }
            if (s1 === peg$FAILED) {
                s1 = null;
            }
            if (s1 !== peg$FAILED) {
                s2 = peg$parseargNumber();
                if (s2 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c72(s1, s2);
                    s0 = s1;
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
            peg$silentFails--;
            if (s0 === peg$FAILED) {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c69);
                }
            }
            return s0;
        }
        function peg$parsedoubleApostrophes() {
            var s0, s1;
            peg$silentFails++;
            s0 = peg$currPos;
            if (input.substr(peg$currPos, 2) === peg$c75) {
                s1 = peg$c75;
                peg$currPos += 2;
            }
            else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c76);
                }
            }
            if (s1 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c77();
            }
            s0 = s1;
            peg$silentFails--;
            if (s0 === peg$FAILED) {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c74);
                }
            }
            return s0;
        }
        function peg$parsequotedString() {
            var s0, s1, s2, s3, s4, s5;
            s0 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 39) {
                s1 = peg$c32;
                peg$currPos++;
            }
            else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c33);
                }
            }
            if (s1 !== peg$FAILED) {
                s2 = peg$parseescapedChar();
                if (s2 !== peg$FAILED) {
                    s3 = peg$currPos;
                    s4 = [];
                    if (input.substr(peg$currPos, 2) === peg$c75) {
                        s5 = peg$c75;
                        peg$currPos += 2;
                    }
                    else {
                        s5 = peg$FAILED;
                        if (peg$silentFails === 0) {
                            peg$fail(peg$c76);
                        }
                    }
                    if (s5 === peg$FAILED) {
                        if (peg$c34.test(input.charAt(peg$currPos))) {
                            s5 = input.charAt(peg$currPos);
                            peg$currPos++;
                        }
                        else {
                            s5 = peg$FAILED;
                            if (peg$silentFails === 0) {
                                peg$fail(peg$c35);
                            }
                        }
                    }
                    while (s5 !== peg$FAILED) {
                        s4.push(s5);
                        if (input.substr(peg$currPos, 2) === peg$c75) {
                            s5 = peg$c75;
                            peg$currPos += 2;
                        }
                        else {
                            s5 = peg$FAILED;
                            if (peg$silentFails === 0) {
                                peg$fail(peg$c76);
                            }
                        }
                        if (s5 === peg$FAILED) {
                            if (peg$c34.test(input.charAt(peg$currPos))) {
                                s5 = input.charAt(peg$currPos);
                                peg$currPos++;
                            }
                            else {
                                s5 = peg$FAILED;
                                if (peg$silentFails === 0) {
                                    peg$fail(peg$c35);
                                }
                            }
                        }
                    }
                    if (s4 !== peg$FAILED) {
                        s3 = input.substring(s3, peg$currPos);
                    }
                    else {
                        s3 = s4;
                    }
                    if (s3 !== peg$FAILED) {
                        if (input.charCodeAt(peg$currPos) === 39) {
                            s4 = peg$c32;
                            peg$currPos++;
                        }
                        else {
                            s4 = peg$FAILED;
                            if (peg$silentFails === 0) {
                                peg$fail(peg$c33);
                            }
                        }
                        if (s4 === peg$FAILED) {
                            s4 = null;
                        }
                        if (s4 !== peg$FAILED) {
                            peg$savedPos = s0;
                            s1 = peg$c78(s2, s3);
                            s0 = s1;
                        }
                        else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                        }
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
            return s0;
        }
        function peg$parseunquotedString() {
            var s0, s1, s2, s3;
            s0 = peg$currPos;
            s1 = peg$currPos;
            if (input.length > peg$currPos) {
                s2 = input.charAt(peg$currPos);
                peg$currPos++;
            }
            else {
                s2 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c14);
                }
            }
            if (s2 !== peg$FAILED) {
                peg$savedPos = peg$currPos;
                s3 = peg$c79(s2);
                if (s3) {
                    s3 = undefined;
                }
                else {
                    s3 = peg$FAILED;
                }
                if (s3 !== peg$FAILED) {
                    s2 = [s2, s3];
                    s1 = s2;
                }
                else {
                    peg$currPos = s1;
                    s1 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s1;
                s1 = peg$FAILED;
            }
            if (s1 === peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 10) {
                    s1 = peg$c80;
                    peg$currPos++;
                }
                else {
                    s1 = peg$FAILED;
                    if (peg$silentFails === 0) {
                        peg$fail(peg$c81);
                    }
                }
            }
            if (s1 !== peg$FAILED) {
                s0 = input.substring(s0, peg$currPos);
            }
            else {
                s0 = s1;
            }
            return s0;
        }
        function peg$parseescapedChar() {
            var s0, s1, s2, s3;
            s0 = peg$currPos;
            s1 = peg$currPos;
            if (input.length > peg$currPos) {
                s2 = input.charAt(peg$currPos);
                peg$currPos++;
            }
            else {
                s2 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c14);
                }
            }
            if (s2 !== peg$FAILED) {
                peg$savedPos = peg$currPos;
                s3 = peg$c82(s2);
                if (s3) {
                    s3 = undefined;
                }
                else {
                    s3 = peg$FAILED;
                }
                if (s3 !== peg$FAILED) {
                    s2 = [s2, s3];
                    s1 = s2;
                }
                else {
                    peg$currPos = s1;
                    s1 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s1;
                s1 = peg$FAILED;
            }
            if (s1 !== peg$FAILED) {
                s0 = input.substring(s0, peg$currPos);
            }
            else {
                s0 = s1;
            }
            return s0;
        }
        function peg$parseargNameOrNumber() {
            var s0, s1;
            peg$silentFails++;
            s0 = peg$currPos;
            s1 = peg$parseargNumber();
            if (s1 === peg$FAILED) {
                s1 = peg$parseargName();
            }
            if (s1 !== peg$FAILED) {
                s0 = input.substring(s0, peg$currPos);
            }
            else {
                s0 = s1;
            }
            peg$silentFails--;
            if (s0 === peg$FAILED) {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c83);
                }
            }
            return s0;
        }
        function peg$parseargNumber() {
            var s0, s1, s2, s3, s4;
            peg$silentFails++;
            s0 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 48) {
                s1 = peg$c85;
                peg$currPos++;
            }
            else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c86);
                }
            }
            if (s1 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c87();
            }
            s0 = s1;
            if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                s1 = peg$currPos;
                if (peg$c88.test(input.charAt(peg$currPos))) {
                    s2 = input.charAt(peg$currPos);
                    peg$currPos++;
                }
                else {
                    s2 = peg$FAILED;
                    if (peg$silentFails === 0) {
                        peg$fail(peg$c89);
                    }
                }
                if (s2 !== peg$FAILED) {
                    s3 = [];
                    if (peg$c90.test(input.charAt(peg$currPos))) {
                        s4 = input.charAt(peg$currPos);
                        peg$currPos++;
                    }
                    else {
                        s4 = peg$FAILED;
                        if (peg$silentFails === 0) {
                            peg$fail(peg$c91);
                        }
                    }
                    while (s4 !== peg$FAILED) {
                        s3.push(s4);
                        if (peg$c90.test(input.charAt(peg$currPos))) {
                            s4 = input.charAt(peg$currPos);
                            peg$currPos++;
                        }
                        else {
                            s4 = peg$FAILED;
                            if (peg$silentFails === 0) {
                                peg$fail(peg$c91);
                            }
                        }
                    }
                    if (s3 !== peg$FAILED) {
                        s2 = [s2, s3];
                        s1 = s2;
                    }
                    else {
                        peg$currPos = s1;
                        s1 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s1;
                    s1 = peg$FAILED;
                }
                if (s1 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c92(s1);
                }
                s0 = s1;
            }
            peg$silentFails--;
            if (s0 === peg$FAILED) {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c84);
                }
            }
            return s0;
        }
        function peg$parseargName() {
            var s0, s1, s2, s3, s4;
            peg$silentFails++;
            s0 = peg$currPos;
            s1 = [];
            s2 = peg$currPos;
            s3 = peg$currPos;
            peg$silentFails++;
            s4 = peg$parsewhiteSpace();
            if (s4 === peg$FAILED) {
                s4 = peg$parsepatternSyntax();
            }
            peg$silentFails--;
            if (s4 === peg$FAILED) {
                s3 = undefined;
            }
            else {
                peg$currPos = s3;
                s3 = peg$FAILED;
            }
            if (s3 !== peg$FAILED) {
                if (input.length > peg$currPos) {
                    s4 = input.charAt(peg$currPos);
                    peg$currPos++;
                }
                else {
                    s4 = peg$FAILED;
                    if (peg$silentFails === 0) {
                        peg$fail(peg$c14);
                    }
                }
                if (s4 !== peg$FAILED) {
                    s3 = [s3, s4];
                    s2 = s3;
                }
                else {
                    peg$currPos = s2;
                    s2 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s2;
                s2 = peg$FAILED;
            }
            if (s2 !== peg$FAILED) {
                while (s2 !== peg$FAILED) {
                    s1.push(s2);
                    s2 = peg$currPos;
                    s3 = peg$currPos;
                    peg$silentFails++;
                    s4 = peg$parsewhiteSpace();
                    if (s4 === peg$FAILED) {
                        s4 = peg$parsepatternSyntax();
                    }
                    peg$silentFails--;
                    if (s4 === peg$FAILED) {
                        s3 = undefined;
                    }
                    else {
                        peg$currPos = s3;
                        s3 = peg$FAILED;
                    }
                    if (s3 !== peg$FAILED) {
                        if (input.length > peg$currPos) {
                            s4 = input.charAt(peg$currPos);
                            peg$currPos++;
                        }
                        else {
                            s4 = peg$FAILED;
                            if (peg$silentFails === 0) {
                                peg$fail(peg$c14);
                            }
                        }
                        if (s4 !== peg$FAILED) {
                            s3 = [s3, s4];
                            s2 = s3;
                        }
                        else {
                            peg$currPos = s2;
                            s2 = peg$FAILED;
                        }
                    }
                    else {
                        peg$currPos = s2;
                        s2 = peg$FAILED;
                    }
                }
            }
            else {
                s1 = peg$FAILED;
            }
            if (s1 !== peg$FAILED) {
                s0 = input.substring(s0, peg$currPos);
            }
            else {
                s0 = s1;
            }
            peg$silentFails--;
            if (s0 === peg$FAILED) {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c93);
                }
            }
            return s0;
        }
        var messageCtx = ['root'];
        function isNestedMessageText() {
            return messageCtx.length > 1;
        }
        function isInPluralOption() {
            return messageCtx[messageCtx.length - 1] === 'plural';
        }
        function insertLocation() {
            return options && options.captureLocation ? {
                location: location()
            } : {};
        }
        peg$result = peg$startRuleFunction();
        if (peg$result !== peg$FAILED && peg$currPos === input.length) {
            return peg$result;
        }
        else {
            if (peg$result !== peg$FAILED && peg$currPos < input.length) {
                peg$fail(peg$endExpectation());
            }
            throw peg$buildStructuredError(peg$maxFailExpected, peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null, peg$maxFailPos < input.length
                ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1)
                : peg$computeLocation(peg$maxFailPos, peg$maxFailPos));
        }
    }
    var pegParse = peg$parse;

    var __spreadArrays = (undefined && undefined.__spreadArrays) || function () {
        for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
        for (var r = Array(s), k = 0, i = 0; i < il; i++)
            for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
                r[k] = a[j];
        return r;
    };
    var PLURAL_HASHTAG_REGEX = /(^|[^\\])#/g;
    /**
     * Whether to convert `#` in plural rule options
     * to `{var, number}`
     * @param el AST Element
     * @param pluralStack current plural stack
     */
    function normalizeHashtagInPlural(els) {
        els.forEach(function (el) {
            // If we're encountering a plural el
            if (!isPluralElement(el) && !isSelectElement(el)) {
                return;
            }
            // Go down the options and search for # in any literal element
            Object.keys(el.options).forEach(function (id) {
                var _a;
                var opt = el.options[id];
                // If we got a match, we have to split this
                // and inject a NumberElement in the middle
                var matchingLiteralElIndex = -1;
                var literalEl = undefined;
                for (var i = 0; i < opt.value.length; i++) {
                    var el_1 = opt.value[i];
                    if (isLiteralElement(el_1) && PLURAL_HASHTAG_REGEX.test(el_1.value)) {
                        matchingLiteralElIndex = i;
                        literalEl = el_1;
                        break;
                    }
                }
                if (literalEl) {
                    var newValue = literalEl.value.replace(PLURAL_HASHTAG_REGEX, "$1{" + el.value + ", number}");
                    var newEls = pegParse(newValue);
                    (_a = opt.value).splice.apply(_a, __spreadArrays([matchingLiteralElIndex, 1], newEls));
                }
                normalizeHashtagInPlural(opt.value);
            });
        });
    }

    var __assign$1 = (undefined && undefined.__assign) || function () {
        __assign$1 = Object.assign || function(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                    t[p] = s[p];
            }
            return t;
        };
        return __assign$1.apply(this, arguments);
    };
    /**
     * https://unicode.org/reports/tr35/tr35-dates.html#Date_Field_Symbol_Table
     * Credit: https://github.com/caridy/intl-datetimeformat-pattern/blob/master/index.js
     * with some tweaks
     */
    var DATE_TIME_REGEX = /(?:[Eec]{1,6}|G{1,5}|[Qq]{1,5}|(?:[yYur]+|U{1,5})|[ML]{1,5}|d{1,2}|D{1,3}|F{1}|[abB]{1,5}|[hkHK]{1,2}|w{1,2}|W{1}|m{1,2}|s{1,2}|[zZOvVxX]{1,4})(?=([^']*'[^']*')*[^']*$)/g;
    /**
     * Parse Date time skeleton into Intl.DateTimeFormatOptions
     * Ref: https://unicode.org/reports/tr35/tr35-dates.html#Date_Field_Symbol_Table
     * @public
     * @param skeleton skeleton string
     */
    function parseDateTimeSkeleton(skeleton) {
        var result = {};
        skeleton.replace(DATE_TIME_REGEX, function (match) {
            var len = match.length;
            switch (match[0]) {
                // Era
                case 'G':
                    result.era = len === 4 ? 'long' : len === 5 ? 'narrow' : 'short';
                    break;
                // Year
                case 'y':
                    result.year = len === 2 ? '2-digit' : 'numeric';
                    break;
                case 'Y':
                case 'u':
                case 'U':
                case 'r':
                    throw new RangeError('`Y/u/U/r` (year) patterns are not supported, use `y` instead');
                // Quarter
                case 'q':
                case 'Q':
                    throw new RangeError('`q/Q` (quarter) patterns are not supported');
                // Month
                case 'M':
                case 'L':
                    result.month = ['numeric', '2-digit', 'short', 'long', 'narrow'][len - 1];
                    break;
                // Week
                case 'w':
                case 'W':
                    throw new RangeError('`w/W` (week) patterns are not supported');
                case 'd':
                    result.day = ['numeric', '2-digit'][len - 1];
                    break;
                case 'D':
                case 'F':
                case 'g':
                    throw new RangeError('`D/F/g` (day) patterns are not supported, use `d` instead');
                // Weekday
                case 'E':
                    result.weekday = len === 4 ? 'short' : len === 5 ? 'narrow' : 'short';
                    break;
                case 'e':
                    if (len < 4) {
                        throw new RangeError('`e..eee` (weekday) patterns are not supported');
                    }
                    result.weekday = ['short', 'long', 'narrow', 'short'][len - 4];
                    break;
                case 'c':
                    if (len < 4) {
                        throw new RangeError('`c..ccc` (weekday) patterns are not supported');
                    }
                    result.weekday = ['short', 'long', 'narrow', 'short'][len - 4];
                    break;
                // Period
                case 'a': // AM, PM
                    result.hour12 = true;
                    break;
                case 'b': // am, pm, noon, midnight
                case 'B': // flexible day periods
                    throw new RangeError('`b/B` (period) patterns are not supported, use `a` instead');
                // Hour
                case 'h':
                    result.hourCycle = 'h12';
                    result.hour = ['numeric', '2-digit'][len - 1];
                    break;
                case 'H':
                    result.hourCycle = 'h23';
                    result.hour = ['numeric', '2-digit'][len - 1];
                    break;
                case 'K':
                    result.hourCycle = 'h11';
                    result.hour = ['numeric', '2-digit'][len - 1];
                    break;
                case 'k':
                    result.hourCycle = 'h24';
                    result.hour = ['numeric', '2-digit'][len - 1];
                    break;
                case 'j':
                case 'J':
                case 'C':
                    throw new RangeError('`j/J/C` (hour) patterns are not supported, use `h/H/K/k` instead');
                // Minute
                case 'm':
                    result.minute = ['numeric', '2-digit'][len - 1];
                    break;
                // Second
                case 's':
                    result.second = ['numeric', '2-digit'][len - 1];
                    break;
                case 'S':
                case 'A':
                    throw new RangeError('`S/A` (second) pattenrs are not supported, use `s` instead');
                // Zone
                case 'z': // 1..3, 4: specific non-location format
                    result.timeZoneName = len < 4 ? 'short' : 'long';
                    break;
                case 'Z': // 1..3, 4, 5: The ISO8601 varios formats
                case 'O': // 1, 4: miliseconds in day short, long
                case 'v': // 1, 4: generic non-location format
                case 'V': // 1, 2, 3, 4: time zone ID or city
                case 'X': // 1, 2, 3, 4: The ISO8601 varios formats
                case 'x': // 1, 2, 3, 4: The ISO8601 varios formats
                    throw new RangeError('`Z/O/v/V/X/x` (timeZone) pattenrs are not supported, use `z` instead');
            }
            return '';
        });
        return result;
    }
    function icuUnitToEcma(unit) {
        return unit.replace(/^(.*?)-/, '');
    }
    var FRACTION_PRECISION_REGEX = /^\.(?:(0+)(\+|#+)?)?$/g;
    var SIGNIFICANT_PRECISION_REGEX = /^(@+)?(\+|#+)?$/g;
    function parseSignificantPrecision(str) {
        var result = {};
        str.replace(SIGNIFICANT_PRECISION_REGEX, function (_, g1, g2) {
            // @@@ case
            if (typeof g2 !== 'string') {
                result.minimumSignificantDigits = g1.length;
                result.maximumSignificantDigits = g1.length;
            }
            // @@@+ case
            else if (g2 === '+') {
                result.minimumSignificantDigits = g1.length;
            }
            // .### case
            else if (g1[0] === '#') {
                result.maximumSignificantDigits = g1.length;
            }
            // .@@## or .@@@ case
            else {
                result.minimumSignificantDigits = g1.length;
                result.maximumSignificantDigits =
                    g1.length + (typeof g2 === 'string' ? g2.length : 0);
            }
            return '';
        });
        return result;
    }
    function parseSign(str) {
        switch (str) {
            case 'sign-auto':
                return {
                    signDisplay: 'auto',
                };
            case 'sign-accounting':
                return {
                    currencySign: 'accounting',
                };
            case 'sign-always':
                return {
                    signDisplay: 'always',
                };
            case 'sign-accounting-always':
                return {
                    signDisplay: 'always',
                    currencySign: 'accounting',
                };
            case 'sign-except-zero':
                return {
                    signDisplay: 'exceptZero',
                };
            case 'sign-accounting-except-zero':
                return {
                    signDisplay: 'exceptZero',
                    currencySign: 'accounting',
                };
            case 'sign-never':
                return {
                    signDisplay: 'never',
                };
        }
    }
    function parseNotationOptions(opt) {
        var result = {};
        var signOpts = parseSign(opt);
        if (signOpts) {
            return signOpts;
        }
        return result;
    }
    /**
     * https://github.com/unicode-org/icu/blob/master/docs/userguide/format_parse/numbers/skeletons.md#skeleton-stems-and-options
     */
    function convertNumberSkeletonToNumberFormatOptions(tokens) {
        var result = {};
        for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
            var token = tokens_1[_i];
            switch (token.stem) {
                case 'percent':
                    result.style = 'percent';
                    continue;
                case 'currency':
                    result.style = 'currency';
                    result.currency = token.options[0];
                    continue;
                case 'group-off':
                    result.useGrouping = false;
                    continue;
                case 'precision-integer':
                    result.maximumFractionDigits = 0;
                    continue;
                case 'measure-unit':
                    result.style = 'unit';
                    result.unit = icuUnitToEcma(token.options[0]);
                    continue;
                case 'compact-short':
                    result.notation = 'compact';
                    result.compactDisplay = 'short';
                    continue;
                case 'compact-long':
                    result.notation = 'compact';
                    result.compactDisplay = 'long';
                    continue;
                case 'scientific':
                    result = __assign$1(__assign$1(__assign$1({}, result), { notation: 'scientific' }), token.options.reduce(function (all, opt) { return (__assign$1(__assign$1({}, all), parseNotationOptions(opt))); }, {}));
                    continue;
                case 'engineering':
                    result = __assign$1(__assign$1(__assign$1({}, result), { notation: 'engineering' }), token.options.reduce(function (all, opt) { return (__assign$1(__assign$1({}, all), parseNotationOptions(opt))); }, {}));
                    continue;
                case 'notation-simple':
                    result.notation = 'standard';
                    continue;
                // https://github.com/unicode-org/icu/blob/master/icu4c/source/i18n/unicode/unumberformatter.h
                case 'unit-width-narrow':
                    result.currencyDisplay = 'narrowSymbol';
                    result.unitDisplay = 'narrow';
                    continue;
                case 'unit-width-short':
                    result.currencyDisplay = 'code';
                    result.unitDisplay = 'short';
                    continue;
                case 'unit-width-full-name':
                    result.currencyDisplay = 'name';
                    result.unitDisplay = 'long';
                    continue;
                case 'unit-width-iso-code':
                    result.currencyDisplay = 'symbol';
                    continue;
            }
            // Precision
            // https://github.com/unicode-org/icu/blob/master/docs/userguide/format_parse/numbers/skeletons.md#fraction-precision
            if (FRACTION_PRECISION_REGEX.test(token.stem)) {
                if (token.options.length > 1) {
                    throw new RangeError('Fraction-precision stems only accept a single optional option');
                }
                token.stem.replace(FRACTION_PRECISION_REGEX, function (match, g1, g2) {
                    // precision-integer case
                    if (match === '.') {
                        result.maximumFractionDigits = 0;
                    }
                    // .000+ case
                    else if (g2 === '+') {
                        result.minimumFractionDigits = g2.length;
                    }
                    // .### case
                    else if (g1[0] === '#') {
                        result.maximumFractionDigits = g1.length;
                    }
                    // .00## or .000 case
                    else {
                        result.minimumFractionDigits = g1.length;
                        result.maximumFractionDigits =
                            g1.length + (typeof g2 === 'string' ? g2.length : 0);
                    }
                    return '';
                });
                if (token.options.length) {
                    result = __assign$1(__assign$1({}, result), parseSignificantPrecision(token.options[0]));
                }
                continue;
            }
            if (SIGNIFICANT_PRECISION_REGEX.test(token.stem)) {
                result = __assign$1(__assign$1({}, result), parseSignificantPrecision(token.stem));
                continue;
            }
            var signOpts = parseSign(token.stem);
            if (signOpts) {
                result = __assign$1(__assign$1({}, result), signOpts);
            }
        }
        return result;
    }

    function parse(input, opts) {
        var els = pegParse(input, opts);
        if (!opts || opts.normalizeHashtagInPlural !== false) {
            normalizeHashtagInPlural(els);
        }
        return els;
    }

    /*
    Copyright (c) 2014, Yahoo! Inc. All rights reserved.
    Copyrights licensed under the New BSD License.
    See the accompanying LICENSE file for terms.
    */
    var __spreadArrays$1 = (undefined && undefined.__spreadArrays) || function () {
        for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
        for (var r = Array(s), k = 0, i = 0; i < il; i++)
            for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
                r[k] = a[j];
        return r;
    };
    // -- Utilities ----------------------------------------------------------------
    function getCacheId(inputs) {
        return JSON.stringify(inputs.map(function (input) {
            return input && typeof input === 'object' ? orderedProps(input) : input;
        }));
    }
    function orderedProps(obj) {
        return Object.keys(obj)
            .sort()
            .map(function (k) {
            var _a;
            return (_a = {}, _a[k] = obj[k], _a);
        });
    }
    var memoizeFormatConstructor = function (FormatConstructor, cache) {
        if (cache === void 0) { cache = {}; }
        return function () {
            var _a;
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            var cacheId = getCacheId(args);
            var format = cacheId && cache[cacheId];
            if (!format) {
                format = new ((_a = FormatConstructor).bind.apply(_a, __spreadArrays$1([void 0], args)))();
                if (cacheId) {
                    cache[cacheId] = format;
                }
            }
            return format;
        };
    };

    var __extends$1 = (undefined && undefined.__extends) || (function () {
        var extendStatics = function (d, b) {
            extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
                function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
            return extendStatics(d, b);
        };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    var __spreadArrays$2 = (undefined && undefined.__spreadArrays) || function () {
        for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
        for (var r = Array(s), k = 0, i = 0; i < il; i++)
            for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
                r[k] = a[j];
        return r;
    };
    var FormatError = /** @class */ (function (_super) {
        __extends$1(FormatError, _super);
        function FormatError(msg, variableId) {
            var _this = _super.call(this, msg) || this;
            _this.variableId = variableId;
            return _this;
        }
        return FormatError;
    }(Error));
    function mergeLiteral(parts) {
        if (parts.length < 2) {
            return parts;
        }
        return parts.reduce(function (all, part) {
            var lastPart = all[all.length - 1];
            if (!lastPart ||
                lastPart.type !== 0 /* literal */ ||
                part.type !== 0 /* literal */) {
                all.push(part);
            }
            else {
                lastPart.value += part.value;
            }
            return all;
        }, []);
    }
    // TODO(skeleton): add skeleton support
    function formatToParts(els, locales, formatters, formats, values, currentPluralValue, 
    // For debugging
    originalMessage) {
        // Hot path for straight simple msg translations
        if (els.length === 1 && isLiteralElement(els[0])) {
            return [
                {
                    type: 0 /* literal */,
                    value: els[0].value,
                },
            ];
        }
        var result = [];
        for (var _i = 0, els_1 = els; _i < els_1.length; _i++) {
            var el = els_1[_i];
            // Exit early for string parts.
            if (isLiteralElement(el)) {
                result.push({
                    type: 0 /* literal */,
                    value: el.value,
                });
                continue;
            }
            // TODO: should this part be literal type?
            // Replace `#` in plural rules with the actual numeric value.
            if (isPoundElement(el)) {
                if (typeof currentPluralValue === 'number') {
                    result.push({
                        type: 0 /* literal */,
                        value: formatters.getNumberFormat(locales).format(currentPluralValue),
                    });
                }
                continue;
            }
            var varName = el.value;
            // Enforce that all required values are provided by the caller.
            if (!(values && varName in values)) {
                throw new FormatError("The intl string context variable \"" + varName + "\" was not provided to the string \"" + originalMessage + "\"");
            }
            var value = values[varName];
            if (isArgumentElement(el)) {
                if (!value || typeof value === 'string' || typeof value === 'number') {
                    value =
                        typeof value === 'string' || typeof value === 'number'
                            ? String(value)
                            : '';
                }
                result.push({
                    type: 1 /* argument */,
                    value: value,
                });
                continue;
            }
            // Recursively format plural and select parts' option — which can be a
            // nested pattern structure. The choosing of the option to use is
            // abstracted-by and delegated-to the part helper object.
            if (isDateElement(el)) {
                var style = typeof el.style === 'string' ? formats.date[el.style] : undefined;
                result.push({
                    type: 0 /* literal */,
                    value: formatters
                        .getDateTimeFormat(locales, style)
                        .format(value),
                });
                continue;
            }
            if (isTimeElement(el)) {
                var style = typeof el.style === 'string'
                    ? formats.time[el.style]
                    : isDateTimeSkeleton(el.style)
                        ? parseDateTimeSkeleton(el.style.pattern)
                        : undefined;
                result.push({
                    type: 0 /* literal */,
                    value: formatters
                        .getDateTimeFormat(locales, style)
                        .format(value),
                });
                continue;
            }
            if (isNumberElement(el)) {
                var style = typeof el.style === 'string'
                    ? formats.number[el.style]
                    : isNumberSkeleton(el.style)
                        ? convertNumberSkeletonToNumberFormatOptions(el.style.tokens)
                        : undefined;
                result.push({
                    type: 0 /* literal */,
                    value: formatters
                        .getNumberFormat(locales, style)
                        .format(value),
                });
                continue;
            }
            if (isSelectElement(el)) {
                var opt = el.options[value] || el.options.other;
                if (!opt) {
                    throw new RangeError("Invalid values for \"" + el.value + "\": \"" + value + "\". Options are \"" + Object.keys(el.options).join('", "') + "\"");
                }
                result.push.apply(result, formatToParts(opt.value, locales, formatters, formats, values));
                continue;
            }
            if (isPluralElement(el)) {
                var opt = el.options["=" + value];
                if (!opt) {
                    if (!Intl.PluralRules) {
                        throw new FormatError("Intl.PluralRules is not available in this environment.\nTry polyfilling it using \"@formatjs/intl-pluralrules\"\n");
                    }
                    var rule = formatters
                        .getPluralRules(locales, { type: el.pluralType })
                        .select(value - (el.offset || 0));
                    opt = el.options[rule] || el.options.other;
                }
                if (!opt) {
                    throw new RangeError("Invalid values for \"" + el.value + "\": \"" + value + "\". Options are \"" + Object.keys(el.options).join('", "') + "\"");
                }
                result.push.apply(result, formatToParts(opt.value, locales, formatters, formats, values, value - (el.offset || 0)));
                continue;
            }
        }
        return mergeLiteral(result);
    }
    function formatToString(els, locales, formatters, formats, values, 
    // For debugging
    originalMessage) {
        var parts = formatToParts(els, locales, formatters, formats, values, undefined, originalMessage);
        // Hot path for straight simple msg translations
        if (parts.length === 1) {
            return parts[0].value;
        }
        return parts.reduce(function (all, part) { return (all += part.value); }, '');
    }
    // Singleton
    var domParser;
    var TOKEN_DELIMITER = '@@';
    var TOKEN_REGEX = /@@(\d+_\d+)@@/g;
    var counter = 0;
    function generateId() {
        return Date.now() + "_" + ++counter;
    }
    function restoreRichPlaceholderMessage(text, objectParts) {
        return text
            .split(TOKEN_REGEX)
            .filter(Boolean)
            .map(function (c) { return (objectParts[c] != null ? objectParts[c] : c); })
            .reduce(function (all, c) {
            if (!all.length) {
                all.push(c);
            }
            else if (typeof c === 'string' &&
                typeof all[all.length - 1] === 'string') {
                all[all.length - 1] += c;
            }
            else {
                all.push(c);
            }
            return all;
        }, []);
    }
    /**
     * Not exhaustive, just for sanity check
     */
    var SIMPLE_XML_REGEX = /(<([0-9a-zA-Z-_]*?)>(.*?)<\/([0-9a-zA-Z-_]*?)>)|(<[0-9a-zA-Z-_]*?\/>)/;
    var TEMPLATE_ID = Date.now() + '@@';
    var VOID_ELEMENTS = [
        'area',
        'base',
        'br',
        'col',
        'embed',
        'hr',
        'img',
        'input',
        'link',
        'meta',
        'param',
        'source',
        'track',
        'wbr',
    ];
    function formatHTMLElement(el, objectParts, values) {
        var tagName = el.tagName;
        var outerHTML = el.outerHTML, textContent = el.textContent, childNodes = el.childNodes;
        // Regular text
        if (!tagName) {
            return restoreRichPlaceholderMessage(textContent || '', objectParts);
        }
        tagName = tagName.toLowerCase();
        var isVoidElement = ~VOID_ELEMENTS.indexOf(tagName);
        var formatFnOrValue = values[tagName];
        if (formatFnOrValue && isVoidElement) {
            throw new FormatError(tagName + " is a self-closing tag and can not be used, please use another tag name.");
        }
        if (!childNodes.length) {
            return [outerHTML];
        }
        var chunks = Array.prototype.slice.call(childNodes).reduce(function (all, child) {
            return all.concat(formatHTMLElement(child, objectParts, values));
        }, []);
        // Legacy HTML
        if (!formatFnOrValue) {
            return __spreadArrays$2(["<" + tagName + ">"], chunks, ["</" + tagName + ">"]);
        }
        // HTML Tag replacement
        if (typeof formatFnOrValue === 'function') {
            return [formatFnOrValue.apply(void 0, chunks)];
        }
        return [formatFnOrValue];
    }
    function formatHTMLMessage(els, locales, formatters, formats, values, 
    // For debugging
    originalMessage) {
        var parts = formatToParts(els, locales, formatters, formats, values, undefined, originalMessage);
        var objectParts = {};
        var formattedMessage = parts.reduce(function (all, part) {
            if (part.type === 0 /* literal */) {
                return (all += part.value);
            }
            var id = generateId();
            objectParts[id] = part.value;
            return (all += "" + TOKEN_DELIMITER + id + TOKEN_DELIMITER);
        }, '');
        // Not designed to filter out aggressively
        if (!SIMPLE_XML_REGEX.test(formattedMessage)) {
            return restoreRichPlaceholderMessage(formattedMessage, objectParts);
        }
        if (!values) {
            throw new FormatError('Message has placeholders but no values was given');
        }
        if (typeof DOMParser === 'undefined') {
            throw new FormatError('Cannot format XML message without DOMParser');
        }
        if (!domParser) {
            domParser = new DOMParser();
        }
        var content = domParser
            .parseFromString("<formatted-message id=\"" + TEMPLATE_ID + "\">" + formattedMessage + "</formatted-message>", 'text/html')
            .getElementById(TEMPLATE_ID);
        if (!content) {
            throw new FormatError("Malformed HTML message " + formattedMessage);
        }
        var tagsToFormat = Object.keys(values).filter(function (varName) { return !!content.getElementsByTagName(varName).length; });
        // No tags to format
        if (!tagsToFormat.length) {
            return restoreRichPlaceholderMessage(formattedMessage, objectParts);
        }
        var caseSensitiveTags = tagsToFormat.filter(function (tagName) { return tagName !== tagName.toLowerCase(); });
        if (caseSensitiveTags.length) {
            throw new FormatError("HTML tag must be lowercased but the following tags are not: " + caseSensitiveTags.join(', '));
        }
        // We're doing this since top node is `<formatted-message/>` which does not have a formatter
        return Array.prototype.slice
            .call(content.childNodes)
            .reduce(function (all, child) { return all.concat(formatHTMLElement(child, objectParts, values)); }, []);
    }

    /*
    Copyright (c) 2014, Yahoo! Inc. All rights reserved.
    Copyrights licensed under the New BSD License.
    See the accompanying LICENSE file for terms.
    */
    var __assign$2 = (undefined && undefined.__assign) || function () {
        __assign$2 = Object.assign || function(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                    t[p] = s[p];
            }
            return t;
        };
        return __assign$2.apply(this, arguments);
    };
    // -- MessageFormat --------------------------------------------------------
    function mergeConfig(c1, c2) {
        if (!c2) {
            return c1;
        }
        return __assign$2(__assign$2(__assign$2({}, (c1 || {})), (c2 || {})), Object.keys(c1).reduce(function (all, k) {
            all[k] = __assign$2(__assign$2({}, c1[k]), (c2[k] || {}));
            return all;
        }, {}));
    }
    function mergeConfigs(defaultConfig, configs) {
        if (!configs) {
            return defaultConfig;
        }
        return Object.keys(defaultConfig).reduce(function (all, k) {
            all[k] = mergeConfig(defaultConfig[k], configs[k]);
            return all;
        }, __assign$2({}, defaultConfig));
    }
    function createDefaultFormatters(cache) {
        if (cache === void 0) { cache = {
            number: {},
            dateTime: {},
            pluralRules: {},
        }; }
        return {
            getNumberFormat: memoizeFormatConstructor(Intl.NumberFormat, cache.number),
            getDateTimeFormat: memoizeFormatConstructor(Intl.DateTimeFormat, cache.dateTime),
            getPluralRules: memoizeFormatConstructor(Intl.PluralRules, cache.pluralRules),
        };
    }
    var IntlMessageFormat = /** @class */ (function () {
        function IntlMessageFormat(message, locales, overrideFormats, opts) {
            var _this = this;
            if (locales === void 0) { locales = IntlMessageFormat.defaultLocale; }
            this.formatterCache = {
                number: {},
                dateTime: {},
                pluralRules: {},
            };
            this.format = function (values) {
                return formatToString(_this.ast, _this.locales, _this.formatters, _this.formats, values, _this.message);
            };
            this.formatToParts = function (values) {
                return formatToParts(_this.ast, _this.locales, _this.formatters, _this.formats, values, undefined, _this.message);
            };
            this.formatHTMLMessage = function (values) {
                return formatHTMLMessage(_this.ast, _this.locales, _this.formatters, _this.formats, values, _this.message);
            };
            this.resolvedOptions = function () { return ({
                locale: Intl.NumberFormat.supportedLocalesOf(_this.locales)[0],
            }); };
            this.getAst = function () { return _this.ast; };
            if (typeof message === 'string') {
                this.message = message;
                if (!IntlMessageFormat.__parse) {
                    throw new TypeError('IntlMessageFormat.__parse must be set to process `message` of type `string`');
                }
                // Parse string messages into an AST.
                this.ast = IntlMessageFormat.__parse(message, {
                    normalizeHashtagInPlural: false,
                });
            }
            else {
                this.ast = message;
            }
            if (!Array.isArray(this.ast)) {
                throw new TypeError('A message must be provided as a String or AST.');
            }
            // Creates a new object with the specified `formats` merged with the default
            // formats.
            this.formats = mergeConfigs(IntlMessageFormat.formats, overrideFormats);
            // Defined first because it's used to build the format pattern.
            this.locales = locales;
            this.formatters =
                (opts && opts.formatters) || createDefaultFormatters(this.formatterCache);
        }
        IntlMessageFormat.defaultLocale = new Intl.NumberFormat().resolvedOptions().locale;
        IntlMessageFormat.__parse = parse;
        // Default format options used as the prototype of the `formats` provided to the
        // constructor. These are used when constructing the internal Intl.NumberFormat
        // and Intl.DateTimeFormat instances.
        IntlMessageFormat.formats = {
            number: {
                currency: {
                    style: 'currency',
                },
                percent: {
                    style: 'percent',
                },
            },
            date: {
                short: {
                    month: 'numeric',
                    day: 'numeric',
                    year: '2-digit',
                },
                medium: {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                },
                long: {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                },
                full: {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                },
            },
            time: {
                short: {
                    hour: 'numeric',
                    minute: 'numeric',
                },
                medium: {
                    hour: 'numeric',
                    minute: 'numeric',
                    second: 'numeric',
                },
                long: {
                    hour: 'numeric',
                    minute: 'numeric',
                    second: 'numeric',
                    timeZoneName: 'short',
                },
                full: {
                    hour: 'numeric',
                    minute: 'numeric',
                    second: 'numeric',
                    timeZoneName: 'short',
                },
            },
        };
        return IntlMessageFormat;
    }());

    /*
    Copyright (c) 2014, Yahoo! Inc. All rights reserved.
    Copyrights licensed under the New BSD License.
    See the accompanying LICENSE file for terms.
    */

    const o=(n,e="")=>{const t={};for(const r in n){const i=e+r;"object"==typeof n[r]?Object.assign(t,o(n[r],`${i}.`)):t[i]=n[r];}return t};let r;const i=writable({});function a(n){return n in r}function l(n,e){if(a(n)){const t=function(n){return r[n]||null}(n);if(e in t)return t[e]}return null}function s(n,...e){const t=e.map(n=>o(n));i.update(e=>(e[n]=Object.assign(e[n]||{},...t),e));}const c=derived([i],([n])=>Object.keys(n));i.subscribe(n=>r=n);const u={};function m(n){return u[n]}function f(n){return E(n).reverse().some(m)}const d={};function w(n){if(!f(n))return;if(n in d)return d[n];const e=function(n){return E(n).reverse().map(n=>{const e=m(n);return [n,e?[...e]:[]]}).filter(([,n])=>n.length>0)}(n);return 0!==e.length?(d[n]=Promise.all(e.map(([n,e])=>Promise.all(e.map(n=>n())).then(e=>{!function(n){delete u[n];}(n),e=e.map(n=>n.default||n),s(n,...e);}))).then(()=>{delete d[n];}),d[n]):void 0}/*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */function p(n,e){var t={};for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&e.indexOf(o)<0&&(t[o]=n[o]);if(null!=n&&"function"==typeof Object.getOwnPropertySymbols){var r=0;for(o=Object.getOwnPropertySymbols(n);r<o.length;r++)e.indexOf(o[r])<0&&Object.prototype.propertyIsEnumerable.call(n,o[r])&&(t[o[r]]=n[o[r]]);}return t}const b={fallbackLocale:null,initialLocale:null,loadingDelay:200,formats:{number:{scientific:{notation:"scientific"},engineering:{notation:"engineering"},compactLong:{notation:"compact",compactDisplay:"long"},compactShort:{notation:"compact",compactDisplay:"short"}},date:{short:{month:"numeric",day:"numeric",year:"2-digit"},medium:{month:"short",day:"numeric",year:"numeric"},long:{month:"long",day:"numeric",year:"numeric"},full:{weekday:"long",month:"long",day:"numeric",year:"numeric"}},time:{short:{hour:"numeric",minute:"numeric"},medium:{hour:"numeric",minute:"numeric",second:"numeric"},long:{hour:"numeric",minute:"numeric",second:"numeric",timeZoneName:"short"},full:{hour:"numeric",minute:"numeric",second:"numeric",timeZoneName:"short"}}},warnOnMissingMessages:!0};function h(){return b}function y(n){const{formats:e}=n,t=p(n,["formats"]),o=n.initialLocale||n.fallbackLocale;return Object.assign(b,t,{initialLocale:o}),e&&("number"in e&&Object.assign(b.formats.number,e.number),"date"in e&&Object.assign(b.formats.date,e.date),"time"in e&&Object.assign(b.formats.time,e.time)),j.set(o)}const O=writable(!1);let v;const j=writable(null);function L(n,e){return 0===e.indexOf(n)&&n!==e}function k(n,e){return n===e||L(n,e)||L(e,n)}function x(n){const e=n.lastIndexOf("-");if(e>0)return n.slice(0,e);const{fallbackLocale:t}=h();return t&&!k(n,t)?t:null}function E(n){const e=n.split("-").map((n,e,t)=>t.slice(0,e+1).join("-")),{fallbackLocale:t}=h();return t&&!k(n,t)?e.concat(E(t)):e}function $(){return v}j.subscribe(n=>{v=n,"undefined"!=typeof window&&document.documentElement.setAttribute("lang",n);});const D=j.set;j.set=n=>{if(function n(e){return null==e||a(e)?e:n(x(e))}(n)&&f(n)){const e=h().loadingDelay;let t;return "undefined"!=typeof window&&null!=$()&&e?t=window.setTimeout(()=>O.set(!0),e):O.set(!0),w(n).then(()=>{D(n);}).finally(()=>{clearTimeout(t),O.set(!1);})}return D(n)},j.update=n=>D(n(v));const I=(n,e)=>{const t=n.split("&").find(n=>0===n.indexOf(`${e}=`));return t?t.split("=").pop():null},A=n=>"undefined"==typeof window?null:I(window.location.search.substr(1),n),F={},Z=(n,e)=>{if(null==e)return null;const t=l(e,n);return t||Z(n,x(e))},C=(n,e)=>{if(e in F&&n in F[e])return F[e][n];const t=Z(n,e);return t?((n,e,t)=>t?(e in F||(F[e]={}),n in F[e]||(F[e][n]=t),t):t)(n,e,t):null},J=n=>{const e=Object.create(null);return t=>{const o=JSON.stringify(t);return o in e?e[o]:e[o]=n(t)}},U=(n,e)=>{const t=h().formats;if(n in t&&e in t[n])return t[n][e];throw new Error(`[svelte-i18n] Unknown "${e}" ${n} format.`)},_=J(n=>{var{locale:e,format:t}=n,o=p(n,["locale","format"]);if(null==e)throw new Error('[svelte-i18n] A "locale" must be set to format numbers');return t&&(o=U("number",t)),new Intl.NumberFormat(e,o)}),q=J(n=>{var{locale:e,format:t}=n,o=p(n,["locale","format"]);if(null==e)throw new Error('[svelte-i18n] A "locale" must be set to format dates');return t?o=U("date",t):0===Object.keys(o).length&&(o=U("date","short")),new Intl.DateTimeFormat(e,o)}),z=J(n=>{var{locale:e,format:t}=n,o=p(n,["locale","format"]);if(null==e)throw new Error('[svelte-i18n] A "locale" must be set to format time values');return t?o=U("time",t):0===Object.keys(o).length&&(o=U("time","short")),new Intl.DateTimeFormat(e,o)}),B=(n={})=>{var{locale:e=$()}=n,t=p(n,["locale"]);return _(Object.assign({locale:e},t))},G=(n={})=>{var{locale:e=$()}=n,t=p(n,["locale"]);return q(Object.assign({locale:e},t))},H=(n={})=>{var{locale:e=$()}=n,t=p(n,["locale"]);return z(Object.assign({locale:e},t))},K=J((n,e=$())=>new IntlMessageFormat(n,e,h().formats)),Q=(n,e={})=>{"object"==typeof n&&(n=(e=n).id);const{values:t,locale:o=$(),default:r}=e;if(null==o)throw new Error("[svelte-i18n] Cannot format a message without first setting the initial locale.");const i=C(n,o);return i?t?K(i,o).format(t):i:(h().warnOnMissingMessages&&console.warn(`[svelte-i18n] The message "${n}" was not found in "${E(o).join('", "')}".${f($())?"\n\nNote: there are at least one loader still registered to this locale that wasn't executed.":""}`),r||n)},R=(n,e)=>H(e).format(n),V=(n,e)=>G(e).format(n),W=(n,e)=>B(e).format(n),X=derived([j,i],()=>Q),Y=derived([j],()=>R),nn=derived([j],()=>V),en=derived([j],()=>W);

    /* src/components/Button.svelte generated by Svelte v3.20.1 */

    const file = "src/components/Button.svelte";

    function create_fragment(ctx) {
    	let button;
    	let button_class_value;
    	let current;
    	let dispose;
    	const default_slot_template = /*$$slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	const block = {
    		c: function create() {
    			button = element("button");
    			if (default_slot) default_slot.c();
    			attr_dev(button, "class", button_class_value = `bt-button ${/*$$props*/ ctx[1].class}`);
    			attr_dev(button, "type", /*type*/ ctx[0]);
    			add_location(button, file, 4, 0, 39);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, button, anchor);

    			if (default_slot) {
    				default_slot.m(button, null);
    			}

    			current = true;
    			if (remount) dispose();
    			dispose = listen_dev(button, "click", /*click_handler*/ ctx[4], false, false, false);
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 4) {
    					default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[2], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[2], dirty, null));
    				}
    			}

    			if (!current || dirty & /*$$props*/ 2 && button_class_value !== (button_class_value = `bt-button ${/*$$props*/ ctx[1].class}`)) {
    				attr_dev(button, "class", button_class_value);
    			}

    			if (!current || dirty & /*type*/ 1) {
    				attr_dev(button, "type", /*type*/ ctx[0]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (default_slot) default_slot.d(detaching);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { type } = $$props;
    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Button", $$slots, ['default']);

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$set = $$new_props => {
    		$$invalidate(1, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ("type" in $$new_props) $$invalidate(0, type = $$new_props.type);
    		if ("$$scope" in $$new_props) $$invalidate(2, $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => ({ type });

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(1, $$props = assign(assign({}, $$props), $$new_props));
    		if ("type" in $$props) $$invalidate(0, type = $$new_props.type);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [type, $$props, $$scope, $$slots, click_handler];
    }

    class Button extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { type: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Button",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*type*/ ctx[0] === undefined && !("type" in props)) {
    			console.warn("<Button> was created without expected prop 'type'");
    		}
    	}

    	get type() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/PlayStopIcon.svelte generated by Svelte v3.20.1 */

    const file$1 = "src/components/PlayStopIcon.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let div_class_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", div_class_value = `bt-play-stop-icon bt-play-stop-icon_${/*state*/ ctx[0]}`);
    			add_location(div, file$1, 7, 0, 80);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*state*/ 1 && div_class_value !== (div_class_value = `bt-play-stop-icon bt-play-stop-icon_${/*state*/ ctx[0]}`)) {
    				attr_dev(div, "class", div_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { value } = $$props;
    	const writable_props = ["value"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<PlayStopIcon> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("PlayStopIcon", $$slots, []);

    	$$self.$set = $$props => {
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    	};

    	$$self.$capture_state = () => ({ value, state });

    	$$self.$inject_state = $$props => {
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    		if ("state" in $$props) $$invalidate(0, state = $$props.state);
    	};

    	let state;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*value*/ 2) {
    			 $$invalidate(0, state = value ? "play" : "stop");
    		}
    	};

    	return [state, value];
    }

    class PlayStopIcon extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { value: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PlayStopIcon",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*value*/ ctx[1] === undefined && !("value" in props)) {
    			console.warn("<PlayStopIcon> was created without expected prop 'value'");
    		}
    	}

    	get value() {
    		throw new Error("<PlayStopIcon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<PlayStopIcon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const STATES = {
      action: 'action',
      break: 'break',
      stopped: 'stopped',
    };

    const state = writable(STATES.stopped);

    function setObject(scope, key, value) {
      const currentScope = getObject(scope);
      const updatedScope = {
        ...currentScope,
        [key]: value
      };

      localStorage.setItem(scope, JSON.stringify(updatedScope));
    }

    function getObject(scope, key) {
      const lsItem = localStorage.getItem(scope);
      let parsedScope;

      if (!lsItem) {
        return null;
      }

      try {
        parsedScope = JSON.parse(localStorage.getItem(scope));
      } catch (e) {
        return key ? undefined : lsItem;
      }

      return key ? parsedScope[key] : parsedScope;
    }

    const lsHelper = {
      set: (key, value) => localStorage.setItem(key, value),
      get: key => localStorage.getItem(key),
      setObject,
      getObject,
      clear: localStorage.clear,
    };

    const lsSettings = lsHelper.getObject('notification-settings');

    function getDefaultValue(lsKey, defaultValue) {
      return lsSettings && lsSettings[lsKey] ? lsSettings[lsKey] : defaultValue;
    }

    const intervalTime = writable(getDefaultValue('interval', 15));
    const breakTime = writable(getDefaultValue('break', 15));
    const message = writable(getDefaultValue('message', ''));
    const sound = writable(getDefaultValue('sound', ''));

    const settingsWatcher = derived(
      [intervalTime, breakTime, message, sound],
      ([intervalTimeCb, breakTimeCb, messageCb, soundCb]) => {
        if (intervalTimeCb < 1 || Number.isNaN(intervalTimeCb)) {
          intervalTime.set(1);
        }
        if (breakTimeCb < 1 || Number.isNaN(breakTimeCb)) {
          breakTime.set(1);
        }

        return {
          intervalTime: intervalTimeCb,
          breakTime: breakTimeCb,
          message: messageCb,
          sound: soundCb,
        }
      }
    );

    /* src/views/Panel.svelte generated by Svelte v3.20.1 */

    const file$2 = "src/views/Panel.svelte";

    // (118:6) {:else }
    function create_else_block(ctx) {
    	let t0_value = /*$_*/ ctx[5]("panel.break_ends_in") + "";
    	let t0;
    	let t1;
    	let span;
    	let t2_value = Math.round(/*breakCountdown*/ ctx[2]) + "";
    	let t2;
    	let t3;
    	let t4_value = /*$_*/ ctx[5]("panel.in_seconds") + "";
    	let t4;

    	const block = {
    		c: function create() {
    			t0 = text(t0_value);
    			t1 = space();
    			span = element("span");
    			t2 = text(t2_value);
    			t3 = space();
    			t4 = text(t4_value);
    			attr_dev(span, "class", "bt-panel__remaining-time-value");
    			add_location(span, file$2, 119, 8, 3328);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, span, anchor);
    			append_dev(span, t2);
    			append_dev(span, t3);
    			append_dev(span, t4);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$_*/ 32 && t0_value !== (t0_value = /*$_*/ ctx[5]("panel.break_ends_in") + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*breakCountdown*/ 4 && t2_value !== (t2_value = Math.round(/*breakCountdown*/ ctx[2]) + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*$_*/ 32 && t4_value !== (t4_value = /*$_*/ ctx[5]("panel.in_seconds") + "")) set_data_dev(t4, t4_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(118:6) {:else }",
    		ctx
    	});

    	return block;
    }

    // (113:48) 
    function create_if_block_1(ctx) {
    	let t0_value = /*$_*/ ctx[5]("panel.next_break_in") + "";
    	let t0;
    	let t1;
    	let span;
    	let t2;
    	let t3;
    	let t4_value = /*$_*/ ctx[5](/*actionRemainingTimeLabel*/ ctx[4]) + "";
    	let t4;

    	const block = {
    		c: function create() {
    			t0 = text(t0_value);
    			t1 = space();
    			span = element("span");
    			t2 = text(/*actionRemainingTimeValue*/ ctx[3]);
    			t3 = space();
    			t4 = text(t4_value);
    			attr_dev(span, "class", "bt-panel__remaining-time-value");
    			add_location(span, file$2, 114, 8, 3139);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, span, anchor);
    			append_dev(span, t2);
    			append_dev(span, t3);
    			append_dev(span, t4);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$_*/ 32 && t0_value !== (t0_value = /*$_*/ ctx[5]("panel.next_break_in") + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*actionRemainingTimeValue*/ 8) set_data_dev(t2, /*actionRemainingTimeValue*/ ctx[3]);
    			if (dirty & /*$_, actionRemainingTimeLabel*/ 48 && t4_value !== (t4_value = /*$_*/ ctx[5](/*actionRemainingTimeLabel*/ ctx[4]) + "")) set_data_dev(t4, t4_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(113:48) ",
    		ctx
    	});

    	return block;
    }

    // (111:6) {#if currentState === STATES.stopped }
    function create_if_block(ctx) {
    	let t_value = /*$_*/ ctx[5]("panel.start_timer") + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$_*/ 32 && t_value !== (t_value = /*$_*/ ctx[5]("panel.start_timer") + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(111:6) {#if currentState === STATES.stopped }",
    		ctx
    	});

    	return block;
    }

    // (107:2) <Button class="bt-panel__button"           on:click={onButtonClick}>
    function create_default_slot(ctx) {
    	let t;
    	let div;
    	let current;

    	const playstopicon = new PlayStopIcon({
    			props: {
    				value: /*currentState*/ ctx[0] === STATES.stopped
    			},
    			$$inline: true
    		});

    	function select_block_type(ctx, dirty) {
    		if (/*currentState*/ ctx[0] === STATES.stopped) return create_if_block;
    		if (/*currentState*/ ctx[0] === STATES.action) return create_if_block_1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			create_component(playstopicon.$$.fragment);
    			t = space();
    			div = element("div");
    			if_block.c();
    			attr_dev(div, "class", "bt-panel__remaining-time");
    			add_location(div, file$2, 109, 4, 2928);
    		},
    		m: function mount(target, anchor) {
    			mount_component(playstopicon, target, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, div, anchor);
    			if_block.m(div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const playstopicon_changes = {};
    			if (dirty & /*currentState*/ 1) playstopicon_changes.value = /*currentState*/ ctx[0] === STATES.stopped;
    			playstopicon.$set(playstopicon_changes);

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(playstopicon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(playstopicon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(playstopicon, detaching);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(div);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(107:2) <Button class=\\\"bt-panel__button\\\"           on:click={onButtonClick}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div1;
    	let t;
    	let div0;
    	let div0_style_value;
    	let div1_class_value;
    	let current;

    	const button = new Button({
    			props: {
    				class: "bt-panel__button",
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button.$on("click", /*onButtonClick*/ ctx[6]);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			create_component(button.$$.fragment);
    			t = space();
    			div0 = element("div");
    			attr_dev(div0, "class", "bt-panel__countdown-line");
    			attr_dev(div0, "style", div0_style_value = `height: ${/*fillHeight*/ ctx[1]}%`);
    			add_location(div0, file$2, 125, 2, 3491);
    			attr_dev(div1, "class", div1_class_value = `bt-panel ${/*$$props*/ ctx[7].class}`);
    			add_location(div1, file$2, 105, 0, 2746);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			mount_component(button, div1, null);
    			append_dev(div1, t);
    			append_dev(div1, div0);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const button_changes = {};

    			if (dirty & /*$$scope, $_, currentState, actionRemainingTimeLabel, actionRemainingTimeValue, breakCountdown*/ 33554493) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);

    			if (!current || dirty & /*fillHeight*/ 2 && div0_style_value !== (div0_style_value = `height: ${/*fillHeight*/ ctx[1]}%`)) {
    				attr_dev(div0, "style", div0_style_value);
    			}

    			if (!current || dirty & /*$$props*/ 128 && div1_class_value !== (div1_class_value = `bt-panel ${/*$$props*/ ctx[7].class}`)) {
    				attr_dev(div1, "class", div1_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_component(button);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $_;
    	validate_store(X, "_");
    	component_subscribe($$self, X, $$value => $$invalidate(5, $_ = $$value));
    	let currentState;
    	let intervalTime$1;
    	let breakTime$1;
    	let actionCountdownStartedAt;
    	let breakCountdownStartedAt;
    	let actionTimerInterval;
    	let breakTimerInterval;
    	let fillHeight = 0;
    	let actionCountdown = 0;
    	let breakCountdown = 0;

    	const stateListener = state.subscribe(value => {
    		$$invalidate(0, currentState = value);

    		switch (value) {
    			case STATES.action:
    				actionCountdownStartedAt = new Date().getTime();
    				$$invalidate(1, fillHeight = 0);
    				stopBreakTimer();
    				startActionTimer();
    				break;
    			case STATES.stopped:
    				stopActionTimer();
    				stopBreakTimer();
    				resetCountdown();
    				$$invalidate(1, fillHeight = 0);
    				break;
    			case STATES.break:
    				breakCountdownStartedAt = new Date().getTime();
    				stopActionTimer();
    				startBreakTimer();
    				$$invalidate(1, fillHeight = 100);
    				break;
    		}
    	});

    	const intervalTimeListener = intervalTime.subscribe(value => {
    		intervalTime$1 = value;
    	});

    	const breakTimeListener = breakTime.subscribe(value => {
    		breakTime$1 = value;
    	});

    	function onButtonClick() {
    		state.set(currentState === STATES.stopped
    		? STATES.action
    		: STATES.stopped);
    	}

    	function startActionTimer() {
    		updateActionCountdown();
    		actionTimerInterval = setInterval(updateActionCountdown, 1000);
    	}

    	function updateActionCountdown() {
    		const now = new Date().getTime();
    		const timeDiffMinutes = (now - actionCountdownStartedAt) / (1000 * 60);
    		$$invalidate(14, actionCountdown = intervalTime$1 - timeDiffMinutes);
    		$$invalidate(1, fillHeight = timeDiffMinutes / intervalTime$1 * 100);
    	}

    	function stopActionTimer() {
    		clearInterval(actionTimerInterval);
    	}

    	function resetCountdown() {
    		actionCountdownStartedAt = NaN;
    		breakCountdownStartedAt = NaN;
    	}

    	function startBreakTimer() {
    		breakTimerInterval = setInterval(updateBreakCountdown, 1000);
    	}

    	function updateBreakCountdown() {
    		const now = new Date().getTime();
    		const timeDiffMinutes = (now - breakCountdownStartedAt) / 1000;
    		$$invalidate(2, breakCountdown = breakTime$1 - timeDiffMinutes);
    	}

    	function stopBreakTimer() {
    		clearInterval(breakTimerInterval);
    	}

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Panel", $$slots, []);

    	$$self.$set = $$new_props => {
    		$$invalidate(7, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$capture_state = () => ({
    		_: X,
    		Button,
    		PlayStopIcon,
    		STATES,
    		state,
    		storeIntervalTime: intervalTime,
    		storeBreakTime: breakTime,
    		currentState,
    		intervalTime: intervalTime$1,
    		breakTime: breakTime$1,
    		actionCountdownStartedAt,
    		breakCountdownStartedAt,
    		actionTimerInterval,
    		breakTimerInterval,
    		fillHeight,
    		actionCountdown,
    		breakCountdown,
    		stateListener,
    		intervalTimeListener,
    		breakTimeListener,
    		onButtonClick,
    		startActionTimer,
    		updateActionCountdown,
    		stopActionTimer,
    		resetCountdown,
    		startBreakTimer,
    		updateBreakCountdown,
    		stopBreakTimer,
    		actionRemainingTimeValue,
    		actionRemainingTimeLabel,
    		$_
    	});

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(7, $$props = assign(assign({}, $$props), $$new_props));
    		if ("currentState" in $$props) $$invalidate(0, currentState = $$new_props.currentState);
    		if ("intervalTime" in $$props) intervalTime$1 = $$new_props.intervalTime;
    		if ("breakTime" in $$props) breakTime$1 = $$new_props.breakTime;
    		if ("actionCountdownStartedAt" in $$props) actionCountdownStartedAt = $$new_props.actionCountdownStartedAt;
    		if ("breakCountdownStartedAt" in $$props) breakCountdownStartedAt = $$new_props.breakCountdownStartedAt;
    		if ("actionTimerInterval" in $$props) actionTimerInterval = $$new_props.actionTimerInterval;
    		if ("breakTimerInterval" in $$props) breakTimerInterval = $$new_props.breakTimerInterval;
    		if ("fillHeight" in $$props) $$invalidate(1, fillHeight = $$new_props.fillHeight);
    		if ("actionCountdown" in $$props) $$invalidate(14, actionCountdown = $$new_props.actionCountdown);
    		if ("breakCountdown" in $$props) $$invalidate(2, breakCountdown = $$new_props.breakCountdown);
    		if ("actionRemainingTimeValue" in $$props) $$invalidate(3, actionRemainingTimeValue = $$new_props.actionRemainingTimeValue);
    		if ("actionRemainingTimeLabel" in $$props) $$invalidate(4, actionRemainingTimeLabel = $$new_props.actionRemainingTimeLabel);
    	};

    	let actionRemainingTimeValue;
    	let actionRemainingTimeLabel;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*actionCountdown*/ 16384) {
    			 $$invalidate(3, actionRemainingTimeValue = actionCountdown > 1
    			? Math.round(actionCountdown)
    			: Math.round(actionCountdown * 60));
    		}

    		if ($$self.$$.dirty & /*actionCountdown*/ 16384) {
    			 $$invalidate(4, actionRemainingTimeLabel = actionCountdown > 1
    			? "panel.in_minutes"
    			: "panel.in_seconds");
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		currentState,
    		fillHeight,
    		breakCountdown,
    		actionRemainingTimeValue,
    		actionRemainingTimeLabel,
    		$_,
    		onButtonClick,
    		$$props
    	];
    }

    class Panel extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Panel",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/components/Input.svelte generated by Svelte v3.20.1 */

    const file$3 = "src/components/Input.svelte";

    function create_fragment$3(ctx) {
    	let input;
    	let input_class_value;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "class", input_class_value = `bt-input ${/*$$props*/ ctx[4].class}`);
    			attr_dev(input, "type", /*type*/ ctx[0]);
    			attr_dev(input, "placeholder", /*placeholder*/ ctx[1]);
    			attr_dev(input, "min", /*min*/ ctx[3]);
    			input.value = /*value*/ ctx[2];
    			add_location(input, file$3, 7, 0, 103);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, input, anchor);
    			if (remount) dispose();
    			dispose = listen_dev(input, "input", /*input_handler*/ ctx[5], false, false, false);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$$props*/ 16 && input_class_value !== (input_class_value = `bt-input ${/*$$props*/ ctx[4].class}`)) {
    				attr_dev(input, "class", input_class_value);
    			}

    			if (dirty & /*type*/ 1) {
    				attr_dev(input, "type", /*type*/ ctx[0]);
    			}

    			if (dirty & /*placeholder*/ 2) {
    				attr_dev(input, "placeholder", /*placeholder*/ ctx[1]);
    			}

    			if (dirty & /*min*/ 8) {
    				attr_dev(input, "min", /*min*/ ctx[3]);
    			}

    			if (dirty & /*value*/ 4 && input.value !== /*value*/ ctx[2]) {
    				prop_dev(input, "value", /*value*/ ctx[2]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { type } = $$props;
    	let { placeholder } = $$props;
    	let { value } = $$props;
    	let { min } = $$props;
    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Input", $$slots, []);

    	function input_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$set = $$new_props => {
    		$$invalidate(4, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ("type" in $$new_props) $$invalidate(0, type = $$new_props.type);
    		if ("placeholder" in $$new_props) $$invalidate(1, placeholder = $$new_props.placeholder);
    		if ("value" in $$new_props) $$invalidate(2, value = $$new_props.value);
    		if ("min" in $$new_props) $$invalidate(3, min = $$new_props.min);
    	};

    	$$self.$capture_state = () => ({ type, placeholder, value, min });

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(4, $$props = assign(assign({}, $$props), $$new_props));
    		if ("type" in $$props) $$invalidate(0, type = $$new_props.type);
    		if ("placeholder" in $$props) $$invalidate(1, placeholder = $$new_props.placeholder);
    		if ("value" in $$props) $$invalidate(2, value = $$new_props.value);
    		if ("min" in $$props) $$invalidate(3, min = $$new_props.min);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [type, placeholder, value, min, $$props, input_handler];
    }

    class Input extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			type: 0,
    			placeholder: 1,
    			value: 2,
    			min: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Input",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*type*/ ctx[0] === undefined && !("type" in props)) {
    			console.warn("<Input> was created without expected prop 'type'");
    		}

    		if (/*placeholder*/ ctx[1] === undefined && !("placeholder" in props)) {
    			console.warn("<Input> was created without expected prop 'placeholder'");
    		}

    		if (/*value*/ ctx[2] === undefined && !("value" in props)) {
    			console.warn("<Input> was created without expected prop 'value'");
    		}

    		if (/*min*/ ctx[3] === undefined && !("min" in props)) {
    			console.warn("<Input> was created without expected prop 'min'");
    		}
    	}

    	get type() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get placeholder() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set placeholder(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get min() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set min(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Select.svelte generated by Svelte v3.20.1 */

    const file$4 = "src/components/Select.svelte";

    function create_fragment$4(ctx) {
    	let select;
    	let select_class_value;
    	let select_value_value;
    	let current;
    	let dispose;
    	const default_slot_template = /*$$slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	const block = {
    		c: function create() {
    			select = element("select");
    			if (default_slot) default_slot.c();
    			attr_dev(select, "class", select_class_value = `bt-select ${/*$$props*/ ctx[1].class}`);
    			add_location(select, file$4, 4, 0, 40);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, select, anchor);

    			if (default_slot) {
    				default_slot.m(select, null);
    			}

    			select_value_value = /*value*/ ctx[0];

    			for (var i = 0; i < select.options.length; i += 1) {
    				var option = select.options[i];

    				if (option.__value === select_value_value) {
    					option.selected = true;
    					break;
    				}
    			}

    			current = true;
    			if (remount) dispose();
    			dispose = listen_dev(select, "input", /*input_handler*/ ctx[4], false, false, false);
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 4) {
    					default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[2], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[2], dirty, null));
    				}
    			}

    			if (!current || dirty & /*$$props*/ 2 && select_class_value !== (select_class_value = `bt-select ${/*$$props*/ ctx[1].class}`)) {
    				attr_dev(select, "class", select_class_value);
    			}

    			if (!current || dirty & /*value*/ 1 && select_value_value !== (select_value_value = /*value*/ ctx[0])) {
    				for (var i = 0; i < select.options.length; i += 1) {
    					var option = select.options[i];

    					if (option.__value === select_value_value) {
    						option.selected = true;
    						break;
    					}
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(select);
    			if (default_slot) default_slot.d(detaching);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { value } = $$props;
    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Select", $$slots, ['default']);

    	function input_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$set = $$new_props => {
    		$$invalidate(1, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ("value" in $$new_props) $$invalidate(0, value = $$new_props.value);
    		if ("$$scope" in $$new_props) $$invalidate(2, $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => ({ value });

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(1, $$props = assign(assign({}, $$props), $$new_props));
    		if ("value" in $$props) $$invalidate(0, value = $$new_props.value);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [value, $$props, $$scope, $$slots, input_handler];
    }

    class Select extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { value: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Select",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*value*/ ctx[0] === undefined && !("value" in props)) {
    			console.warn("<Select> was created without expected prop 'value'");
    		}
    	}

    	get value() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const SOUNDS_PATH = '/sounds';

    const SOUNDS = [
      {
        id: '1',
        name: 'Beyond Doubt',
        mp3: `${SOUNDS_PATH}/beyond-doubt.mp3`,
        ogg: `${SOUNDS_PATH}/beyond-doubt.ogg`,
      },
      {
        id: '2',
        name: 'Time is Now',
        mp3: `${SOUNDS_PATH}/time-is-now.mp3`,
        ogg: `${SOUNDS_PATH}/time-is-now.ogg`,
      },
      {
        id: '3',
        name: 'Unconvinced',
        mp3: `${SOUNDS_PATH}/unconvinced.mp3`,
        ogg: `${SOUNDS_PATH}/unconvinced.ogg`,
      },
      {
        id: '4',
        name: 'Intuition',
        mp3: `${SOUNDS_PATH}/intuition.mp3`,
        ogg: `${SOUNDS_PATH}/intuition.ogg`,
      },
      {
        id: '5',
        name: 'Pull Out',
        mp3: `${SOUNDS_PATH}/pull-out.mp3`,
        ogg: `${SOUNDS_PATH}/pull-out.ogg`,
      },
      {
        id: '6',
        name: 'Open Ended',
        mp3: `${SOUNDS_PATH}/open-ended.mp3`,
        ogg: `${SOUNDS_PATH}/open-ended.ogg`,
      }
    ];

    const LANGUAGES = [
      {
        name: 'Русский',
        translate: 'constants.languages.russian',
        value: 'ru',
      },
      {
        name: 'English',
        translate: 'constants.languages.english',
        value: 'en',
      },
    ];

    const THEMES = [
      {
        name: 'Светлая тема',
        translate: 'constants.themes.light',
        value: 'light',
      },
      {
        name: 'Темная тема',
        translate: 'constants.themes.dark',
        value: 'dark',
      }
    ];

    const MEDIA_QUERY_NAME = 'prefers-color-scheme';

    class ThemeCatcher {
      constructor() {}

      get isLightTheme() {
        return this.checkMediaMatch('light');
      }

      get isDarkTheme() {
        return this.checkMediaMatch('dark');
      }

      checkMediaMatch(name) {
        return window.matchMedia(`(${MEDIA_QUERY_NAME}: ${name})`).matches;
      }
    }

    const lsSettings$1 = lsHelper.getObject('app-settings');

    function getDefaultLanguage() {
      const availableLanguages = LANGUAGES.map(lang => lang.value);
      const systemLanguage = navigator.language.split('-')[0];

      if (lsSettings$1 && lsSettings$1.language) {
        return availableLanguages.includes(lsSettings$1.language) ? lsSettings$1.language : 'ru';
      }

      return availableLanguages.includes(systemLanguage) ? systemLanguage : 'ru';
    }

    function getDefaultTheme() {
      const systemTheme = new ThemeCatcher().isLightTheme ? 'light' : 'dark';

      if (lsSettings$1 && lsSettings$1.theme) {
        return lsSettings$1.theme;
      }

      return systemTheme;
    }

    const language = writable(getDefaultLanguage());
    const theme = writable(getDefaultTheme());

    /* src/views/Settings.svelte generated by Svelte v3.20.1 */

    const file$5 = "src/views/Settings.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    // (144:10) {#each SOUNDS as sound }
    function create_each_block_2(ctx) {
    	let option;
    	let t_value = /*sound*/ ctx[4].name + "";
    	let t;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*sound*/ ctx[4].id;
    			option.value = option.__value;
    			add_location(option, file$5, 144, 12, 4327);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(144:10) {#each SOUNDS as sound }",
    		ctx
    	});

    	return block;
    }

    // (140:8) <Select class="bt-settings__control"                 value="{sound}"                 on:input={onSoundSelect}>
    function create_default_slot_4(ctx) {
    	let option;
    	let t0_value = /*$_*/ ctx[3]("constants.sounds.no_sound") + "";
    	let t0;
    	let t1;
    	let each_1_anchor;
    	let each_value_2 = SOUNDS;
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const block = {
    		c: function create() {
    			option = element("option");
    			t0 = text(t0_value);
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			option.__value = "''";
    			option.value = option.__value;
    			add_location(option, file$5, 142, 10, 4218);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t0);
    			insert_dev(target, t1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$_*/ 8 && t0_value !== (t0_value = /*$_*/ ctx[3]("constants.sounds.no_sound") + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*SOUNDS*/ 0) {
    				each_value_2 = SOUNDS;
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    			if (detaching) detach_dev(t1);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_4.name,
    		type: "slot",
    		source: "(140:8) <Select class=\\\"bt-settings__control\\\"                 value=\\\"{sound}\\\"                 on:input={onSoundSelect}>",
    		ctx
    	});

    	return block;
    }

    // (148:8) <Button class="bt-settings__button bt-settings__button_sound-sample"                 type="button"                 on:click={() => dispatchRunExample('sound')}>
    function create_default_slot_3(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			attr_dev(span, "class", "bt-start-icon");
    			add_location(span, file$5, 150, 10, 4591);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3.name,
    		type: "slot",
    		source: "(148:8) <Button class=\\\"bt-settings__button bt-settings__button_sound-sample\\\"                 type=\\\"button\\\"                 on:click={() => dispatchRunExample('sound')}>",
    		ctx
    	});

    	return block;
    }

    // (156:6) <Button class="bt-settings__button bt-settings__button_notification-sample"               type="button"               on:click={() => dispatchRunExample('notification')}>
    function create_default_slot_2(ctx) {
    	let t_value = /*$_*/ ctx[3]("notification_settings.show_notification") + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$_*/ 8 && t_value !== (t_value = /*$_*/ ctx[3]("notification_settings.show_notification") + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(156:6) <Button class=\\\"bt-settings__button bt-settings__button_notification-sample\\\"               type=\\\"button\\\"               on:click={() => dispatchRunExample('notification')}>",
    		ctx
    	});

    	return block;
    }

    // (171:8) {#each LANGUAGES as language }
    function create_each_block_1(ctx) {
    	let option;
    	let t_value = /*$_*/ ctx[3](`${/*language*/ ctx[6].translate}`) + "";
    	let t;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*language*/ ctx[6].value;
    			option.value = option.__value;
    			add_location(option, file$5, 171, 10, 5366);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$_*/ 8 && t_value !== (t_value = /*$_*/ ctx[3](`${/*language*/ ctx[6].translate}`) + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(171:8) {#each LANGUAGES as language }",
    		ctx
    	});

    	return block;
    }

    // (168:6) <Select class="bt-settings__control"               value="{language}"               on:input={onLanguageSelect}>
    function create_default_slot_1(ctx) {
    	let each_1_anchor;
    	let each_value_1 = LANGUAGES;
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*LANGUAGES, $_*/ 8) {
    				each_value_1 = LANGUAGES;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(168:6) <Select class=\\\"bt-settings__control\\\"               value=\\\"{language}\\\"               on:input={onLanguageSelect}>",
    		ctx
    	});

    	return block;
    }

    // (181:8) {#each THEMES as theme }
    function create_each_block(ctx) {
    	let option;
    	let t_value = /*$_*/ ctx[3](`${/*theme*/ ctx[5].translate}`) + "";
    	let t;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*theme*/ ctx[5].value;
    			option.value = option.__value;
    			add_location(option, file$5, 181, 10, 5753);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$_*/ 8 && t_value !== (t_value = /*$_*/ ctx[3](`${/*theme*/ ctx[5].translate}`) + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(181:8) {#each THEMES as theme }",
    		ctx
    	});

    	return block;
    }

    // (178:6) <Select class="bt-settings__control"               value="{theme}"               on:input={onThemeSelect}>
    function create_default_slot$1(ctx) {
    	let each_1_anchor;
    	let each_value = THEMES;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*THEMES, $_*/ 8) {
    				each_value = THEMES;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(178:6) <Select class=\\\"bt-settings__control\\\"               value=\\\"{theme}\\\"               on:input={onThemeSelect}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let div8;
    	let form0;
    	let h20;
    	let t0_value = /*$_*/ ctx[3]("notification_settings.caption") + "";
    	let t0;
    	let t1;
    	let div0;
    	let label0;
    	let t2_value = /*$_*/ ctx[3]("notification_settings.interval_label") + "";
    	let t2;
    	let t3;
    	let t4;
    	let div1;
    	let label1;
    	let t5_value = /*$_*/ ctx[3]("notification_settings.break_label") + "";
    	let t5;
    	let t6;
    	let t7;
    	let div2;
    	let label2;
    	let t8_value = /*$_*/ ctx[3]("notification_settings.message_label") + "";
    	let t8;
    	let t9;
    	let t10;
    	let div4;
    	let label3;
    	let t11_value = /*$_*/ ctx[3]("notification_settings.sound_label") + "";
    	let t11;
    	let t12;
    	let div3;
    	let t13;
    	let t14;
    	let div5;
    	let t15;
    	let form1;
    	let h21;
    	let t16_value = /*$_*/ ctx[3]("app_settings.caption") + "";
    	let t16;
    	let t17;
    	let div6;
    	let label4;
    	let t18_value = /*$_*/ ctx[3]("app_settings.language_label") + "";
    	let t18;
    	let t19;
    	let t20;
    	let div7;
    	let label5;
    	let t21_value = /*$_*/ ctx[3]("app_settings.theme_label") + "";
    	let t21;
    	let t22;
    	let div8_class_value;
    	let current;

    	const input0 = new Input({
    			props: {
    				class: "bt-settings__control",
    				type: "number",
    				placeholder: /*$_*/ ctx[3]("notification_settings.interval_label"),
    				min: "1",
    				value: /*intervalTime*/ ctx[0]
    			},
    			$$inline: true
    		});

    	input0.$on("input", onIntervalChange);

    	const input1 = new Input({
    			props: {
    				class: "bt-settings__control",
    				type: "number",
    				placeholder: /*$_*/ ctx[3]("notification_settings.break_label"),
    				min: "1",
    				value: /*breakTime*/ ctx[1]
    			},
    			$$inline: true
    		});

    	input1.$on("input", onBreakChange);

    	const input2 = new Input({
    			props: {
    				class: "bt-settings__control",
    				placeholder: /*$_*/ ctx[3]("notification_settings.message_label"),
    				value: /*message*/ ctx[2]
    			},
    			$$inline: true
    		});

    	input2.$on("input", onMessageChange);

    	const select0 = new Select({
    			props: {
    				class: "bt-settings__control",
    				value: /*sound*/ ctx[4],
    				$$slots: { default: [create_default_slot_4] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	select0.$on("input", onSoundSelect);

    	const button0 = new Button({
    			props: {
    				class: "bt-settings__button bt-settings__button_sound-sample",
    				type: "button",
    				$$slots: { default: [create_default_slot_3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button0.$on("click", /*click_handler*/ ctx[16]);

    	const button1 = new Button({
    			props: {
    				class: "bt-settings__button bt-settings__button_notification-sample",
    				type: "button",
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button1.$on("click", /*click_handler_1*/ ctx[17]);

    	const select1 = new Select({
    			props: {
    				class: "bt-settings__control",
    				value: /*language*/ ctx[6],
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	select1.$on("input", onLanguageSelect);

    	const select2 = new Select({
    			props: {
    				class: "bt-settings__control",
    				value: /*theme*/ ctx[5],
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	select2.$on("input", onThemeSelect);

    	const block = {
    		c: function create() {
    			div8 = element("div");
    			form0 = element("form");
    			h20 = element("h2");
    			t0 = text(t0_value);
    			t1 = space();
    			div0 = element("div");
    			label0 = element("label");
    			t2 = text(t2_value);
    			t3 = space();
    			create_component(input0.$$.fragment);
    			t4 = space();
    			div1 = element("div");
    			label1 = element("label");
    			t5 = text(t5_value);
    			t6 = space();
    			create_component(input1.$$.fragment);
    			t7 = space();
    			div2 = element("div");
    			label2 = element("label");
    			t8 = text(t8_value);
    			t9 = space();
    			create_component(input2.$$.fragment);
    			t10 = space();
    			div4 = element("div");
    			label3 = element("label");
    			t11 = text(t11_value);
    			t12 = space();
    			div3 = element("div");
    			create_component(select0.$$.fragment);
    			t13 = space();
    			create_component(button0.$$.fragment);
    			t14 = space();
    			div5 = element("div");
    			create_component(button1.$$.fragment);
    			t15 = space();
    			form1 = element("form");
    			h21 = element("h2");
    			t16 = text(t16_value);
    			t17 = space();
    			div6 = element("div");
    			label4 = element("label");
    			t18 = text(t18_value);
    			t19 = space();
    			create_component(select1.$$.fragment);
    			t20 = space();
    			div7 = element("div");
    			label5 = element("label");
    			t21 = text(t21_value);
    			t22 = space();
    			create_component(select2.$$.fragment);
    			attr_dev(h20, "class", "bt-settings__sub-header");
    			add_location(h20, file$5, 110, 4, 2770);
    			attr_dev(label0, "class", "bt-settings__label");
    			add_location(label0, file$5, 112, 6, 2890);
    			attr_dev(div0, "class", "bt-settings__row");
    			add_location(div0, file$5, 111, 4, 2853);
    			attr_dev(label1, "class", "bt-settings__label");
    			add_location(label1, file$5, 121, 6, 3269);
    			attr_dev(div1, "class", "bt-settings__row");
    			add_location(div1, file$5, 120, 4, 3232);
    			attr_dev(label2, "class", "bt-settings__label");
    			add_location(label2, file$5, 130, 6, 3636);
    			attr_dev(div2, "class", "bt-settings__row");
    			add_location(div2, file$5, 129, 4, 3599);
    			attr_dev(label3, "class", "bt-settings__label");
    			add_location(label3, file$5, 137, 6, 3959);
    			attr_dev(div3, "class", "bt-settings__row-splitter");
    			add_location(div3, file$5, 138, 6, 4049);
    			attr_dev(div4, "class", "bt-settings__row");
    			add_location(div4, file$5, 136, 4, 3922);
    			attr_dev(div5, "class", "bt-settings__row");
    			add_location(div5, file$5, 154, 4, 4668);
    			attr_dev(form0, "class", "bt-settings__form");
    			add_location(form0, file$5, 109, 2, 2733);
    			attr_dev(h21, "class", "bt-settings__sub-header");
    			add_location(h21, file$5, 164, 4, 5009);
    			attr_dev(label4, "class", "bt-settings__label");
    			add_location(label4, file$5, 166, 6, 5120);
    			attr_dev(div6, "class", "bt-settings__row");
    			add_location(div6, file$5, 165, 4, 5083);
    			attr_dev(label5, "class", "bt-settings__label");
    			add_location(label5, file$5, 176, 6, 5522);
    			attr_dev(div7, "class", "bt-settings__row");
    			add_location(div7, file$5, 175, 4, 5485);
    			attr_dev(form1, "class", "bt-settings__form");
    			add_location(form1, file$5, 163, 2, 4972);
    			attr_dev(div8, "class", div8_class_value = `bt-settings ${/*$$props*/ ctx[8].class}`);
    			add_location(div8, file$5, 108, 0, 2684);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div8, anchor);
    			append_dev(div8, form0);
    			append_dev(form0, h20);
    			append_dev(h20, t0);
    			append_dev(form0, t1);
    			append_dev(form0, div0);
    			append_dev(div0, label0);
    			append_dev(label0, t2);
    			append_dev(div0, t3);
    			mount_component(input0, div0, null);
    			append_dev(form0, t4);
    			append_dev(form0, div1);
    			append_dev(div1, label1);
    			append_dev(label1, t5);
    			append_dev(div1, t6);
    			mount_component(input1, div1, null);
    			append_dev(form0, t7);
    			append_dev(form0, div2);
    			append_dev(div2, label2);
    			append_dev(label2, t8);
    			append_dev(div2, t9);
    			mount_component(input2, div2, null);
    			append_dev(form0, t10);
    			append_dev(form0, div4);
    			append_dev(div4, label3);
    			append_dev(label3, t11);
    			append_dev(div4, t12);
    			append_dev(div4, div3);
    			mount_component(select0, div3, null);
    			append_dev(div3, t13);
    			mount_component(button0, div3, null);
    			append_dev(form0, t14);
    			append_dev(form0, div5);
    			mount_component(button1, div5, null);
    			append_dev(div8, t15);
    			append_dev(div8, form1);
    			append_dev(form1, h21);
    			append_dev(h21, t16);
    			append_dev(form1, t17);
    			append_dev(form1, div6);
    			append_dev(div6, label4);
    			append_dev(label4, t18);
    			append_dev(div6, t19);
    			mount_component(select1, div6, null);
    			append_dev(form1, t20);
    			append_dev(form1, div7);
    			append_dev(div7, label5);
    			append_dev(label5, t21);
    			append_dev(div7, t22);
    			mount_component(select2, div7, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if ((!current || dirty & /*$_*/ 8) && t0_value !== (t0_value = /*$_*/ ctx[3]("notification_settings.caption") + "")) set_data_dev(t0, t0_value);
    			if ((!current || dirty & /*$_*/ 8) && t2_value !== (t2_value = /*$_*/ ctx[3]("notification_settings.interval_label") + "")) set_data_dev(t2, t2_value);
    			const input0_changes = {};
    			if (dirty & /*$_*/ 8) input0_changes.placeholder = /*$_*/ ctx[3]("notification_settings.interval_label");
    			if (dirty & /*intervalTime*/ 1) input0_changes.value = /*intervalTime*/ ctx[0];
    			input0.$set(input0_changes);
    			if ((!current || dirty & /*$_*/ 8) && t5_value !== (t5_value = /*$_*/ ctx[3]("notification_settings.break_label") + "")) set_data_dev(t5, t5_value);
    			const input1_changes = {};
    			if (dirty & /*$_*/ 8) input1_changes.placeholder = /*$_*/ ctx[3]("notification_settings.break_label");
    			if (dirty & /*breakTime*/ 2) input1_changes.value = /*breakTime*/ ctx[1];
    			input1.$set(input1_changes);
    			if ((!current || dirty & /*$_*/ 8) && t8_value !== (t8_value = /*$_*/ ctx[3]("notification_settings.message_label") + "")) set_data_dev(t8, t8_value);
    			const input2_changes = {};
    			if (dirty & /*$_*/ 8) input2_changes.placeholder = /*$_*/ ctx[3]("notification_settings.message_label");
    			if (dirty & /*message*/ 4) input2_changes.value = /*message*/ ctx[2];
    			input2.$set(input2_changes);
    			if ((!current || dirty & /*$_*/ 8) && t11_value !== (t11_value = /*$_*/ ctx[3]("notification_settings.sound_label") + "")) set_data_dev(t11, t11_value);
    			const select0_changes = {};
    			if (dirty & /*sound*/ 16) select0_changes.value = /*sound*/ ctx[4];

    			if (dirty & /*$$scope, $_*/ 16777224) {
    				select0_changes.$$scope = { dirty, ctx };
    			}

    			select0.$set(select0_changes);
    			const button0_changes = {};

    			if (dirty & /*$$scope*/ 16777216) {
    				button0_changes.$$scope = { dirty, ctx };
    			}

    			button0.$set(button0_changes);
    			const button1_changes = {};

    			if (dirty & /*$$scope, $_*/ 16777224) {
    				button1_changes.$$scope = { dirty, ctx };
    			}

    			button1.$set(button1_changes);
    			if ((!current || dirty & /*$_*/ 8) && t16_value !== (t16_value = /*$_*/ ctx[3]("app_settings.caption") + "")) set_data_dev(t16, t16_value);
    			if ((!current || dirty & /*$_*/ 8) && t18_value !== (t18_value = /*$_*/ ctx[3]("app_settings.language_label") + "")) set_data_dev(t18, t18_value);
    			const select1_changes = {};
    			if (dirty & /*language*/ 64) select1_changes.value = /*language*/ ctx[6];

    			if (dirty & /*$$scope, $_*/ 16777224) {
    				select1_changes.$$scope = { dirty, ctx };
    			}

    			select1.$set(select1_changes);
    			if ((!current || dirty & /*$_*/ 8) && t21_value !== (t21_value = /*$_*/ ctx[3]("app_settings.theme_label") + "")) set_data_dev(t21, t21_value);
    			const select2_changes = {};
    			if (dirty & /*theme*/ 32) select2_changes.value = /*theme*/ ctx[5];

    			if (dirty & /*$$scope, $_*/ 16777224) {
    				select2_changes.$$scope = { dirty, ctx };
    			}

    			select2.$set(select2_changes);

    			if (!current || dirty & /*$$props*/ 256 && div8_class_value !== (div8_class_value = `bt-settings ${/*$$props*/ ctx[8].class}`)) {
    				attr_dev(div8, "class", div8_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(input0.$$.fragment, local);
    			transition_in(input1.$$.fragment, local);
    			transition_in(input2.$$.fragment, local);
    			transition_in(select0.$$.fragment, local);
    			transition_in(button0.$$.fragment, local);
    			transition_in(button1.$$.fragment, local);
    			transition_in(select1.$$.fragment, local);
    			transition_in(select2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(input0.$$.fragment, local);
    			transition_out(input1.$$.fragment, local);
    			transition_out(input2.$$.fragment, local);
    			transition_out(select0.$$.fragment, local);
    			transition_out(button0.$$.fragment, local);
    			transition_out(button1.$$.fragment, local);
    			transition_out(select1.$$.fragment, local);
    			transition_out(select2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div8);
    			destroy_component(input0);
    			destroy_component(input1);
    			destroy_component(input2);
    			destroy_component(select0);
    			destroy_component(button0);
    			destroy_component(button1);
    			destroy_component(select1);
    			destroy_component(select2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function onIntervalChange(event) {
    	const value = parseInt(event.target.value);
    	intervalTime.set(value);
    	lsHelper.setObject("notification-settings", "interval", value);
    }

    function onBreakChange(event) {
    	const value = parseInt(event.target.value);
    	breakTime.set(value);
    	lsHelper.setObject("notification-settings", "break", value);
    }

    function onMessageChange(event) {
    	const { value } = event.target;
    	message.set(event.target.value);
    	lsHelper.setObject("notification-settings", "message", value);
    }

    function onSoundSelect(event) {
    	const { value } = event.target;
    	sound.set(value);
    	lsHelper.setObject("notification-settings", "sound", value);
    }

    function onLanguageSelect(event) {
    	const { value } = event.target;
    	language.set(value);
    	lsHelper.setObject("app-settings", "language", value);
    	location.search = `lang=${value}`;
    }

    function onThemeSelect(event) {
    	const { value } = event.target;
    	theme.set(value);
    	lsHelper.setObject("app-settings", "theme", value);
    }

    function playSound() {
    	document.getElementById("bt-sound-audio").play();
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let $_;
    	validate_store(X, "_");
    	component_subscribe($$self, X, $$value => $$invalidate(3, $_ = $$value));
    	const dispatch = createEventDispatcher();
    	let intervalTime$1;
    	let breakTime$1;
    	let message$1;
    	let sound$1;
    	let theme$1;
    	let language$1;

    	const intervalTimeListener = intervalTime.subscribe(value => {
    		$$invalidate(0, intervalTime$1 = value);
    	});

    	const breakTimeListener = breakTime.subscribe(value => {
    		$$invalidate(1, breakTime$1 = value);
    	});

    	const messageListener = message.subscribe(value => {
    		$$invalidate(2, message$1 = value);
    	});

    	const soundListener = sound.subscribe(value => {
    		$$invalidate(4, sound$1 = value);
    	});

    	const themeListener = theme.subscribe(value => {
    		$$invalidate(5, theme$1 = value);
    	});

    	const languageListener = language.subscribe(value => {
    		$$invalidate(6, language$1 = value);
    	});

    	function dispatchRunExample(entity) {
    		dispatch("run-example", { entity });
    	}

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Settings", $$slots, []);
    	const click_handler = () => dispatchRunExample("sound");
    	const click_handler_1 = () => dispatchRunExample("notification");

    	$$self.$set = $$new_props => {
    		$$invalidate(8, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		_: X,
    		lsHelper,
    		Input,
    		Select,
    		Button,
    		SOUNDS,
    		LANGUAGES,
    		THEMES,
    		storeIntervalTime: intervalTime,
    		storeBreakTime: breakTime,
    		storeMessage: message,
    		storeSound: sound,
    		storeTheme: theme,
    		storeLanguage: language,
    		dispatch,
    		intervalTime: intervalTime$1,
    		breakTime: breakTime$1,
    		message: message$1,
    		sound: sound$1,
    		theme: theme$1,
    		language: language$1,
    		intervalTimeListener,
    		breakTimeListener,
    		messageListener,
    		soundListener,
    		themeListener,
    		languageListener,
    		onIntervalChange,
    		onBreakChange,
    		onMessageChange,
    		onSoundSelect,
    		onLanguageSelect,
    		onThemeSelect,
    		dispatchRunExample,
    		playSound,
    		$_
    	});

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(8, $$props = assign(assign({}, $$props), $$new_props));
    		if ("intervalTime" in $$props) $$invalidate(0, intervalTime$1 = $$new_props.intervalTime);
    		if ("breakTime" in $$props) $$invalidate(1, breakTime$1 = $$new_props.breakTime);
    		if ("message" in $$props) $$invalidate(2, message$1 = $$new_props.message);
    		if ("sound" in $$props) $$invalidate(4, sound$1 = $$new_props.sound);
    		if ("theme" in $$props) $$invalidate(5, theme$1 = $$new_props.theme);
    		if ("language" in $$props) $$invalidate(6, language$1 = $$new_props.language);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);

    	return [
    		intervalTime$1,
    		breakTime$1,
    		message$1,
    		$_,
    		sound$1,
    		theme$1,
    		language$1,
    		dispatchRunExample,
    		$$props,
    		dispatch,
    		intervalTimeListener,
    		breakTimeListener,
    		messageListener,
    		soundListener,
    		themeListener,
    		languageListener,
    		click_handler,
    		click_handler_1
    	];
    }

    class Settings extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Settings",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/components/Link.svelte generated by Svelte v3.20.1 */

    const file$6 = "src/components/Link.svelte";

    function create_fragment$6(ctx) {
    	let a;
    	let a_class_value;
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

    	const block = {
    		c: function create() {
    			a = element("a");
    			if (default_slot) default_slot.c();
    			attr_dev(a, "class", a_class_value = `bt-link ${/*$$props*/ ctx[2].class}`);
    			attr_dev(a, "href", /*href*/ ctx[0]);
    			attr_dev(a, "target", /*target*/ ctx[1]);
    			add_location(a, file$6, 5, 0, 71);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);

    			if (default_slot) {
    				default_slot.m(a, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 8) {
    					default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[3], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[3], dirty, null));
    				}
    			}

    			if (!current || dirty & /*$$props*/ 4 && a_class_value !== (a_class_value = `bt-link ${/*$$props*/ ctx[2].class}`)) {
    				attr_dev(a, "class", a_class_value);
    			}

    			if (!current || dirty & /*href*/ 1) {
    				attr_dev(a, "href", /*href*/ ctx[0]);
    			}

    			if (!current || dirty & /*target*/ 2) {
    				attr_dev(a, "target", /*target*/ ctx[1]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { href } = $$props;
    	let { target = "_blank" } = $$props;
    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Link", $$slots, ['default']);

    	$$self.$set = $$new_props => {
    		$$invalidate(2, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ("href" in $$new_props) $$invalidate(0, href = $$new_props.href);
    		if ("target" in $$new_props) $$invalidate(1, target = $$new_props.target);
    		if ("$$scope" in $$new_props) $$invalidate(3, $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => ({ href, target });

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(2, $$props = assign(assign({}, $$props), $$new_props));
    		if ("href" in $$props) $$invalidate(0, href = $$new_props.href);
    		if ("target" in $$props) $$invalidate(1, target = $$new_props.target);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [href, target, $$props, $$scope, $$slots];
    }

    class Link extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { href: 0, target: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Link",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*href*/ ctx[0] === undefined && !("href" in props)) {
    			console.warn("<Link> was created without expected prop 'href'");
    		}
    	}

    	get href() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set href(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get target() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set target(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/views/Links.svelte generated by Svelte v3.20.1 */
    const file$7 = "src/views/Links.svelte";

    // (7:4) <Link href="http://github.com/nbrylevv/breaktify-web-app">
    function create_default_slot$2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("GitHub");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$2.name,
    		type: "slot",
    		source: "(7:4) <Link href=\\\"http://github.com/nbrylevv/breaktify-web-app\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let ul;
    	let li;
    	let ul_class_value;
    	let current;

    	const link = new Link({
    			props: {
    				href: "http://github.com/nbrylevv/breaktify-web-app",
    				$$slots: { default: [create_default_slot$2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			ul = element("ul");
    			li = element("li");
    			create_component(link.$$.fragment);
    			attr_dev(li, "class", "bt-links__item");
    			add_location(li, file$7, 5, 2, 113);
    			attr_dev(ul, "class", ul_class_value = `bt-links ${/*$$props*/ ctx[0].class}`);
    			add_location(ul, file$7, 4, 0, 68);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, ul, anchor);
    			append_dev(ul, li);
    			mount_component(link, li, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const link_changes = {};

    			if (dirty & /*$$scope*/ 2) {
    				link_changes.$$scope = { dirty, ctx };
    			}

    			link.$set(link_changes);

    			if (!current || dirty & /*$$props*/ 1 && ul_class_value !== (ul_class_value = `bt-links ${/*$$props*/ ctx[0].class}`)) {
    				attr_dev(ul, "class", ul_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(link.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(link.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(ul);
    			destroy_component(link);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Links", $$slots, []);

    	$$self.$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$capture_state = () => ({ Link });

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class Links extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Links",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src/views/NoBrowserSupport.svelte generated by Svelte v3.20.1 */
    const file$8 = "src/views/NoBrowserSupport.svelte";

    function create_fragment$8(ctx) {
    	let div;
    	let t0_value = /*$_*/ ctx[0]("no_browser_support.your_browser_doesnt_support_notification") + "";
    	let t0;
    	let t1;
    	let br;
    	let t2;
    	let t3_value = /*$_*/ ctx[0]("no_browser_support.update_and_come_back") + "";
    	let t3;
    	let t4;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = text(".");
    			br = element("br");
    			t2 = space();
    			t3 = text(t3_value);
    			t4 = text(" :)");
    			add_location(br, file$8, 5, 70, 131);
    			add_location(div, file$8, 4, 0, 55);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			append_dev(div, br);
    			append_dev(div, t2);
    			append_dev(div, t3);
    			append_dev(div, t4);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$_*/ 1 && t0_value !== (t0_value = /*$_*/ ctx[0]("no_browser_support.your_browser_doesnt_support_notification") + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*$_*/ 1 && t3_value !== (t3_value = /*$_*/ ctx[0]("no_browser_support.update_and_come_back") + "")) set_data_dev(t3, t3_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let $_;
    	validate_store(X, "_");
    	component_subscribe($$self, X, $$value => $$invalidate(0, $_ = $$value));
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<NoBrowserSupport> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("NoBrowserSupport", $$slots, []);
    	$$self.$capture_state = () => ({ _: X, $_ });
    	return [$_];
    }

    class NoBrowserSupport extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NoBrowserSupport",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    class Notifications {

      constructor() {
        this.currentNotification = null;
      }

      get hasBrowserSupport() {
        return "Notification" in window;
      }

      get hasPermission() {
        return Notification.permission === 'granted';
      }

      get permissionStatus() {
        return Notification.permission;
      }

      requestPermission(callback) {
        Notification.requestPermission().then((permission) => {
          if (callback && typeof callback === 'function') {
            callback(permission);
          }
        });
      }

      create(text, options) {
        if (this.hasPermission) {
          this.close();
          this.currentNotification = new Notification(text, options || void 0);
          this.currentNotification.onclick = () => {
            this.close();
          };
        }
      }

      close() {
        if (this.currentNotification) {
          this.currentNotification.close();
          this.currentNotification = null;
        }
      }
    }

    /* src/views/AllowNotifications.svelte generated by Svelte v3.20.1 */
    const file$9 = "src/views/AllowNotifications.svelte";

    // (20:2) {#if notifications.permissionStatus === 'denied' }
    function create_if_block_1$1(ctx) {
    	let div;
    	let span;
    	let t_value = /*$_*/ ctx[0]("allow_notifications.allow") + "";
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			t = text(t_value);
    			attr_dev(span, "class", "bt-allow-notify__arrow-message");
    			add_location(span, file$9, 21, 6, 473);
    			attr_dev(div, "class", "bt-allow-notify__arrow");
    			add_location(div, file$9, 20, 4, 430);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$_*/ 1 && t_value !== (t_value = /*$_*/ ctx[0]("allow_notifications.allow") + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(20:2) {#if notifications.permissionStatus === 'denied' }",
    		ctx
    	});

    	return block;
    }

    // (28:4) {:else}
    function create_else_block$1(ctx) {
    	let t0_value = /*$_*/ ctx[0]("allow_notifications.you_need_allow_notifications") + "";
    	let t0;
    	let t1;
    	let current;

    	const button = new Button({
    			props: {
    				class: "bt-button_blue bt-allow-notify__button",
    				$$slots: { default: [create_default_slot$3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button.$on("click", /*click_handler*/ ctx[2]);

    	const block = {
    		c: function create() {
    			t0 = text(t0_value);
    			t1 = space();
    			create_component(button.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty & /*$_*/ 1) && t0_value !== (t0_value = /*$_*/ ctx[0]("allow_notifications.you_need_allow_notifications") + "")) set_data_dev(t0, t0_value);
    			const button_changes = {};

    			if (dirty & /*$$scope, $_*/ 9) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    			destroy_component(button, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(28:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (26:4) {#if notifications.permissionStatus === 'denied' }
    function create_if_block$1(ctx) {
    	let t_value = /*$_*/ ctx[0]("allow_notifications.to_use_app_you_need_allow_notifications") + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$_*/ 1 && t_value !== (t_value = /*$_*/ ctx[0]("allow_notifications.to_use_app_you_need_allow_notifications") + "")) set_data_dev(t, t_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(26:4) {#if notifications.permissionStatus === 'denied' }",
    		ctx
    	});

    	return block;
    }

    // (30:6) <Button on:click={() => notifications.requestPermission(requestPermissionCallback)}               class="bt-button_blue bt-allow-notify__button">
    function create_default_slot$3(ctx) {
    	let t_value = /*$_*/ ctx[0]("allow_notifications.allow") + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$_*/ 1 && t_value !== (t_value = /*$_*/ ctx[0]("allow_notifications.allow") + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$3.name,
    		type: "slot",
    		source: "(30:6) <Button on:click={() => notifications.requestPermission(requestPermissionCallback)}               class=\\\"bt-button_blue bt-allow-notify__button\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$9(ctx) {
    	let div1;
    	let t;
    	let div0;
    	let current_block_type_index;
    	let if_block1;
    	let current;
    	let if_block0 = /*notifications*/ ctx[1].permissionStatus === "denied" && create_if_block_1$1(ctx);
    	const if_block_creators = [create_if_block$1, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*notifications*/ ctx[1].permissionStatus === "denied") return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			if (if_block0) if_block0.c();
    			t = space();
    			div0 = element("div");
    			if_block1.c();
    			attr_dev(div0, "class", "bt-allow-notify__message");
    			add_location(div0, file$9, 24, 2, 580);
    			attr_dev(div1, "class", "bt-allow-notify");
    			add_location(div1, file$9, 18, 0, 343);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			if (if_block0) if_block0.m(div1, null);
    			append_dev(div1, t);
    			append_dev(div1, div0);
    			if_blocks[current_block_type_index].m(div0, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*notifications*/ ctx[1].permissionStatus === "denied") if_block0.p(ctx, dirty);
    			if_block1.p(ctx, dirty);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (if_block0) if_block0.d();
    			if_blocks[current_block_type_index].d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function requestPermissionCallback(permission) {
    	if (permission === "granted") {
    		location.reload();
    	}
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let $_;
    	validate_store(X, "_");
    	component_subscribe($$self, X, $$value => $$invalidate(0, $_ = $$value));
    	const notifications = new Notifications();
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<AllowNotifications> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("AllowNotifications", $$slots, []);
    	const click_handler = () => notifications.requestPermission(requestPermissionCallback);

    	$$self.$capture_state = () => ({
    		_: X,
    		Button,
    		Notifications,
    		notifications,
    		requestPermissionCallback,
    		$_
    	});

    	return [$_, notifications, click_handler];
    }

    class AllowNotifications extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AllowNotifications",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    const FAVICONS = {
      [STATES.action]: 'favicon-action.ico',
      [STATES.break]: 'favicon-break.ico',
      [STATES.stopped]: 'favicon-stopped.ico',
    };

    /* src/App.svelte generated by Svelte v3.20.1 */
    const file$a = "src/App.svelte";

    // (194:2) {:else}
    function create_else_block$2(ctx) {
    	let div0;
    	let t0;
    	let div2;
    	let div1;
    	let t2;
    	let t3;
    	let current;

    	const panel = new Panel({
    			props: { class: "bt-app__panel" },
    			$$inline: true
    		});

    	const settings_1 = new Settings({
    			props: { class: "bt-app__settings" },
    			$$inline: true
    		});

    	settings_1.$on("run-example", /*runExample*/ ctx[1]);

    	const links = new Links({
    			props: { class: "bt-app__links" },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			create_component(panel.$$.fragment);
    			t0 = space();
    			div2 = element("div");
    			div1 = element("div");
    			div1.textContent = "Breaktify!";
    			t2 = space();
    			create_component(settings_1.$$.fragment);
    			t3 = space();
    			create_component(links.$$.fragment);
    			attr_dev(div0, "class", "bt-layout__side bt-layout__side_left");
    			add_location(div0, file$a, 194, 3, 4220);
    			attr_dev(div1, "class", "bt-app__header");
    			add_location(div1, file$a, 198, 4, 4376);
    			attr_dev(div2, "class", "bt-layout__side bt-layout__side_right");
    			add_location(div2, file$a, 197, 3, 4320);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			mount_component(panel, div0, null);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div2, t2);
    			mount_component(settings_1, div2, null);
    			append_dev(div2, t3);
    			mount_component(links, div2, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(panel.$$.fragment, local);
    			transition_in(settings_1.$$.fragment, local);
    			transition_in(links.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(panel.$$.fragment, local);
    			transition_out(settings_1.$$.fragment, local);
    			transition_out(links.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			destroy_component(panel);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div2);
    			destroy_component(settings_1);
    			destroy_component(links);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(194:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (192:42) 
    function create_if_block_1$2(ctx) {
    	let current;
    	const allownotifications = new AllowNotifications({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(allownotifications.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(allownotifications, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(allownotifications.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(allownotifications.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(allownotifications, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(192:42) ",
    		ctx
    	});

    	return block;
    }

    // (190:2) {#if !notifications.hasBrowserSupport }
    function create_if_block$2(ctx) {
    	let current;
    	const nobrowsersupport = new NoBrowserSupport({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(nobrowsersupport.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(nobrowsersupport, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(nobrowsersupport.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(nobrowsersupport.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(nobrowsersupport, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(190:2) {#if !notifications.hasBrowserSupport }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$a(ctx) {
    	let main;
    	let div0;
    	let current_block_type_index;
    	let if_block;
    	let t;
    	let div1;
    	let current;
    	const if_block_creators = [create_if_block$2, create_if_block_1$2, create_else_block$2];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (!/*notifications*/ ctx[0].hasBrowserSupport) return 0;
    		if (!/*notifications*/ ctx[0].hasPermission) return 1;
    		return 2;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			div0 = element("div");
    			if_block.c();
    			t = space();
    			div1 = element("div");
    			attr_dev(div0, "class", "bt-layout");
    			add_location(div0, file$a, 188, 1, 4048);
    			attr_dev(div1, "id", "bt-sound-wrapper");
    			attr_dev(div1, "class", "bt-app__sound");
    			add_location(div1, file$a, 205, 1, 4563);
    			attr_dev(main, "class", "bt-app");
    			add_location(main, file$a, 187, 0, 4025);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div0);
    			if_blocks[current_block_type_index].m(div0, null);
    			append_dev(main, t);
    			append_dev(main, div1);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if_block.p(ctx, dirty);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if_blocks[current_block_type_index].d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function applyTheme(value) {
    	const lightThemeClass = "theme_light";
    	const darkThemeClass = "theme_dark";

    	if (value === "light") {
    		document.body.classList.add(lightThemeClass);
    		document.body.classList.remove(darkThemeClass);
    	} else {
    		document.body.classList.add(darkThemeClass);
    		document.body.classList.remove(lightThemeClass);
    	}
    }

    function applySound(soundId) {
    	const selectedSound = SOUNDS.find(_ => _.id === soundId);

    	if (!document.getElementById("bt-sound-wrapper")) {
    		return;
    	}

    	if (!selectedSound) {
    		document.getElementById("bt-sound-wrapper").innerHTML = "";
    		return;
    	}

    	const mp3Source = "<source src=\"" + selectedSound.mp3 + "\" type=\"audio/mpeg\">";
    	const oggSource = "<source src=\"" + selectedSound.ogg + "\" type=\"audio/ogg\">";
    	document.getElementById("bt-sound-wrapper").innerHTML = "<audio id=\"bt-sound-audio\">" + mp3Source + oggSource + "</audio>";
    }

    function playSound$1() {
    	const audio = document.getElementById("bt-sound-audio");
    	audio.currentTime = 0;
    	audio.play();
    }

    function instance$a($$self, $$props, $$invalidate) {
    	const notifications = new Notifications();

    	// const documentFavicon = new DocumentFavicon();
    	let isMounted = false;

    	let actionTimerId = null;
    	let breakTimerId = null;
    	let settings = {};
    	let currentState = null;

    	const settingsListener = settingsWatcher.subscribe(value => {
    		settings = value;
    		state.set(STATES.stopped);
    	});

    	const soundListener = sound.subscribe(value => {
    		if (isMounted) {
    			applySound(value);
    		}
    	});

    	onMount(() => {
    		isMounted = true;
    		applySound(settings.sound);
    	});

    	const stateListener = state.subscribe(value => {
    		currentState = value;

    		switch (value) {
    			case STATES.action:
    				// documentFavicon.update(FAVICONS[value]);
    				if (!actionTimerId) {
    					startActionTimer();
    				}
    				break;
    			case STATES.stopped:
    				// documentFavicon.update(FAVICONS[value]);
    				stopActionTimer();
    				stopBreakTimer();
    				break;
    		}
    	});

    	const themeListener = theme.subscribe(value => applyTheme(value));

    	function startActionTimer() {
    		stopActionTimer();

    		if (currentState !== STATES.action) {
    			state.set(STATES.action);
    		}

    		actionTimerId = setInterval(
    			() => {
    				notificate();
    				startBreakTimer();
    			},
    			settings.intervalTime * 1000 * 60
    		);
    	}

    	function stopActionTimer(changeStatus = false) {
    		clearInterval(actionTimerId);

    		if (changeStatus) {
    			state.set(STATES.stopped);
    		}
    	}

    	function startBreakTimer() {
    		state.set(STATES.break);
    		stopActionTimer();

    		breakTimerId = setTimeout(
    			() => {
    				stopBreakTimer();
    				startActionTimer();
    			},
    			settings.breakTime * 1000
    		);
    	}

    	function stopBreakTimer() {
    		clearTimeout(breakTimerId);
    	}

    	function notificate() {
    		if (settings.sound) {
    			playSound$1();
    		}

    		notifications.create("Breaktify!", {
    			body: `${settings.message || ""}`,
    			// image: './images/palm.png', // app-logo
    			icon: "./images/favicon.png"
    		});
    	}

    	function runExample(event) {
    		const { entity } = event.detail;

    		switch (entity) {
    			case "sound":
    				playSound$1();
    				break;
    			case "notification":
    				notificate();
    				break;
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	$$self.$capture_state = () => ({
    		onMount,
    		Panel,
    		Settings,
    		Links,
    		NoBrowserSupport,
    		AllowNotifications,
    		settingsWatcher,
    		storeSound: sound,
    		theme,
    		state,
    		Notifications,
    		STATES,
    		FAVICONS,
    		SOUNDS,
    		notifications,
    		isMounted,
    		actionTimerId,
    		breakTimerId,
    		settings,
    		currentState,
    		settingsListener,
    		soundListener,
    		stateListener,
    		themeListener,
    		startActionTimer,
    		stopActionTimer,
    		startBreakTimer,
    		stopBreakTimer,
    		notificate,
    		applyTheme,
    		applySound,
    		playSound: playSound$1,
    		runExample
    	});

    	$$self.$inject_state = $$props => {
    		if ("isMounted" in $$props) isMounted = $$props.isMounted;
    		if ("actionTimerId" in $$props) actionTimerId = $$props.actionTimerId;
    		if ("breakTimerId" in $$props) breakTimerId = $$props.breakTimerId;
    		if ("settings" in $$props) settings = $$props.settings;
    		if ("currentState" in $$props) currentState = $$props.currentState;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [notifications, runExample];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    const notification_settings={caption:"Настройки уведомлений",interval_label:"Интервал (мин)",break_label:"Перерыв (сек)",message_label:"Сообщение",sound_label:"Звуковое уведомление",show_notification:"Показать уведомление"};const app_settings={caption:"Настройки приложения",language_label:"Язык",theme_label:"Тема оформления"};const panel={start_timer:"Начать отсчет",next_break_in:"Следующий перерыв через",break_ends_in:"Перерыв закончится через",in_minutes:"минут",in_seconds:"секунд"};const constants={sounds:{no_sound:"Без звука"},themes:{dark:"Темная",light:"Светлая"},languages:{russian:"Русский",english:"English"}};const no_browser_support={your_browser_doesnt_support_notification:"Ваш браузер не поддерживает уведомления",update_and_come_back:"Обновитесь и обязательно возвращайтесь"};const allow_notifications={to_use_app_you_need_allow_notifications:"Для работы приложения необходимо разрешить уведомления",you_need_allow_notifications:"Необходимо разрешить уведомления",allow:"Разрешить"};var ru = {notification_settings:notification_settings,app_settings:app_settings,panel:panel,constants:constants,no_browser_support:no_browser_support,allow_notifications:allow_notifications};

    const notification_settings$1={caption:"Notification settings",interval_label:"Interval (min)",break_label:"Break (sec)",message_label:"Message",sound_label:"Sound",show_notification:"Show notification"};const app_settings$1={caption:"Application settings",language_label:"Language",theme_label:"Theme"};const panel$1={start_timer:"Start timer",next_break_in:"Next break in",break_ends_in:"Break ends in",in_minutes:"minutes",in_seconds:"seconds"};const constants$1={sounds:{no_sound:"No sound"},themes:{dark:"Dark",light:"Light"},languages:{russian:"Русский",english:"English"}};const no_browser_support$1={your_browser_doesnt_support_notification:"Your browser does not support notifications",update_and_come_back:"Please, update it and come back"};const allow_notifications$1={to_use_app_you_need_allow_notifications:"To use this web app you need allow notifications",you_need_allow_notifications:"You need allow notifications",allow:"Разрешить"};var en$1 = {notification_settings:notification_settings$1,app_settings:app_settings$1,panel:panel$1,constants:constants$1,no_browser_support:no_browser_support$1,allow_notifications:allow_notifications$1};

    s('ru', ru);
    s('en', en$1);

    y({
      fallbackLocale: 'en',
      initialLocale: A('lang') || lsHelper.getObject('app-settings', 'language') || 'ru',
    });

    const app = new App({
    	target: document.body,
    });

    return app;

}());
//# sourceMappingURL=app.js.map
