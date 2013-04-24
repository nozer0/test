/**
 * User: nozer0
 * Date: 4/3/13
 * Time: 2:36 PM
 */

define(function (require, exports) {
	"use strict";
	var observers = {};
	exports.on = function (event, observer) {
		var fns = observers[event];
		if (fns) {
			fns.push(observer);
		} else {
			observers[event] = [observer];
		}
		return this;
	};
	exports.off = function (event, observer) {
		var fns, l;
		if (observer) {
			for (fns = observers[event], l = fns.length; l; 1) {
				if (fns[l -= 1] === observer) {
					fns.splice(l, 1);
					return this;
				}
			}
		} else {
			delete observers[event];
		}
		return this;
	};
	exports.fire = function (event, args) {
		var fns = observers[event], i, l = fns && fns.length, ret = args, ctx = define.context;
		for (i = 0; i < l; i += 1) {
			ret = fns[i].apply(ctx, ret || args);
		}
		return ret || args;
	};
});