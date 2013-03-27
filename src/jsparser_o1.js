/**
 * User: nozer0
 * Date: 3/11/13
 * Time: 1:59 PM
 */

define('jsparser', function (require, exports) {
	'use strict';
	// string|comment|uncertain slash|regexp
	var re = /(".*?"|'.*?')|(\/\*[\s\S]*?\*\/|\/\/.*)|\)\s*\/[\s\S]+$|([^$\w\s]\s*)(\/(?:[^\r\n\/*\[]|\[.*?\])(?:[^\/\r\n\[]|\[.*?\])*\/(?:[img]{1,3})?)/g, slash_re = /\)\s*\//, parentheses_re = /([^$\w](?:if|for|while)\s*)?(\([^()]+\))(?=[^(]*\/)/, stop_re = /\x1c\d+%?\s*\//, restore_re = /\x1c(\d+)%?/g,
		precompile = exports.precompile = function (code) {
			var escapes = [], pc = -1, parenthesis = [], strings = [], comments = [], regexps = [], restore_replacer = function (m, m1) { return parenthesis[m1]; }, replacer = function (m, s, cm, regexp_prefix, regexp) {
				if (s) {
					strings.push(m);
					return '\x1c@';
				}
				if (cm) {
					comments.push(m);
					return '\x1c#';
				}
				if (regexp) {
					regexps.push(regexp);
					return regexp_prefix + '\x1c$';
				}
				return m;
			}, parentheses_replacer = function (m, m1, m2) {
				parenthesis.push(m2);
				return m1 ? m1 + '\x1c' + (pc += 1) + '%' : '\x1c' + (pc += 1);
			}, s = code.replace(/\\[\s\S]/g,
				function (m) {
					escapes.push(m);
					return '\x1b';
				}).replace(re, replacer);
			while (slash_re.test(s)) {  // remove parenthesis before uncertain slash first
				do {
					s = s.replace(parentheses_re, parentheses_replacer);
				} while (!stop_re.test(s));
				s = s.replace(re, replacer);
			}
			while (restore_re.test(s)) {    // restore parenthesis
				s = s.replace(restore_re, restore_replacer);
			}
			return {s : s, escapes : escapes, strings : strings, comments : comments, regexps : regexps};
		},
		var_re = /(?:^|[^\w$])var\s+([\s\S]+?(?:;|\w[\s\x1c#]*[\r\n]+[\x1c#]*\s*(?=[\w\x1b\x1c\x1d])))/g, vars_re = /(?:^|,)[\s\x1c#]*([\w$]+)(?=[\s,;]|$)/g,
		group_re = /[(\[][^()\[\]]+[)\]]/g, restore_group_re = /\x1b@(\d+)/g,
		func_re = /\x1d@(\d+)/g,
		parseBody = function (code, variables, functions) {
			var var_replacer = function (m, m1) {
				return variables.push(m1);
			};
			code.replace(func_re, function (m, m1) {    // get named function
				var t = functions[m1];
				if (t && t.name) {
					variables.push(t.name);
				}
			});
			code.replace(var_re, function (m, m1) { // get declare variables
				var cc = -1, commas = [], comma_replacer = function (m) {
					commas.push(m);
					return '\x1b@' + (cc += 1);
				}, restore_replacer = function (m, m1) { return commas[m1]; };
				while (group_re.test(m1)) { // remove the commas inside array or parenthesis
					m1 = m1.replace(group_re, comma_replacer);
				}
				m1.replace(vars_re, var_replacer);
				while (restore_group_re.test(m1)) {
					m1 = m1.replace(group_re, restore_replacer);
				}
				return '';
			});
			return code;
		},
		brace_re = /\{[^{}]*\}/,
		block_re = /(^|=\s*|[^\w$])(function\s*([\w$]*)\s*\(([^)]*)\)\s*)\{([^{}]*)\}|\{([^{}]*)\}/g;
	exports.parse = function (code, compiled) {
		var ret = compiled ? code : precompile(code), fc = -1, functions = ret.functions = [], bc = -1, blocks = ret.blocks = [], s = ret.s, block_replacer = function (m, m1, m2, m3, m4, m5, m6) {
			var variables;
			if (m2) {
				variables = /\S/.test(m4) ? m4.split(/\s*,\s*/) : [];
				functions.push({variables : variables, name : m[0] !== '=' && m3, s : m.replace(m1, ''), prefix : m2, body : parseBody(m5, variables, functions)});
				return m1 + '\x1d@' + (fc += 1);
			}
			if (m6) {
				blocks.push(m6);
				return '\x1d$' + (bc += 1);
			}
		};
		while (brace_re.test(s)) {
			s = s.replace(block_re, block_replacer);
		}
		parseBody(s, ret.variables = [], functions);
		ret.s = s;
		return ret;
	};
});

define('highlighter', function (require, exports) {
	'use strict';
	var restore_func_re = /\x1d@(\d+)/g, sub_re = /\x1c([@#$%])/g, arg_re = /function\s+([\w$]+)|([\w$]+)(?=\s*[,)])/g,
		keyword_re = /[^\w$](if|else|switch|case|default|continue|break|for|do|while|each|try|catch|finally|with|function|var|this|return|throw|import|export)(?![\w$])|[^\w$](delete|instanceof|typeof|new|in|void|get|set)(?=\s)|[^\w$](false|true|null|Infinity|NaN|undefined|\d+(?:\.\d+)?)(?![\w$])/g,
		args_replacer = function (m, m1, m2) { return '<span class="variable">' + (m1 || m2) + '</span>'; },
		highlightBody = function (code, vars, functions) {
			var func_replacer = function (m, m1) {
				var t = functions[m1];
				return t.prefix.replace(arg_re, args_replacer) + '{<span class="ec_btn">+</span><span class="body">' + highlightBody(t.body, t.variables.concat(vars), functions) + '</span>}';
			};
			return code.replace(new RegExp('[^\\w$](?:window|document|(?:de|en)codeURI(?:Component)?|(?:un)?escape|eval|is(?:Finite|NaN)|parse(?:Float|Int)' + (vars.length ? '|' + vars.join('|').replace(/\$/g, '\\$') : '') + ')(?![\\w$])', 'g'),
				function (m) {
					return m[0] + '<span class="variable">' + m.substr(1) + '</span>';
				}).replace(restore_func_re, func_replacer);
		};
	exports.highlight = function (ret) {
		var s = ret.s, escapes = ret.escapes, strings = ret.strings, comments = ret.comments, regexps = ret.regexps, variables = ret.variables, vars = [], l = variables && variables.length, t;
		while (l) {
			t = variables[l -= 1];
			if (vars.indexOf(t) === -1) {
				vars.push(t);
			}
		}
		s = highlightBody(s, vars, ret.functions);
		s = s.replace(keyword_re,
			function (m, m1, m2, m3) {
				if (m1) {
					return m[0] + '<span class="statement">' + m1 + '</span>';
				}
				if (m2) {
					return m[0] + '<span class="operator">' + m2 + '</span>';
				}
				if (m3) {
					return m[0] + '<span class="primitive">' + m3 + '</span>';
				}
				return m;
			});
		return s.replace(sub_re,
			function (m, m1) {
				switch (m1) {
				case '@':
					return '<span class="string">' + strings.shift().replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>';
				case '#':
					return '<span class="comment">' + comments.shift().replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>';
				case '$':
					return '<span class="regexp">' + regexps.shift().replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>';
				}
			}).replace(/\r\n|\r|\n/g, '<br>').replace(/[ \t](?![^<>\r\n]+>)/g,
			function (m) {
				return m === ' ' ? '&nbsp;' : '&nbsp;&nbsp;&nbsp;&nbsp;';
			}).replace(/\x1b/g, function () { return escapes.shift(); });
	};
});