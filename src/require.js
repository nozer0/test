/**
 * User: nozer0
 * Date: 2/1/13
 * Time: 6:09 PM
 */
(function (dependencyParser) {
	'use strict';
	// small utilities
	function noConflict() { }

	function mixin() {}

	function log() {}

	var doc = this.document, modules = {}, waiting_modules = [], module, loading_node, cur_script, require, define, parse, loader = require('loader'), resolve = loader.resolve, load = loader.load;

	function getCurrentScript() {
		var scripts, l, s;
		if (cur_script && cur_script.readyState === 'interative') {
			return cur_script;
		}
		for (scripts = doc.getElementsByTagName('script'), l = scripts.length; l; 1) {
			s = scripts[l -= 1];
			if (s.readyState === 'interative') {
				cur_script = s;
				return cur_script;
			}
		}
	}

	/* For developers, it's simple and clear to implement each module in separate file in developing phase,
	 * and module id is implicitly assigned from file name.
	 * Oppositely, in deployment phase, it's better to package several files into one to limit the requests numbers.
	 * When package all modules into one or several files by something like 'combo', it MUST be indicate each module for assigning 'id' explicitly.
	 *
	 * If module definiens knows clearly about the dependencies(usually he does), skip the automatic dependency parsing for performance.
	 */
	define = function (id, dependencies, definition) {
		var t = typeof id, i, l, m, deps, waits;
		if (t === 'function' || (t === 'object' && !(id instanceof Array))) {   // define(def)
			definition = id;
			dependencies = id = t = null;
		} else if (!(dependencies instanceof Array)) {
			t = typeof dependencies;
			if (t === 'function' || t === 'object') {
				definition = dependencies;
				if (id instanceof Array) {  // define(deps, def)
					dependencies = id;
					id = t = null;
				} else {    // define(id, def)
					dependencies = t = null;
				}
			}
		} else if (typeof definition === 'function') { // define(id, deps, def)
			t = null;
		}
		if (!t) {   // invalid arguments
			return;
		}
		if (!dependencies) {    // need dependency parsing
			if (!parse) {
				parse = require('require_parser').parse;
			}
			dependencies = parse(definition.toString());
		}

		t = loading_node || (doc.attachEvent && getCurrentScript());
		m = {id : id, deps : dependencies, factory : definition, uri : t && t.src, node : t};
		if (t) {
			m.node = t;
			t = m.src = t.src;
			modules[t] = m;
		} else {
			module = m;
		}
		for (i = 0, l = dependencies.length, deps = [], waits = []; i < l; i += 1) {
			t = deps[i] = resolve(dependencies[i]);
			if (!modules[t]) {
				waits[i] = t;
				load(t, onLoad);
			}
		}
		module.deps = deps;
		if (waits.length) {
			module.waits = waits;
			waiting_modules.push(module);
		} else {
			t = module.uri;
			if (t) {
				modules[t] = module;
			}
			definition(require, module.exports = {}, module);
		}
	};

	function save(uri) {
		var l = waiting_modules.length, m, waits, i, n;
		while (l) {
			for (m = waiting_modules[l -= 1], waits = m.waits, i = 0, n = waits.length; i < n; i += 1) {
				if (waits[i] === uri) {
					if (waits.length === 1) {
						delete m.waits;
						waiting_modules.splice(l, 1);
					} else {
						waits.splice(i, 1);
					}
					break;
				}
			}
		}
		module = null;
	}

	function onLoad(uri, ret) {
		var s = this.src;
		if (modules[s]) { return; }
		if (module) {   // for browsers except IE, trigger 'load' immediately after execution
			module.node = this;
			modules[module.uri = s] = module;
			module = null;
		} else if (!ret) {  // load failed on IE
			// do something
		}
	}

// TODO: id -> uri
// TODO: load
// TODO: cmd, amd, global

	var require, paths, module, exports;

	require = function () {};
	require.main = null;
	require.paths = paths;

	exports = {};

	module.id = null;
	module.uri = null;

})
	((function () {
		'use strict';
		var re = /".*?"|'.*?'|(?:\w|\W\s*\(.*?\))\s*\/(?=\s*[\w\(])|\/\*[\s\S]*?\*\/|\/\/.*|\/(?:[^\/\r\n\[]|\[.*?\])+\/(?=[img]+\b|\W)|\.\s*require|[^$]\brequire\s*\(\s*(["'])(.+?)\1\s*\)/g;
		// match different patterns like string, comments
		// /(".*?"|'.*?')|(?:\w|\W\s*\(.*?\))\s*\/(?=\s*[\w\(])|(\/\*[\s\S]*?\*\/|\/\/.*)|(\/(?:[^/\r\n\[]|\[.*?\])+\/)(?=[img]+\b|\W)|\.\s*require|[^$]\brequire\s*\(\s*(?:".*?"|'.*?')\s*\)/g;
		return function (code) {
			var ret = [];
			code.replace(/\\[\s\S]/g, '#').replace(re, function (m, m1, m2) {
				if (m2) {
					ret.push(m2);
				}
			});
			return ret;
		};
	})());

(function () {
	var comment_re, require_re, exports_re, module_re, config, paths = {}, stacks = [], load = this.load, define, require, seed = 0;
	if (typeof this.define === 'function' && this.define.amd) { return; }   // avoid duplicate define
	if (typeof load !== 'function') { throw 'no loader included'; }

	comment_re = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg;
	require_re = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g;
	exports_re = /[^.]\s*exports\.([\w\d]+)|[^.]\s*exports\[["']([\w\d]+)["']\]/g;
	module_re = /[^.]\s*module(?:\.(\w+)|\[["'](\w+)["']\])\s*=\s*([\w\d]+)/;
	config = {};
	this.define = define = function (definition) {
		var text = definition.toString(), deps = [], module = {definition : definition}, id, l, t;
		text.replace(comment_re, '').replace(require_re,function (m, module) {
			deps.push(module);
		}).replace(module_re, function (m, n1, n2, v) {
				var k = n1 || n2;
				module[k] = v;
			});
		for (l = deps.length; l;) {
			t = deps[l -= 1];
			if (!config[t]) {
				config[t] = { id : t, ready : false };
			}
		}
		id = module.id;
		if (!id) {  // give a pseudo id if not exists
			id = module.id = 'bm96ZXIw' + (seed += 1);
		}
		module.dependencies = deps;
		config[id] = module;
		stacks.push(module);
		if (module.uri) {
			paths[id] = module.uri;
		}
	};
	this.require = require = function (id) {
		var module;
		if (typeof id === 'string') {
			module = config[id];
			if (module.ready) { return module.module; }
			throw 'module isn\'t ready';
		} else if (typeof id === 'function') {
			define(id);
			run();
		}
	};
	require.paths = paths;
	function loaded(url, success) {
		var base = paths.baseUrl, s = base ? url.replace(base, '') : url, def;
		def = config[s.substr(0, s.lastIndexOf('.'))];
		if (def) {
			delete def.loading;
			def.ready = success;
			if (def.definition) {
				def.definition.apply(def.ctx, [require, def.module = {}]);
			}
			run();
		}
	}

	function run() {
		var stk = stacks, cfg = config, fn = require, base = paths.baseUrl || '', l = stk.length, def, t, d, i, dl, ready, args;
		while (l) {
			for (def = stk[l -= 1], t = def.dependencies, ready = true, args = [], i = 0, dl = t.length; i < dl; i += 1) {
				d = cfg[t[i]];
				if (!d.ready) {
					if (!d.loading) {   // start loading
						d.loading = true;
						load(d.uri || base + d.id + '.js', loaded);
					}
					ready = false;
					break;
				}
				args.push(d);
			}
			if (ready) {
				def.ready = true;
				stk.pop();
				if (def.definition) {
					def.definition.apply(def.ctx, [fn, def.module = {}]);
				}
			}
		}
	}
}());
