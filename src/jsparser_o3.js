/**
 * User: nozer0
 * Date: 3/11/13
 * Time: 1:59 PM
 */

define('jsparser', function (require, exports) {
	'use strict';
	// string|comment|(|) + uncertain slash|)|regexp
	var re = /(".*?"|'.*?')|(\/\*[\s\S]*?\*\/|\/\/.*)|((\$)?\b(?:if|for|while)\s*)?(\()|(\)\s*)(\/([^\/*][\s\S]*$))|\)|((?:^|[^$\w\s])\s*)(\/(?:[^\r\n\/*\[]|\[.*?\])(?:[^\/\r\n\[]|\[.*?\])*\/(?:[img]{1,3})?)/g,
		precompile = exports.precompile = function (code) {
			var escapes = [], parenthesis = [], strings = [], comments = [], regexps = [], store, replacer = function (m, s, cm, lp_prefix, $, lp, rp, rp_suffix, rp_suffix2, regexp_prefix, regexp) {
				var t;
				if (s) {
					strings.push(m);
					return '\x1c@';
				}
				if (cm) {
					comments.push(m);
					return '\x1c#';
				}
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
				if (rp) {
					t = store && parenthesis.pop();
					if (t === undefined) {
						store = false;
					}
					// to be faster, use capture group instead of string concatenation
					// and not start from the beginning each time
					return rp + (t ? rp_suffix.replace(re, replacer) : '/' + rp_suffix2.replace(re, replacer));
				}
				if (regexp) {
					regexps.push(regexp);
					return regexp_prefix + '\x1c$';
				}
				if (store && m[0] === ')') {
					parenthesis.pop();
				}
				return m;
			}, s = code.replace(/\\[\s\S]/g,
				function (m) {
					escapes.push(m);
					return '\x1b';
				}).replace(re, replacer);
			return {s : s, escapes : escapes, strings : strings, comments : comments, regexps : regexps};
		},
		var_re = /\bvar\s+([\s\S]+?(?:;|[\w$@\]][\s\x1c#]*[\r\n]+[\s\x1c#]*(?=[\w$\x1d]|\x1c@)))/g,
		group_re = /[(\[][^()\[\]]+[)\]]/g, vars_re = /(?:^|,)(?:\s|\x1c#)*([\w$]+)/g,
		args_re = /[\w$]+/g, func_re = /\x1d$(\d+)/g,
		block_re = /(^|[^\w$])function(\s*[\w$]*\s*)(\([^)]*\)\s*)\{([^{}]*)\}|(\)\s*|else\s*)?\{([^{}]*)\}/g;
	exports.parse = function (code, compiled) {
		var ret = compiled ? code : precompile(code), functions = ret.functions = [], blocks = ret.blocks = [], objects = ret.objects = [], s = ret.s, block_replacer = function (m, fn_prefix, head, args, body, prefix, block) {
			var t, vars_replacer;
			if (fn_prefix) {
				t = args.match(args_re) || [];
				vars_replacer = function (m, m1) {
					return t.push(m1);
				};
				body.replace(var_re,
					function (m, m1) {
						while (group_re.test(m1)) { // remove the commas inside array or parenthesis
							m1 = m1.replace(group_re, 0);
						}
						m1.replace(vars_re, vars_replacer);
						return '';
					}).replace(func_re, function (m, m1) {  // get named function
						var n = functions[m1 - 1].name;
						if (n) { t.push(n); }
					});
				return fn_prefix + '\x1d$' + functions.push({name : m[0] !== '=' && head.replace(/\s+/g, ''), variables : t, head : head, args : args, body : body});
			}
			return prefix ? prefix + '\x1d#' + blocks.push(block) : '\x1d@' + objects.push(block);
		};
		while (/\{/.test(s)) {
			s = s.replace(block_re, block_replacer);
		}
		ret.s = s;
		return ret;
	};
});

define('highlighter', function (require, exports) {
	'use strict';
	var func_re = /\x1d\$(\d+)/g, block_re = /\x1d[#@](\d+)/g, sub_re = /\x1c([@#$%])/g,
		keyword_re = /[^\w$](if|else|switch|case|default|continue|break|for|do|while|each|try|catch|finally|with|function|var|this|return|throw|import|export)(?![\w$])|[^\w$](delete|instanceof|typeof|new|in|void|get|set)(?=\s)|[^\w$](false|true|null|Infinity|NaN|undefined|\d+(?:\.\d+)?)(?![\w$])/g,
		highlightBody = function (code, vars, functions, blocks, objects) {
			var block_replacer = function (m, m1) {
				return (m[1] === '#' ? '<span class="block">{' + blocks[m1 - 1] : '<span class="object">{' + objects[m1 - 1]) + '}</span>';
			};
			while (block_re.test(code)) {
				code = code.replace(block_re, block_replacer);
			}
			return code.replace(func_re,
				function (m, m1) {
					var t = functions[m1 - 1];
//						v = vars.concat(t.variables);
//						t.vars = t.parameters ? v.concat(t.parameters) : v;
					return '<span class="keyword">function</span>' + t.head + t.args.replace(/([\w$]+)/g, '<span class="argument">$1</span>') + '<span class="body">{' + highlightBody(t.body, t.parameters ? t.variables.concat(t.parameters) : t.variables, functions, blocks, objects) + '}</span>';
				}).replace(new RegExp('(?:^|[^\\w$])(window|document|(?:de|en)codeURI(?:Component)?|(?:un)?escape|eval|is(?:Finite|NaN)|parse(?:Float|Int)' + (vars.length ? '|' + vars.join('|').replace(/\$/g, '\\$') : '') + ')(?![\\w$])', 'g'),
				function (m, m1) {
					return m[0] + '<span class="variable">' + m1 + '</span>';
				});
		};
	exports.highlight = function (ret) {
		var s = ret.s, escapes = ret.escapes, strings = ret.strings, comments = ret.comments, regexps = ret.regexps;
		s = highlightBody(s, [], ret.functions, ret.blocks, ret.objects);
		return s.replace(keyword_re,
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
			}).replace(sub_re,
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
})
;