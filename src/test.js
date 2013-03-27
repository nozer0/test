/**
 * User: nozer0
 * Date: 3/7/13
 * Time: 1:47 PM
 *
 * http://wiki.commonjs.org/wiki/Unit_Testing/1.0
 */

define(function (require, exports) {
	'use strict';
	var log = require('log'), success = function (name, whole) {
		log.log(name + ' passed');
		if (whole) {
			this.passed += 1;
			this.tested += 1;
			if (this.tested === this.total) {
				this.finish();
			}
		}
	}, fail = function (name, whole, e) {
		log.error(name + ' failed' + (e ? ', expected: ' + (e.expected.toSource ? e.expected.toSource() : e.expected) + ', actual: ' + (e.actual && e.actual.toSource ? e.actual.toSource() : e.actual) : ''));
		if (whole) {
			this.tested += 1;
			if (this.tested === this.total) {
				this.finish();
			}
		}
	}, finish = function () {
		var t = new Date(), i = this.total, passed = this.passed, cases = this.cases;
		if (typeof cases.teardown === 'function') {
			cases.teardown();
		}
		log.log('--->>>');
		log.log('end test ' + name + ' (' + t.toLocaleTimeString() + '), time: ' + (t - this.start) + 'ms, total: ' + i + ', success: ' + passed + ', failed: ' + (i - passed));
	};
	exports.run = function (cases) {
		var o = {cases : cases, success : success, fail : fail, finish : finish}, p, t = o.start = new Date(), ret, sync = true;
		o.total = o.tested = o.passed = 0;
		log.log('start test ' + (o.name = cases.name || 'o_p') + ' (' + t.toLocaleTimeString() + '):');
		log.log('--->>>');
		if (typeof cases.setup === 'function') {
			cases.setup();
		}
		for (p in cases) {
			if (cases.hasOwnProperty(p) && p.indexOf('test') === 0 && typeof cases[p] === 'function') {
				o.total += 1;
				try {
					ret = cases[p]();
					if (ret !== false) {
						o.passed += 1;
						o.tested += 1;
						log.log(p + ' passed');
					} else if (sync) {
						sync = false;
					}
				} catch (e) {
					o.tested += 1;
					log.error(name + ' failed' + ', expected: ' + (e.expected.toSource ? e.expected.toSource() : e.expected) + ', actual: ' + (e.actual && e.actual.toSource ? e.actual.toSource() : e.actual));
				}
			}
		}
		if (sync) {
			finish.call(o);
		}
		return o;
	};
});