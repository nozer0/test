/**
 * User: nozer0
 * Date: 3/7/13
 * Time: 1:49 PM
 */

define(function (require, exports, module) {
	'use strict';
	// requirejs set 'exports' as 'this'
	var root = this.self === this ? this : window, console = root.console, maps = { 1 : 'log', 2 : 'info', 4 : 'warn', 8 : 'error' };
	module.exports = {
		LOG    : 1,
		INFO   : 2,
		WARN   : 4,
		ERROR  : 8,
		level  : 15,
		output : root.document.getElementById('o_p_output'),
		_log   : function (logs, level) {
			if (!(level & this.level)) { return; }
			var m = maps[level] || 'log', s;
			if (console) {
				console[m](s = Array.prototype.join.call(logs, ' '));
			}
			if (this.output) {
				this.output.innerHTML += '<p class="' + m + '">' + (s || Array.prototype.join.call(logs, ' ')) + '</p>';
			}
		},
		log    : function () { this._log(arguments, 1); },
		info   : function () { this._log(arguments, 2); },
		warn   : function () { this._log(arguments, 4); },
		error  : function () { this._log(arguments, 8); },
		call   : function (name, args) {
			var fn = console && console[name];
			fn.apply(this, args);
		}
	};
});