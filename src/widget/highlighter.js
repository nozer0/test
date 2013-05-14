/**
 * User: nozer0
 * Date: 4/3/13
 */

define(function (require, exports) {
	'use strict';
	var block_re = /\x1d[#@](\d+)/g, sub_re = /\x1c([@$])\d*|\xa0/g, op_re = /[+\-*\/?:=<>&|!\^\[\]\.]+/g,
		keyword_re = /([\w$])?(?:(if|else|switch|case|default|continue|break|for|do|while|each|try|catch|finally|with|function|var|this|return|throw|import|export)(?![\w$])|(delete|instanceof|typeof|new|in|void|get|set)(?=\s)|(false|true|null|Infinity|NaN|undefined)(?![\w$]))|([\w$@$#])?(\d+(?:\.\d+)?)(?![\w$])/g,
		highlightBody = function (code, vars, ret) {
			var functions = ret.functions, blocks = ret.blocks, objects = ret.objects, op_replacer = function (m) { return '<span class="operator">' + m + '</span>'; }, keyword_replacer = function (m, w$, st, op, pm, w$2, num) {
				if (!w$) {
					if (st) {
						return '<span class="statement">' + st + '</span>';
					}
					if (op) {
						return '<span class="operator">' + op + '</span>';
					}
					if (pm) {
						return '<span class="primitive">' + pm + '</span>';
					}
				}
				if (num && !w$2) {
					return '<span class="primitive">' + num + '</span>';
				}
				return m;
			}, block_replacer = function (m, m1) {
				return (m[1] === '#' ? '{<span class="block">' + blocks[m1 - 1].s.replace(op_re, op_replacer) : '{<span class="object">' + objects[m1 - 1].replace(op_re, op_replacer)) + '</span>}';
			};
			code = code.replace(op_re, op_replacer);
			while (block_re.test(code)) {
				code = code.replace(block_re, block_replacer);
			}
			return code.replace(new RegExp('[^\\w$](window|document|(?:de|en)codeURI(?:Component)?|(?:un)?escape|eval|is(?:Finite|NaN)|parse(?:Float|Int)' + (vars.length ? '|' + vars.join('|').replace(/\$/g, '\\$') : '') + ')(?![\\w$])', 'g'),
				function (m, variable) {
					return m[0] + '<span class="variable">' + variable + '</span>';
				}).replace(keyword_re, keyword_replacer).replace(/\x1d\$(\d+)/g,
				function (m, m1) {
					var t = functions[m1 - 1];
					return '<span class="keyword">function</span>' + (t.name ? t.head.replace(t.name, '<span class="variable">' + t.name + '</span>') : t.head) + t.args.replace(/([\w$]+)/g, '<span class="argument">$1</span>') + (/\S/.test(t.body) ? '<label for="__chk' + m1 + '">{</label><input id="__chk' + m1 + '" type="checkbox"><span class="body">' + highlightBody(t.body, vars.concat(t.variables), ret) + '</span><label for="__chk' + m1 + '">}</label>' : '{<span class="body">' + t.body + '</span>}');
				});
		};
	exports.highlight = function (ret) {
		var s = ret.s, escapes = ret.escapes, strings = ret.strings, comments = ret.comments, regexps = ret.regexps;
		s = highlightBody(s, ret.variables, ret).replace(/\r\n|\r|\n/g, '<b></b><br>');
		return s.replace(sub_re,
			function (m, m1) {
				if (!m1) {
					return '<span class="comment">' + comments.shift().replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>';
				}
				if (m1 === '@') {
					return '<span class="string">' + strings.shift().replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>';
				}
				return '<span class="regexp">' + regexps.shift().replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>';
			}).replace(/\x1b/g,
			function () { return escapes.shift(); });
	};
});