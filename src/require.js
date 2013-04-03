/**
 * User: nozer0
 * Date: 2/1/13
 * Time: 6:09 PM
 */

(function () {
	'use strict';
	var root = this && this.self === this ? this : window, doc = root.document, stack_re = /[@( ]([^@( ]+?)(?:\s*|:[^\/]*)$/, id_re = /\/([^\/]+?)(?:\.\w+)?(?:$|[?#].*$)/, paths = {}, loading_node, modules = {}, getCurrentScript = doc.currentScript === undefined ? function () {
		try {
			this.__();
		} catch (e) {
			/*
			 * https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Error/Stack
			 * stack
			 *  chrome23:   at http://localhost:8080/path/name.js:2:2
			 *  firefox17:  @http://localhost:8080/path/name.js:2
			 *  opera12:    @http://localhost:8080/path/name.js:2
			 *  ie10:       at Global code (http://localhost:8080/path/name.js:2:2)
			 *
			 * stacktrace
			 *  opera11:    line 2, column 2 in http://localhost:8080/path/name.js:
			 *  opera10b:   @http://localhost:8080/path/name.js:2
			 *  opera10a:   Line 2 of inline#2 script in http://localhost:8080/path/name.js: In function foo\n
			 *
			 * message
			 *  opera9:     Line 2 of inline#2 script in http://localhost:8080/path/name.js\n
			 *
			 * @see http://www.cnblogs.com/rubylouvre/archive/2013/01/23/2872618.html
			 */
			var s = e.stack || e.stacktrace || (window.opera && e.message), ns, l;
			if (s) {    // safari5- and IE6-9 not support
				s = stack_re.exec(s);
				if (s) { return s[1]; }
			} else {    // IE6-9
				for (ns = doc.getElementsByTagName('script'), l = ns.length; l; 1) {
					s = ns[l -= 1];
					if (s.readyState === 'interactive') {
						return s.getAttribute('src', 4);    // for IE6-7, 's.src' won't return full url
					}
				}
			}
		}
	} : function () { // ff 4+
		// https://developer.mozilla.org/en-US/docs/DOM/document.currentScript
		var s = doc.currentScript;
		return s.src || s.baseURI;
	}, jsparser, precompile, load, uri, resolve, _define, onReady, onLoad, _require = function (id) {
		var m = modules[id] || modules[resolve(id, paths.base)];
		if (m) { return m.exports; }
		throw id + ' is not defined';
	};

//	_require.main = null;
	_require.paths = paths;

	/* For developers, it's simple and clear to implement each module in separate file in developing phase,
	 * and module id is implicitly assigned from file name.
	 * Oppositely, in deployment phase, it's better to package several files into one to limit the requests numbers.
	 * When package all modules into one or several files by something like 'combo', it MUST be indicate each module for assigning 'id' explicitly.
	 *
	 * If module definiens knows clearly about the dependencies(usually he does), skip the automatic dependency parsing for performance.
	 */
	_define = root.define = function (id, dependencies, definition) {
		var t = typeof id, i, l, m, deps, waits, wait, uri;
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
		if (t) {   // invalid arguments
			return;
		}
		if (!dependencies) {    // need dependency parsing
			dependencies = _define.parse(definition.toString());
		}

		uri = loading_node ? loading_node.src : getCurrentScript() || root.location.href;
		m = modules[uri];
		if (m) {
			m.id = id || uri;
			m.deps = dependencies;
			m.factory = definition;
		} else {
			m = modules[uri] = {id : id || id_re.exec(uri), uri : uri, deps : dependencies, factory : definition};
		}
		for (i = 0, l = dependencies.length, deps = [], waits = m.waits = {}, wait = 0; i < l; i += 1) {
			t = deps[i] = resolve(dependencies[i], uri);
			if (!modules[t]) {
				modules[t] = { uri : t, next : {}, wait : -1 };
				load(t, onLoad);
			}
			if (modules[t].wait) {
				modules[t].next[uri] = true;
				waits[t] = true;
				wait += 1;
			}
		}
		if (wait) {
			m.wait = wait;
		} else {
			onReady(m);
		}
		return m;
	};
	_define.modules = modules;
	_define.parse = function () { return []; };

	onReady = function (module) {
		if (resolve) {
			_require('log').log(module.uri, 'is ready');
		}
		var p, next = module.next, m;
		delete module.wait;
		delete module.waits;
		paths.base = module.uri;
		module.factory(_require, module.exports = {}, module);
		if (next) {
			for (p in next) {
				if (next.hasOwnProperty(p)) {
					m = modules[p];
					delete m.waits[module.uri];
					m.wait -= 1;
					if (!m.wait) {
						onReady(m);
					}
				}
			}
			delete module.next;
		}
	};
	onLoad = function (uri, ret) {
		if (!ret) {
			modules[uri].error = true;
		}
	};

	uri = define('uri', function (require, exports) {
		var root = this && this.self === this ? this : window, base = '', alias = {}, maps = [], loc_re = /^(?:(https?:)\/\/)?(([^:\/]+):?([\d]+)?)([^?#]+?([^\/?#]+?)?(?:\.(\w+))?)(\?[^#]+)?(#\S*)?$/, http_re = /^https?:\/\/\w/, root_re = /(\w)\/.+/, base_re = /(\w\/)\/?[^\/]+$/, parent_re = /\/[^\/]+\/\.\.\//, host_re = /(?:^https?:\/\/)?([^\/]+)\//i;
		exports.isSameHost = function (uri, host) {
			var t = host_re.exec(uri);
			return t && t[1] === (host || root.location.host);
		};
		exports.location = function (uri) {
			var t = loc_re.exec(uri);
			return t ? {uri : t[1] ? uri : 'http://' + uri, protocol : t[1] || 'http:', host : t[2], hostname : t[3], port : t[4] || '', pathname : t[5] || '', filename : t[6] || '', ext : t[7] || '', search : t[8] || '', hash : t[9] || ''} : {uri : uri};
		};
		exports.config = function (cfg) {
			var k, src, i, l, m, s;
			if (!cfg) { return; }
			if (cfg.base) { base = cfg.base.replace(base_re, '$1'); }
			src = cfg.alias;
			if (src) {
				for (k in src) {
					if (src.hasOwnProperty(k)) {
						alias[k] = src[k];
					}
				}
			}
			src = cfg.maps;
			if (src) {
				for (i = 0, l = src.length, m = maps.length; i < l; i += 2) {
					for (s = String(src[i]), k = 0; k < m; k += 2) {
						if (String[maps[k]] === s) {
							maps[i + 1] = src[k + 1];
							break;
						}
					}
					if (k >= m) {    // no same map
						maps.push(src[i], src[i + 1]);
					}
				}
			}
		};
		exports.resolve = function (uri, cbase) {
			var s = alias[uri] || uri, i, l;
			if (!http_re.test(s)) {
				l = cbase || base;
				if (l) {
					s = l.replace(/^\/\w/.test(s) ? root_re : base_re, '$1') + s;
				}
			}
			while (parent_re.test(s)) {
				s = s.replace(parent_re, '/');
			}
			s = s.replace(/\/\.\//g, '/');
			for (i = 0, l = maps.length; i < l; i += 1) {
				s = s.replace(maps[i], maps[i += 1]);
			}
			return s;
		};
	});
	resolve = uri.exports.resolve;

	jsparser = define('jsparser', function (require, exports) {
		// string|comment|(|) + uncertain slash|)|regexp
		var re = /(".*?"|'.*?')|(\/\*[\s\S]*?\*\/|\/\/.*)|[\w$\]]\s*\/(?![*\/])|(?:[^$]return\s*)?(\/)[\s\S]*/g, re2 = /((\$)?\b(?:if|for|while)\b\s*)?(\()|(([\w$)\]])\s*)(\/([^\/*][\s\S]*$))|(\))|([^$]return\s*)?(\/(?:[^*\/\[\r\n]|\[.*?\])(?:[^\/\[\r\n]|\[.*?\])*\/[img]{0,3})((\/)?[\s\S]*)/g,
			precompile = exports.precompile = function (code) {
				var escapes = [], parenthesis = [], strings = [], comments = [], regexps = [], store, f1, replacer = function (m, s, cm, slash) {
					if (slash) {
						f1 = true;
						return m;
					}
					f1 = false;
					if (s) {
						return '\x1c@' + strings.push(m);
					}
					if (cm) {
						comments.push(m);
						return '\xa0';  // it can use '\s' to match
					}
					return m;
				}, replacer2 = function (m, lp_prefix, $, lp, slash_prefix, slash_w$, slash_suffix, slash_suffix2, rp, regexp_prefix, regexp, regexp_suffix, slash) {
					var t, s;
					if (lp) {
						// to be faster, do less array operations via flag variable check
						if (lp_prefix && !$) {
							store = true;
							parenthesis.push(true);
						} else if (store) {
							parenthesis.push(false);
						}
						return m;
					}
					if (slash_w$) {
						t = store && slash_w$ === ')' && parenthesis.pop();
						// to be faster, use capture group instead of string concatenation
						// and not start from the beginning each time
						if (t) {    // regexp
							return slash_prefix + slash_suffix.replace(re2, replacer2);
						}
						if (t === undefined) {
							store = false;
						}
						s = slash_suffix2.replace(re, replacer);
						return slash_prefix + '/' + (f1 ? s.replace(re2, replacer2) : s);
					}
					if (rp && store) {
						parenthesis.pop();
					}
					if (regexp) {
						regexps.push(regexp);
						if (slash) {    // maybe divisor follow on
							s = regexp_suffix.replace(/^/, 0).replace(re, replacer);
							return regexp_prefix + '\x1c$' + (f1 ? s.replace(re2, replacer2) : s).replace(0, '');
						}
						s = regexp_suffix.replace(re, replacer);
						return regexp_prefix + '\x1c$' + (f1 ? s.replace(re2, replacer2) : s);
					}
					return m;
				}, s = code.replace(/\\[\s\S]/g,
					function (m) {
						escapes.push(m);
						return '\x1b';
					}).replace(re, replacer);
				return {s : f1 ? s.replace(re2, replacer2) : s, escapes : escapes, strings : strings, comments : comments, regexps : regexps};
			},
			var_re = /[\w$]var|var\s+([\s\S]+?(?:;|[\w$@\])]\s*[\r\n]\s*(?=[\w$\x1d]|\x1c@)))/g,
			group_re = /[(\[][^()\[\]]+[)\]]/g, vars_re = /(?:^|,)\s*([\w$]+)/g,
			sub_re = /\x1d([$#])(\d+)/g,
			block_re = /([\w$])function|([=(]\s*)?function(\s*([\w$]*)\s*)(\([^)]*\)\s*)\{([^{}]*)\}|([=(,]\s*)?\{([^{}]*)\}/g;
		exports.parse = function (code, compiled) {
			var ret = compiled ? code : precompile(code), functions = ret.functions = [], blocks = ret.blocks = [], objects = ret.objects = [], s = ret.s, t = [], vars_replacer = function (m, m1) { return t.push(m1); }, var_replacer = function (m, m1) {
				if (m1) {
					while (group_re.test(m1)) { // remove the commas inside array or parenthesis
						m1 = m1.replace(group_re, 0);
					}
					m1.replace(vars_re, vars_replacer);
				}
				return '';
			}, fn_replacer = function (m, m1, n) {  // get named function
				if (m1 === '$') {
					n = functions[n - 1].name;
					if (n) { t.push(n); }
				} else {
					n = blocks[n - 1].variables;
					if (n.length) { t = t.concat(n); }
				}
				return '';
			}, replacer = function (m, w$, fn_prefix, head, name, args, body, block_prefix, block) {
				if (w$) {
					return m;
				}
				if (block_prefix) {
					return block_prefix + '\x1d@' + objects.push(block);
				}
				if (args) {
					t = args.match(/[\w$]+/g) || [];
					body.replace(var_re, var_replacer).replace(sub_re, fn_replacer);
					return fn_prefix + '\x1d$' + functions.push({name : !fn_prefix && name, variables : t, head : head, args : args, body : body});
				}
				t = [];
				block.replace(var_re,
					function (m, m1) {
						while (group_re.test(m1)) { // remove the commas inside array or parenthesis
							m1 = m1.replace(group_re, 0);
						}
						m1.replace(vars_re, vars_replacer);
						return '';
					});
				return '\x1d#' + blocks.push({s : block, variables : t});
			};
			s.replace(var_re, var_replacer).replace(sub_re, fn_replacer);
			ret.variables = t;
			while (/\{/.test(s)) {
				s = s.replace(block_re, replacer);
			}
			ret.s = s;
			return ret;
		};
	});

	precompile = jsparser.exports.precompile;
	_define.parse = function (s) {
		var ret = precompile(s), deps = [], strs = ret.strings;
		ret.s.replace(/([\w.$])?require\s*\(.*?(\d+)\s*\)/g, function (m, w$, n) {
			if (!w$) { deps.push(strs[n - 1].replace(/^['"]\s*|\s*['"]$/g, '')); }
			return '';
		});
		return deps;
	};

	load = define('load', function (require, exports) {
		var root = this && this.self === this ? this : window, doc = root.document, urilib = require('uri'), re = /\.(\w+)(?=[?#]\S*$|$)/, host_re = /(?:^https?:\/\/)?([^\/]+)\//i, host = root.location.host, loaders, exts = {'js' : 'js', 'css' : 'css', 'png' : 'img', 'jpg' : 'img', 'jpeg' : 'img', 'bmp' : 'img', 'tiff' : 'img', 'ico' : 'img'};

		function getType(uri) {
			var ext = re.exec(uri);
			return (ext && exts[ext[1]]) || 'js';
		}

		function isSameHost(uri) {
			var t = host_re.exec(uri);
			return t && t[1] === host;
		}

		// http://pieisgood.org/test/script-link-events/
		// http://seajs.org/tests/research/load-js-css/test.html
		loaders = {
			js  : (function () {
				// IE8- || others, since 'load' is infrequently called, merge to make less codes is better than quicker
				var t = doc.createElement('script'),
					load = t.onload === undefined || t.onerror !== undefined ? function (node, uri, callback, ctx) {
						// we can know if the js file is loaded or not, but can't know whether it's empty or invalid,
						// ie8- triggers 'loading' and 'loaded' both normal without cache or error
						// IE10:
						//  loading - complete - loaded, complete (cache), loading - loaded (404)
						// IE9-:
						//  complete (cache), loading - loaded
						// http://requirejs.org/docs/api.html#ieloadfail
						var body = !exports.preserve && doc.body;
						node.onload = node.onerror = node.onabort = node.onreadystatechange = function (e) {
							var rs = this.readyState;
							if (!rs || rs === 'loaded' || rs === 'complete') {
								this.onload = this.onerror = this.onabort = this.onreadystatechange = null;
								callback.call(ctx, uri, rs || e.type === 'load', this, e || root.event);
								if (body) {
									body.removeChild(this);
								}
							}
						};
						node = null;
					} : function (node, uri, callback, ctx) {    // opera12-
						// although it supports both 'onload' and 'onreadystatechange',
						// but it won't trigger anything if 404, empty or invalid file, use timer instead
						var body = !exports.preserve && doc.body, timer = root.setTimeout(function () {
							node.onload = null;
							callback.call(ctx, uri, false, node);
							if (body) {
								body.removeChild(node);
							}
							node = null;
						}, exports.timeout);
						node.onload = function (e) {
							this.onload = null;
							root.clearTimeout(timer);
							node = timer = null;
							callback.call(ctx, uri, true, this, e);
							if (body) {
								body.removeChild(this);
							}
						};
					};
				return function (uri, callback, ctx) {
					var node = doc.createElement('script');
					node.type = 'text/javascript';
					node.async = true; // https://developer.mozilla.org/en-US/docs/HTML/Element/script
					node.charset = exports.charset;
//				if (defer) {    // support by all browsers except Opera
//					s.defer = true;
//				}
					if (callback) { load(node, uri, callback, ctx); }
					node.src = uri;
					doc.body.appendChild(node);
					node = null;
				};
			}()),
			css : (function () {
				var head = doc.getElementsByTagName('head')[0], ua = root.navigator.userAgent, ff = /Firefox\/\d/.test(ua), load = /MSIE \d/.test(ua) ? function (node, uri, callback, ctx) {
					// IE triggers 'load' for all situations, and 'styleSheet.rules' is accessible immediately if load or same host,
					// if 404 from different host, access is denied for 'styleSheet.rules',
					// IE8- use 'styleSheet.rules' rather than 'sheet.cssRules' for other browsers
					// http://help.dottoro.com/ljqlhiwa.php#cssRules
					node.onload = node.onabort = function (e) {
						var t;
						this.onload = this.onabort = null;
						try {
							t = this.styleSheet.rules.length;
						} catch (ex) {}
						callback.call(ctx, uri, t, this, e || root.event);
					};
					node = null;
				} : function (node, uri, callback, ctx) {
					// ignore very old ff & webkit which don't trigger anything for all situations
					var t = !ff && isSameHost(uri), timer;
					if (node.onerror === undefined || root.opera) {   // opera won't trigger anything if 404
						timer = root.setTimeout(function () {
							node.onload = node.onerror = node.onabort = null;
							callback.call(ctx, uri, t && node.sheet.cssRules.length, node);
							node = null;
						}, exports.timeout);
					}
					node.onload = node.onerror = node.onabort = function (e) {
						this.onload = this.onerror = this.onabort = null;
						if (timer) {
							root.clearTimeout(timer);
							timer = null;
						}
						node = null;
						// 'sheet.cssRules' is accessible only if same host, and ff always returns 0 for 'cssRules.length'
						callback.call(ctx, uri, e.type === 'load' && (!t || this.sheet.cssRules.length), this, e);
					};
				};
				return function (uri, callback, ctx) {
					var node = doc.createElement('link');
					node.rel = 'stylesheet';
					node.type = 'text/css';
					node.charset = exports.charset;
					if (callback) { load(node, uri, callback, ctx); }
					node.href = uri;
					head.appendChild(node);
					node = null;
				};
			}()),
			img : function (uri, callback, ctx) {
				var node = new Image(), timer;
				if (callback) {
					// opera12- supports 'onerror', but won't trigger if 404 from different host
					if (root.opera && !isSameHost(uri)) {
						timer = root.setTimeout(function () {
							node.onload = node.onerror = node.onabort = null;
							callback.call(ctx, uri, false, node);
							node = null;
						}, exports.timeout);
					}
					node.onload = node.onerror = node.onabort = function (e) {
						this.onload = this.onerror = this.onabort = null;
						if (timer) {
							root.clearTimeout(timer);
							timer = null;
						}
						node = null;
						e = e || root.event;
						callback.call(ctx, uri, e.type === 'load', this, e);
					};
				}
				node.src = uri;
			}
		};

		exports.timeout = 10000;
		exports.charset = 'utf8';
		exports.setLoader = function (type, loader) {
			loaders[type] = loader;
		};

		// http://www.fantxi.com/blog/archives/preload-images-css-js
		// https://developer.mozilla.org/en-US/docs/Link_prefetching_FAQ
		exports.preload = function (uri, type) {
			var cfg = [], o, l, s, t;
			// IE can't preload js&css via Image, and other browsers can't use cache via Image
			if (typeof uri === 'string') {
				uri = urilib.resolve(uri);
				t = type || getType(uri);
				if (t === 'js' || t === 'css') {
					cfg.push({url : uri, type : t});
				} else {
					loaders.img(uri);
				}
			} else {    // multiple
				l = uri.length;
				while (l) {
					o = uri[l -= 1];
					if (typeof o === 'string') {
						s = o;
						t = getType(uri = urilib.resolve(uri));
					} else {
						s = urilib.resolve(o.url);
						t = o.type;
					}
					if (t === 'js' || t === 'css') {
						cfg.push({url : s, type : t});
					} else {
						loaders.img(s);
					}
				}
			}
			l = cfg.length;
			if (!l) { return; }
			s = doc.createElement('iframe');
			s.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(1px 1px 1px 1px);clip:rect(1px,1px,1px,1px)';
			s.scrolling = 'no';
			s.onload = function () {
				s.onload = null;
				doc.body.removeChild(s);
			};
			doc.body.appendChild(s);
			t = s.contentDocument || s.contentWindow.document;
			t.open();
			t.write('<!doctype><html><head></head><body>');
			while (l) {
				o = cfg[l -= 1];
				if (o.type === 'js') {
					t.write('<script type="text/javascript" src="' + o.url + '"></script>');
				} else if (o.type === 'css') {
					t.write('<link type="text/css" rel="stylesheet" href="' + o.url + '">');
				} else {
					t.write('<img src="' + o.url + '">');
				}
			}
			t.write('</body></html>');
			t.close();
		};
		exports.load = function (uri, type, callback, ctx) {
			var t = typeof type;
			uri = urilib.resolve(uri);
			if (t === 'function') {
				ctx = callback;
				callback = type;
				type = getType(uri);
			}
			if (loaders[type]) {
				loaders[type](uri, callback, ctx);
			}
		};
	});

	load = load.exports.load;

	_define.config = uri.exports.config;
	_define.config({ maps : [/(\.(\w+))?(?=[?#]\S*$|$)/, function (m, m1) { return m1 ? m : '.js'; }] });
}());