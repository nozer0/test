/**
 * User: nozer0
 * Date: 3/5/13
 * Time: 10:08 PM
 * Modified: Apr 2, 2013 1:57 PM
 */

define(function (require, exports) {
	'use strict';
	var root = this || window, base = '', alias = {}, maps = [], loc_re = /^(?:(\w+:)\/\/)?(([^:\/]+):?([\d]+)?)([^?#]+?([^\/?#]+?)?(?:\.(\w+))?)(\?[^#]+)?(#\S*)?$/, protocol_re = /:\/\/\w/, root_re = /(?:\w+:\/\/)?([^\/]*)(?=$|[#?\/])/, base_re = /[^\/]*$/, parent_re = /^[^\/]+\/\.\.\/|\/[^\/]+\/\.\.(?=\/)/, location = root.location;
	exports.isSameHost = function (uri, host) {
		var t = root_re.exec(uri);
		return t && t[1] === (host || (location && location.hostname));
	};
	exports.location = function (uri) {
		var t = loc_re.exec(uri);
		return t ? {uri : t[1] ? uri : 'http://' + uri, protocol : t[1] || 'http:', host : t[2], hostname : t[3], port : t[4] || '', pathname : t[5] || '', filename : t[6] || '', ext : t[7] || '', search : t[8] || '', hash : t[9] || ''} : {uri : uri};
	};
	exports.globalConfig = function (cfg) {
		var k, src, i, l, m, s;
		if (!cfg) { return; }
		if (cfg.hasOwnProperty('base')) { base = cfg.base; }
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
		return this;
	};
	exports.resolve = function (uri, ubase, ualias, umaps) {
		var s, i, l, t;
		if (typeof ubase === 'Object') {
			ualias = ubase.alias;
			umaps = ubase.maps;
			ubase = ubase.base;
		}
		s = alias[uri] || (ualias && ualias[uri]) || uri;
		if (!protocol_re.test(s)) {
			t = typeof ubase === 'string' ? ubase : base;
			if (t) {
				s = s[0] === '/' ? root_re.exec(t)[0] + s : t.replace(base_re, s);
			}
		}
		t = /([^:])\/{2,}/;
		while (t.test(s)) {
			s = s.replace(t, '$1/');
		}
		s = s.replace(/\/\.(?=\/)/g, '');
		while (parent_re.test(s)) {
			s = s.replace(parent_re, '');
		}
		for (i = 0, t = umaps ? umaps.concat(maps) : maps, l = t.length; i < l; i += 1) {
			s = s.replace(t[i], t[i += 1]);
		}
		return s;
	};
});