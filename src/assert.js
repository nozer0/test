/**
 * User: nozer0
 * Date: 3/7/13
 * Time: 10:16 AM
 *
 * http://wiki.commonjs.org/wiki/Unit_Testing/1.0
 */

define(function (require, exports, module) {
	'use strict';
	var AssertionError = exports.AssertionError = function (cfg) {
		var msg = this.message = (cfg && cfg.message) || 'AssertionError';
		this.name = 'AssertionError';
		if (cfg) {
			this.actual = cfg.actual;
			this.expected = cfg.expected;
		}
		Error.call(this, msg);
	}, matched, deep;
	AssertionError.prototype = new Error();
	AssertionError.prototype.constructor = AssertionError;
	deep = function (actual, expected) {
		var t = typeof actual, i, l, p, o, o2;
		if (t !== 'object') { return actual === expected; }
		if (typeof expected !== 'object') { return false; }
		// avoid cycle references
		for (i = 0, l = matched.length; i < l; i += 1) {
			if (matched[i] === actual) { return true; }
		}
		matched.push(actual);

		t = Object.prototype.hasOwnProperty;
		l = 0;
		for (p in actual) {
			if (t.call(actual, p) && t.call(expected, p)) {
				l += 1;
				o = actual[p];
				o2 = expected[p];
				if (typeof o === 'object') {
					if (o.constructor === Date) {
						if (String(o) !== String(expected[p])) {
							return false;
						}
					} else if (!deep(o, o2)) {
						return false;
					}
				} else if (o !== expected[p]) {
					return false;
				}
			}
		}
		for (p in expected) {
			if (t.call(expected, p)) {
				l -= 1;
			}
		}
		return !l && actual.prototype === expected.prototype;
	};
	module.exports = {
		AssertionError : AssertionError,
		ok             : function (guard, msg) {
			if (!guard) {
				throw new AssertionError({message : msg, actual : guard, expected : true});
			}
		},
		equal          : function (actual, expected, msg) {
			if (actual != expected && (actual.constructor !== Date || String(actual) !== String(expected))) {
				throw new AssertionError({message : msg, actual : actual, expected : expected});
			}
		},
		notEqual       : function (actual, expected, msg) {
			if (actual == expected || (actual.constructor === Date && String(actual) === String(expected))) {
				throw new AssertionError({message : msg, actual : actual, expected : expected});
			}
		},
		strictEqual    : function (actual, expected, msg) {
			if (actual !== expected) {
				throw new AssertionError({message : msg, actual : actual, expected : expected});
			}
		},
		notStrictEqual : function (actual, expected, msg) {
			if (actual === expected) {
				throw new AssertionError({message : msg, actual : actual, expected : expected});
			}
		},
		deepEqual      : function (actual, expected, msg) {
			matched = [];
			if (!deep(actual, expected)) {
				matched = null;
				throw new AssertionError({message : msg, actual : actual, expected : expected});
			}
			matched = null;
		},
		notDeepEqual   : function (actual, expected, msg) {
			matched = [];
			if (deep(actual, expected)) {
				matched = null;
				throw new AssertionError({message : msg, actual : actual, expected : expected});
			}
			matched = null;
		},
		throws         : function (block, error_opt, msg) { throw new AssertionError({message : msg}); }
	};
});