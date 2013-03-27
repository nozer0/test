/**
 * User: nozer0
 * Date: 3/5/13
 * Time: 10:08 PM
 */

define(function (require, exports) {
	'use strict';
	var root = this.self === this ? this : window, base = '', alias = {}, maps = [], loc_re = /^(?:(https?:)\/\/)?(([^:\/]+):?([\d]+)?)([^?#]+?([^\/?#]+?)?(?:\.(\w+))?)(\?[^#]+)?(#\S*)?$/, http_re = /^https?:\/\/\w/, root_re = /(\w)\/.+/, base_re = /(\w\/)\/?[^\/]+$/, parent_re = /\/[^\/]+\/\.\.\//, host_re = /(?:^https?:\/\/)?([^\/]+)\//i;
	exports.isSameHost = function (uri, host) {
		var t = host_re.exec(uri);
		return t && t[1] === (host || root.location.host);
	};
	exports.location = function (uri) {
		var t = loc_re.exec(uri);
		return t ? {uri : t[1] ? uri : 'http://' + uri, protocol : t[1] || 'http:', host : t[2], hostname : t[3], port : t[4] || '', pathname : t[5] || '', filename : t[6] || '', ext : t[7] || '', search : t[8] || '', hash : t[9] || ''} : {uri : uri};
	};
	exports.config = function (cfg) {
		var k, src, i, l, m, s;
		if (!cfg) { return; }
		if (cfg.base) { base = cfg.base.replace(base_re, '$1'); }
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
	};
	exports.resolve = function (uri, cbase) {
		var s = alias[uri] || uri, i, l;
		if (!http_re.test(s)) {
			l = cbase || base;
			if (l) {
				s = l.replace(/^\/\w/.test(s) ? root_re : base_re, '$1') + s;
			}
		}
		while (parent_re.test(s)) {
			s = s.replace(parent_re, '/');
		}
		s = s.replace(/\/\.\//g, '/');
		for (i = 0, l = maps.length; i < l; i += 1) {
			s = s.replace(maps[i], maps[i += 1]);
		}
		return s;
	};
});