
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
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
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

    /* src/components/Button.svelte generated by Svelte v3.20.1 */

    const file = "src/components/Button.svelte";

    function create_fragment(ctx) {
    	let button;
    	let button_class_value;
    	let current;
    	let dispose;
    	const default_slot_template = /*$$slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	const block = {
    		c: function create() {
    			button = element("button");
    			if (default_slot) default_slot.c();
    			attr_dev(button, "class", button_class_value = `bt-button ${/*$$props*/ ctx[0].class}`);
    			add_location(button, file, 0, 0, 0);
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
    			dispose = listen_dev(button, "click", /*click_handler*/ ctx[3], false, false, false);
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 2) {
    					default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[1], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null));
    				}
    			}

    			if (!current || dirty & /*$$props*/ 1 && button_class_value !== (button_class_value = `bt-button ${/*$$props*/ ctx[0].class}`)) {
    				attr_dev(button, "class", button_class_value);
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
    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Button", $$slots, ['default']);

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ("$$scope" in $$new_props) $$invalidate(1, $$scope = $$new_props.$$scope);
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props, $$scope, $$slots, click_handler];
    }

    class Button extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Button",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const STATES = {
      action: 'action',
      break: 'break',
      stopped: 'stopped',
    };

    const ICONS = {
      [STATES.action]: 'sandtime.png',
      [STATES.break]: 'palm.png',
      [STATES.stopped]: 'timer.png',
    };

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

    const state = writable(STATES.stopped);

    /* src/views/Panel.svelte generated by Svelte v3.20.1 */
    const file$1 = "src/views/Panel.svelte";

    // (24:4) {:else}
    function create_else_block(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			attr_dev(span, "class", "bt-pause-icon");
    			add_location(span, file$1, 24, 6, 733);
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
    		id: create_else_block.name,
    		type: "else",
    		source: "(24:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (22:4) {#if currentState === STATES.stopped }
    function create_if_block(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			attr_dev(span, "class", "bt-start-icon");
    			add_location(span, file$1, 22, 6, 684);
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
    		id: create_if_block.name,
    		type: "if",
    		source: "(22:4) {#if currentState === STATES.stopped }",
    		ctx
    	});

    	return block;
    }

    // (21:2) <Button class="bt-panel__button" on:click={onButtonClick}>
    function create_default_slot(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*currentState*/ ctx[0] === STATES.stopped) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(21:2) <Button class=\\\"bt-panel__button\\\" on:click={onButtonClick}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div1;
    	let div0;
    	let div0_class_value;
    	let t;
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

    	button.$on("click", /*onButtonClick*/ ctx[1]);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			t = space();
    			create_component(button.$$.fragment);
    			attr_dev(div0, "class", div0_class_value = `bt-panel__state-icon bt-panel__state-icon_${ICONS[/*currentState*/ ctx[0]].replace(".png", "")}`);
    			add_location(div0, file$1, 19, 2, 469);
    			attr_dev(div1, "class", div1_class_value = `bt-panel ${/*$$props*/ ctx[2].class}`);
    			add_location(div1, file$1, 18, 0, 423);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div1, t);
    			mount_component(button, div1, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*currentState*/ 1 && div0_class_value !== (div0_class_value = `bt-panel__state-icon bt-panel__state-icon_${ICONS[/*currentState*/ ctx[0]].replace(".png", "")}`)) {
    				attr_dev(div0, "class", div0_class_value);
    			}

    			const button_changes = {};

    			if (dirty & /*$$scope, currentState*/ 17) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);

    			if (!current || dirty & /*$$props*/ 4 && div1_class_value !== (div1_class_value = `bt-panel ${/*$$props*/ ctx[2].class}`)) {
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
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let currentState;

    	const stateListener = state.subscribe(value => {
    		$$invalidate(0, currentState = value);
    	});

    	function onButtonClick() {
    		state.set(currentState === STATES.stopped
    		? STATES.action
    		: STATES.stopped);
    	}

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Panel", $$slots, []);

    	$$self.$set = $$new_props => {
    		$$invalidate(2, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$capture_state = () => ({
    		Button,
    		STATES,
    		ICONS,
    		state,
    		currentState,
    		stateListener,
    		onButtonClick
    	});

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(2, $$props = assign(assign({}, $$props), $$new_props));
    		if ("currentState" in $$props) $$invalidate(0, currentState = $$new_props.currentState);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [currentState, onButtonClick, $$props];
    }

    class Panel extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Panel",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/components/Input.svelte generated by Svelte v3.20.1 */

    const file$2 = "src/components/Input.svelte";

    function create_fragment$2(ctx) {
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
    			add_location(input, file$2, 7, 0, 103);
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
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
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

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			type: 0,
    			placeholder: 1,
    			value: 2,
    			min: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Input",
    			options,
    			id: create_fragment$2.name
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

    const intervalTime = writable(15);
    const breakTime = writable(15);
    const notificationMessage = writable('Пришло время перерыва!');

    const settingsWatcher = derived(
      [intervalTime, breakTime, notificationMessage],
      ([intervalTime, breakTime, notificationMessage]) => ({
        intervalTime,
        breakTime,
        notificationMessage,
      })
    );

    /* src/views/Settings.svelte generated by Svelte v3.20.1 */

    const file$3 = "src/views/Settings.svelte";

    function create_fragment$3(ctx) {
    	let form;
    	let h1;
    	let t1;
    	let div0;
    	let label0;
    	let t3;
    	let t4;
    	let div1;
    	let label1;
    	let t6;
    	let t7;
    	let div2;
    	let label2;
    	let t9;
    	let form_class_value;
    	let current;

    	const input0 = new Input({
    			props: {
    				class: "bt-settings__control",
    				type: "number",
    				placeholder: "Интервал",
    				min: "0",
    				value: /*intervalTime*/ ctx[0]
    			},
    			$$inline: true
    		});

    	input0.$on("input", onIntervalChange);

    	const input1 = new Input({
    			props: {
    				class: "bt-settings__control",
    				type: "number",
    				placeholder: "Перерыв",
    				min: "0",
    				value: /*breakTime*/ ctx[1]
    			},
    			$$inline: true
    		});

    	input1.$on("input", onBreakChange);

    	const input2 = new Input({
    			props: {
    				class: "bt-settings__control",
    				placeholder: "Сообщение",
    				value: /*message*/ ctx[2]
    			},
    			$$inline: true
    		});

    	input2.$on("input", onMessageChange);

    	const block = {
    		c: function create() {
    			form = element("form");
    			h1 = element("h1");
    			h1.textContent = "Breaktify";
    			t1 = space();
    			div0 = element("div");
    			label0 = element("label");
    			label0.textContent = "Интервал (мин)";
    			t3 = space();
    			create_component(input0.$$.fragment);
    			t4 = space();
    			div1 = element("div");
    			label1 = element("label");
    			label1.textContent = "Перерыв (сек)";
    			t6 = space();
    			create_component(input1.$$.fragment);
    			t7 = space();
    			div2 = element("div");
    			label2 = element("label");
    			label2.textContent = "Сообщение";
    			t9 = space();
    			create_component(input2.$$.fragment);
    			attr_dev(h1, "class", "bt-settings__header");
    			add_location(h1, file$3, 40, 2, 986);
    			attr_dev(label0, "class", "bt-settings__label");
    			add_location(label0, file$3, 42, 4, 1070);
    			attr_dev(div0, "class", "bt-settings__row");
    			add_location(div0, file$3, 41, 2, 1035);
    			attr_dev(label1, "class", "bt-settings__label");
    			add_location(label1, file$3, 51, 4, 1365);
    			attr_dev(div1, "class", "bt-settings__row");
    			add_location(div1, file$3, 50, 2, 1330);
    			attr_dev(label2, "class", "bt-settings__label");
    			add_location(label2, file$3, 60, 4, 1652);
    			attr_dev(div2, "class", "bt-settings__row");
    			add_location(div2, file$3, 59, 2, 1617);
    			attr_dev(form, "class", form_class_value = `bt-settings ${/*$$props*/ ctx[3].class}`);
    			add_location(form, file$3, 39, 0, 936);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, form, anchor);
    			append_dev(form, h1);
    			append_dev(form, t1);
    			append_dev(form, div0);
    			append_dev(div0, label0);
    			append_dev(div0, t3);
    			mount_component(input0, div0, null);
    			append_dev(form, t4);
    			append_dev(form, div1);
    			append_dev(div1, label1);
    			append_dev(div1, t6);
    			mount_component(input1, div1, null);
    			append_dev(form, t7);
    			append_dev(form, div2);
    			append_dev(div2, label2);
    			append_dev(div2, t9);
    			mount_component(input2, div2, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const input0_changes = {};
    			if (dirty & /*intervalTime*/ 1) input0_changes.value = /*intervalTime*/ ctx[0];
    			input0.$set(input0_changes);
    			const input1_changes = {};
    			if (dirty & /*breakTime*/ 2) input1_changes.value = /*breakTime*/ ctx[1];
    			input1.$set(input1_changes);
    			const input2_changes = {};
    			if (dirty & /*message*/ 4) input2_changes.value = /*message*/ ctx[2];
    			input2.$set(input2_changes);

    			if (!current || dirty & /*$$props*/ 8 && form_class_value !== (form_class_value = `bt-settings ${/*$$props*/ ctx[3].class}`)) {
    				attr_dev(form, "class", form_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(input0.$$.fragment, local);
    			transition_in(input1.$$.fragment, local);
    			transition_in(input2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(input0.$$.fragment, local);
    			transition_out(input1.$$.fragment, local);
    			transition_out(input2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(form);
    			destroy_component(input0);
    			destroy_component(input1);
    			destroy_component(input2);
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

    function onIntervalChange(event) {
    	const value = parseInt(event.target.value);
    	intervalTime.set(value);
    }

    function onBreakChange(event) {
    	const value = parseInt(event.target.value);
    	breakTime.set(value);
    }

    function onMessageChange(event) {
    	notificationMessage.set(event.target.value);
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let intervalTime$1;
    	let breakTime$1;
    	let message;

    	const intervalTimeListener = intervalTime.subscribe(value => {
    		$$invalidate(0, intervalTime$1 = value);
    	});

    	const breakTimeListener = breakTime.subscribe(value => {
    		$$invalidate(1, breakTime$1 = value);
    	});

    	const messageListener = notificationMessage.subscribe(value => {
    		$$invalidate(2, message = value);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Settings", $$slots, []);

    	$$self.$set = $$new_props => {
    		$$invalidate(3, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$capture_state = () => ({
    		Input,
    		Button,
    		storeIntervalTime: intervalTime,
    		storeBreakTime: breakTime,
    		storeMessage: notificationMessage,
    		intervalTime: intervalTime$1,
    		breakTime: breakTime$1,
    		message,
    		intervalTimeListener,
    		breakTimeListener,
    		messageListener,
    		onIntervalChange,
    		onBreakChange,
    		onMessageChange
    	});

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(3, $$props = assign(assign({}, $$props), $$new_props));
    		if ("intervalTime" in $$props) $$invalidate(0, intervalTime$1 = $$new_props.intervalTime);
    		if ("breakTime" in $$props) $$invalidate(1, breakTime$1 = $$new_props.breakTime);
    		if ("message" in $$props) $$invalidate(2, message = $$new_props.message);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [intervalTime$1, breakTime$1, message, $$props];
    }

    class Settings extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Settings",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/components/Link.svelte generated by Svelte v3.20.1 */

    const file$4 = "src/components/Link.svelte";

    function create_fragment$4(ctx) {
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
    			add_location(a, file$4, 5, 0, 71);
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
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { href: 0, target: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Link",
    			options,
    			id: create_fragment$4.name
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
    const file$5 = "src/views/Links.svelte";

    // (7:4) <Link href="http://github.com/nbrylevv">
    function create_default_slot$1(ctx) {
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
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(7:4) <Link href=\\\"http://github.com/nbrylevv\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let ul;
    	let li;
    	let ul_class_value;
    	let current;

    	const link = new Link({
    			props: {
    				href: "http://github.com/nbrylevv",
    				$$slots: { default: [create_default_slot$1] },
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
    			add_location(li, file$5, 5, 2, 113);
    			attr_dev(ul, "class", ul_class_value = `bt-links ${/*$$props*/ ctx[0].class}`);
    			add_location(ul, file$5, 4, 0, 68);
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
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Links",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/views/NoBrowserSupport.svelte generated by Svelte v3.20.1 */

    const file$6 = "src/views/NoBrowserSupport.svelte";

    function create_fragment$6(ctx) {
    	let div;
    	let t0;
    	let br;
    	let t1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("Ваш браузер не поддерживает уведомления.");
    			br = element("br");
    			t1 = text("\n  Обновитесь и обязательно возвращайтесь :)");
    			add_location(br, file$6, 1, 42, 48);
    			add_location(div, file$6, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, br);
    			append_dev(div, t1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
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

    function instance$6($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<NoBrowserSupport> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("NoBrowserSupport", $$slots, []);
    	return [];
    }

    class NoBrowserSupport extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NoBrowserSupport",
    			options,
    			id: create_fragment$6.name
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

      requestPermission(callback) {
        Notification.requestPermission().then(() => {
          console.log('');
          if (callback && typeof callback === 'function') {
            callback();
          }
        });
      }

      create(text, options) {
        console.log('create', text);
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

    const FAVICON_PATH = './favicon';

    const FAVICONS = {
      [STATES.action]: 'favicon-sandtime.ico',
      [STATES.break]: 'favicon-palm.ico',
      [STATES.stopped]: 'favicon-timer.ico',
    };

    class DocumentFavicon {
      constructor() {}

      get tag() {
        return document.getElementById('document-favicon');
      }

      update(name) {
        this.tag.setAttribute('href', `${FAVICON_PATH}/${name}`);
      }
    }

    /* src/App.svelte generated by Svelte v3.20.1 */
    const file$7 = "src/App.svelte";

    // (120:2) {:else}
    function create_else_block$1(ctx) {
    	let div0;
    	let t0;
    	let div1;
    	let t1;
    	let current;

    	const panel = new Panel({
    			props: { class: "bt-app__panel" },
    			$$inline: true
    		});

    	const settings_1 = new Settings({
    			props: { class: "bt-app__settings" },
    			$$inline: true
    		});

    	const links = new Links({
    			props: { class: "bt-app__links" },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			create_component(panel.$$.fragment);
    			t0 = space();
    			div1 = element("div");
    			create_component(settings_1.$$.fragment);
    			t1 = space();
    			create_component(links.$$.fragment);
    			attr_dev(div0, "class", "bt-layout__side bt-layout__side_right");
    			add_location(div0, file$7, 120, 3, 2641);
    			attr_dev(div1, "class", "bt-layout__side bt-layout__side_left");
    			add_location(div1, file$7, 123, 3, 2742);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			mount_component(panel, div0, null);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			mount_component(settings_1, div1, null);
    			append_dev(div1, t1);
    			mount_component(links, div1, null);
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
    			if (detaching) detach_dev(div1);
    			destroy_component(settings_1);
    			destroy_component(links);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(120:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (114:42) 
    function create_if_block_1(ctx) {
    	let t;
    	let current;

    	const button = new Button({
    			props: {
    				class: "bt-button_blue",
    				$$slots: { default: [create_default_slot$2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button.$on("click", /*click_handler*/ ctx[13]);

    	const block = {
    		c: function create() {
    			t = text("Необходимо разрешить уведомления\n\t\t\t");
    			create_component(button.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 16384) {
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
    			if (detaching) detach_dev(t);
    			destroy_component(button, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(114:42) ",
    		ctx
    	});

    	return block;
    }

    // (112:2) {#if !notifications.hasBrowserSupport }
    function create_if_block$1(ctx) {
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
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(112:2) {#if !notifications.hasBrowserSupport }",
    		ctx
    	});

    	return block;
    }

    // (116:3) <Button on:click={() => notifications.requestPermission()}        class="bt-button_blue">
    function create_default_slot$2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Разрешить");
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
    		source: "(116:3) <Button on:click={() => notifications.requestPermission()}        class=\\\"bt-button_blue\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let main;
    	let div;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	const if_block_creators = [create_if_block$1, create_if_block_1, create_else_block$1];
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
    			div = element("div");
    			if_block.c();
    			attr_dev(div, "class", "bt-layout");
    			add_location(div, file$7, 109, 1, 2288);
    			attr_dev(main, "class", "bt-app");
    			add_location(main, file$7, 108, 0, 2265);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div);
    			if_blocks[current_block_type_index].m(div, null);
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
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	const notifications = new Notifications();
    	const documentFavicon = new DocumentFavicon();
    	let actionTimerId = null;
    	let breakTimerId = null;
    	let settings = {};
    	let currentState = null;

    	const settingsListener = settingsWatcher.subscribe(value => {
    		settings = value;
    		state.set(STATES.stopped);
    	});

    	const stateListener = state.subscribe(value => {
    		currentState = value;

    		switch (value) {
    			case STATES.action:
    				documentFavicon.update(FAVICONS[value]);
    				if (!actionTimerId) {
    					startActionTimer();
    				}
    				break;
    			case STATES.stopped:
    				documentFavicon.update(FAVICONS[value]);
    				stopActionTimer();
    				stopBreakTimer();
    				break;
    			case STATES.break:
    				documentFavicon.update(FAVICONS[value]);
    				break;
    		}
    	});

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
    		notifications.create("Breaktify!", {
    			body: `${settings.notificationMessage}\n Отдохните следующие ${settings.breakTime} секунд`,
    			image: "./images/palm.png",
    			icon: "./images/palm.png"
    		});
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);
    	const click_handler = () => notifications.requestPermission();

    	$$self.$capture_state = () => ({
    		Panel,
    		Settings,
    		Links,
    		NoBrowserSupport,
    		Button,
    		settingsWatcher,
    		state,
    		Notifications,
    		DocumentFavicon,
    		STATES,
    		FAVICONS,
    		notifications,
    		documentFavicon,
    		actionTimerId,
    		breakTimerId,
    		settings,
    		currentState,
    		settingsListener,
    		stateListener,
    		startActionTimer,
    		stopActionTimer,
    		startBreakTimer,
    		stopBreakTimer,
    		notificate
    	});

    	$$self.$inject_state = $$props => {
    		if ("actionTimerId" in $$props) actionTimerId = $$props.actionTimerId;
    		if ("breakTimerId" in $$props) breakTimerId = $$props.breakTimerId;
    		if ("settings" in $$props) settings = $$props.settings;
    		if ("currentState" in $$props) currentState = $$props.currentState;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		notifications,
    		actionTimerId,
    		breakTimerId,
    		settings,
    		currentState,
    		documentFavicon,
    		settingsListener,
    		stateListener,
    		startActionTimer,
    		stopActionTimer,
    		startBreakTimer,
    		stopBreakTimer,
    		notificate,
    		click_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
