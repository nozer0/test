/**
 * User: nozer0
 * Date: 3/5/13
 * Time: 10:08 PM
 *
 * a wrapper function to for user to write in unique format working with AMD, CommonJS, NodeJS, CMD or Global
 */

(function (ctx) {
	'use strict';
	var _define = ctx.define, doc = ctx.document, stack_re = /[@( ]([^@( ]+?)(?:\s*|:[^\/]*)$/, id_re = /\/([^\/]+?)(?:\.\w+)?(?:$|[?#].*$)/, define,
		getCurrentScriptSrc = doc.currentScript !== undefined ? function () { // ff 4+
			// https://developer.mozilla.org/en-US/docs/DOM/document.currentScript
			var s = doc.currentScript;
			return s.src || s.baseURI;
		} : function () {
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
		};

	if (!(_define && typeof _define === 'function' && (_define.amd || _define.cmd))) {    // AMD or CMD
		ctx.define = define = (ctx.module && typeof ctx.module.declare === 'function' && ctx.module.declare) || // CommonJS
			(typeof ctx.require === 'function' && typeof ctx.exports === 'object' && function (factory) {   // NodeJS
				factory(ctx.require, ctx.exports, ctx.module);
			});
		if (!define) {
			ctx.require = function (id) {
				var m = define.modules[id];
				if (m) { return m.exports; }
				throw m;
			};
			ctx.define = define = function (id, factory) {    // Global
				var t = typeof id, uri, module;
				if (t !== 'string') {
					factory = id;
					uri = getCurrentScriptSrc() || ctx.location.href;
					id = id_re.exec(uri);
					id = id ? id[1] : 'o_p';
				}
				module = define.modules[id];
				if (!module) {
					module = define.modules[id] = {id : id, uri : uri, exports : {}};
				}
				t = typeof factory;
				if (t === 'function') {
					factory.call(ctx, ctx.require, module.exports, module);
				} else {
					module = module.exports;
					for (t in factory) {
						if (factory.hasOwnProperty(t)) {
							module[t] = factory[t];
						}
					}
				}
			};
			define.modules = {};
		}
	}

	ctx.define({ getCurrentScriptSrc : getCurrentScriptSrc });
}(this));