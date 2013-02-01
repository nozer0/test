/**
 * User: nozer0
 * Date: 1/15/13
 * Time: 10:32 AM
 * http://seajs.org/tests/research/load-js-css/test.html
 * http://www.fantxi.com/blog/archives/preload-images-css-js
 * https://developer.mozilla.org/en-US/docs/Link_prefetching_FAQ
 */
(function () {
	var root = this, _define = this.define;
	this.define = (typeof _define === 'function' && _define.amd) ? function (factory) { // AMD
		_define(['require', 'exports'], factory);
	} : (typeof this.require === 'function' && typeof this.exports === 'object' ? function (factory) {    // CMD
		factory(this.require, this.exports);
	} : function (factory) {    // GLOBAL
		factory(function (module) { return root[module]; }, this);
	});
}());
define(function (require, exports) {
	var root = this, doc = this.document, head = doc.getElementsByTagName('head')[0], jsonload = 'onload' in doc.createElement('script'), cssonready = 'onreadystatechange' in doc.createElement('link'), oldie = (navigator.userAgent.match(/ie[\/: ](\d+)/i) || [])[1] < 9, load;

	function getType(url) {
		var s = url.indexOf('?');
		s = url.substring(url.lastIndexOf('/') + 1, s === -1 ? url.length : s);
		s = s.substr(s.lastIndexOf('.') + 1);
		return s === 'js' || s === 'css' ? s : 'img';
	}

	exports.preload = function (url, type) {
		var cfg = [], l, s, d, t;
		// IE can't preload js&css via Image, and other browser can't use cache via Image
		if (typeof url === 'string') {
			t = type || getType(url);
			if (t === 'js' || t === 'css') {
				cfg.push({ url : url, type : type || getType(url) });
			} else {
				load(url, null, 'img');
			}
		} else {    // multiple
			for (cfg = [], l = url.length; l;) {
				o = url[l -= 1];
				if (typeof o === 'string') {
					s = o;
					t = getType(o);
				} else {
					s = o.url;
					t = o.type;
				}
				if (t === 'js' || t === 'css') {
					cfg.push({ url : s, type : t });
				} else {
					load(o, null, 'img');
				}
			}
		}
		l = cfg.length;
		if (!l) { return; }
		s = doc.createElement('iframe');
		s.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(1px 1px 1px 1px);clip:rect(1px,1px,1px,1px)';
		s.scrolling = 'no';
		s.onload = function () {
			s.onload = null;
			doc.body.removeChild(s);
		};
		doc.body.appendChild(s);
		d = s.contentDocument || s.contentWindow.document;
		d.open();
		d.write('<!doctype><html><head></head><body>');
		while (l) {
			t = cfg[l -= 1];
			if (t.type === 'js') {
				d.write('<script type="text/javascript" src="' + t.url + '"></script>');
			} else if (t.type === 'css') {
				d.write('<link type="text/css" rel="stylesheet" href="' + t.url + '">');
			} else {
				d.write('<img src="' + t.url + '">');
			}
		}
		d.write('</body></html>');
		d.close();
	};
	exports.load = load = function (url, callback, type) {
		var s, timer;
		if (!type) {
			type = getType(url);
		}
		switch (type) {
			case 'js':
				s = doc.createElement('script');
				s.type = 'text/javascript';
				s.async = true;
//				if (defer) {    // support by all browsers except Opera
//					s.defer = true;
//				}
				if (callback) {
					if (jsonload) {
						s.onload = function (e) {
							this.onload = this.onerror = null;
							callback.call(this, url, true, e);
						};
						s.onerror = function (e) {
							this.onload = this.onerror = null;
							callback.call(this, url, false, e);
						};
					} else {    // IE6-8
						s.onreadystatechange = function () {
							if (this.readyState === 'loaded' || this.readyState === 'complete') {
								s.onreadystatechange = null;
								// currently, no way to detect load error,
								// both the first time of normal load and error load will trigger 'loading' and 'loaded'
								callback.call(this, url, true);
							}
						};
					}
				}
				s.src = url;
				doc.body.appendChild(s);
				break;
			case 'css':
				var fn;
				s = doc.createElement('link');
				s.rel = 'stylesheet';
				s.type = 'text/css';
				if (callback) {
					if (cssonready) {   // IE triggers 'readystatechange' but not 'error'
						s.onload = function (e) {
							this.onload = null;
							// IE can access 'cssRules' immediately when load
							callback.call(this, url, ((this.sheet ? this.sheet.cssRules : this.styleSheet.rules) || []).length, e);
						};
					} else {
						s.onload = fn = function (e) {
							this.onload = this.onerror = null;
							//'cssRules' can be accessed after css parsing finish, and can't use timer here
							callback.call(this, url, true, e);
						};
						s.onerror = function (e) {
							this.onload = this.onerror = null;
							callback.call(this, url, false, e);
						};
					}
				}
				s.href = url;
				head.appendChild(s);
				break;
			default:    // it supports cache to return 302
				s = new Image();
				if (callback) {
					s.onload = oldie ? function () {
						this.onload = null; // MUST, to forbid duplicate call
						// IE6-8, it will trigger 'onload' first, then 'onerror'
						timer = root.setTimeout(function () { callback.call(this, url, true); }, 0);
					} : function (e) {
						this.onload = this.onerror = null;
						callback.call(this, url, true, e);
					};
					// if 404, or not image, it will call error handler, and return nothing
					s.onerror = function (e) {
						this.onload = this.onerror = null;
						if (timer) {
							root.clearTimeout(timer);
							timer = null;
						}
						callback.call(this, url, false, e);
					};
				}
				s.src = url;
		}
	};
});