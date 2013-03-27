/**
 * User: nozer0
 * Date: 3/11/13
 * Time: 1:59 PM
 */

/**
 * based on ecma-262 edition 5.1
 *
 *  white space     : [\s\uFEFF]+, <TAB>\x09, <VT>\x0b, <FF>\x0c, <SP>\x20, <NBSP>\xa0, <LS>\u2028, <PS>\u2029
 *  line terminator : [\r\n\u2028\u2029]+, <LF>\n, <CR>\r, <LS>\u2028, <PS>\u2029
 *  comment         : \/\*[\s\S]*?\*\/, \/\/.*
 *  identifier      : [a-zA-Z_$][\w$]*, actually, 'var 你好' is also legal
 *  punctuator      : [{}()\[\].;,<>=+-*\/%!&|^~?:]
 *  numeric         : decimal : ([1-9]\d*\.?\d*|\.\d+)([eE][+-]\d+)?, octal : \d+, hex: 0[xX][a-fA-F\d]+
 *  string          : "([^"\\]|\\x[a-fA-F\d]{2}|\\u[a-fA-F\d]{4}|\\[^xu])*", '([^'\\]|\\x[a-fA-F\d]{2}|\\u[a-fA-F\d]{4}|\\[^xu])*'
 *  regexp          : \/([^*\/\[\\\r\n]|\\.|\[([^\]\\\r\n]|\\.)*\])([^\/\[\\\r\n]|\\.|\[([^\]\\\r\n]|\\.)*\])*\/(?:im?g?|igm|mg?i?|mig|gm?i?|gim)\b(?!\$)
 *
 *  primary         : this|<identifier>|<literal>|[.*]|{.*}|(<expression>)
 *  array           : \[((<primary>(=<expression>)?)?,)*(<primary>(=<expression>)?|,*)\]
 *  object          : \{((<identifier>|<literal>):<expression>,)*((<identifier>|<literal>):<expression>|,)?\}
 *
 *  ASI
 *      <Expression> [not line terminator] ++|--
 *      continue|break|return|throw [no line terminator] <Expression>
 */

define('jsparser', function (require, exports) {
	'use strict';
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
					strings.push(m);
					return '\x1c@';
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

define('highlighter', function (require, exports) {
	'use strict';
	var block_re = /\x1d[#@](\d+)/g, sub_re = /\x1c([@$])|\xa0/g, op_re = /[+\-*\/?:=<>&|!\^\[\]\.]+/g,
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