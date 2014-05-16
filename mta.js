(function (window, document) {

/* global escape, unescape */
/* exported util */

var hasOwnProp = Object.prototype.hasOwnProperty;
var util = {
    /**
     * 哈希函数。
     * @param str {String} 需要哈希的字符串。
     * @return ｛String｝哈希的结果字符串。
     */
    hash: function (str) {
        /*jshint bitwise:false*/
        var hash = 1,
            charCode = 0,
            idx;
        if (str) {
            hash = 0;
            for (idx = str.length - 1; idx >= 0; idx--) {
                charCode = str.charCodeAt(idx);
                hash = (hash << 6 & 268435455) + charCode + (charCode << 14);
                charCode = hash & 266338304;
                hash = charCode !== 0 ? hash ^ charCode >> 21 : hash;
            }
        }
        return hash;
    },

    random: function () {
        return Math.round(Math.random() * 2147483647);
    },

    stringify: function (data) {
        if (typeof JSON !== 'undefined' && JSON.stringify) {
            return JSON.stringify(data);
        }
        var type = typeof data;
        switch (type) {
        case 'string':
            return '"' + data + '"';
        case 'boolean':
        case 'number':
            return String(data);
        case 'object':
            if (null === data) {
                return 'null';
            }
            var c = false, d = '';
            for (var prop in data) {
                if (hasOwnProp.call(data, prop)) {
                    var e = '' + prop,
                        f = util.stringify(data[prop]);
                    if (f.length) {
                        if (c) {
                            d += ',';
                        } else {
                            c = true;
                        }
                        d += (data instanceof Array) ? f : '"' + e + '":' + f;
                    }
                }
            }
            return (data instanceof Array) ? '[' + d + ']' : '{' + d + '}';
        default:
            return '';
        }
    },

    debug: function (message, isError) {
        if (typeof console !== 'undefined' && console.log) {
            if (isError && console.warn) {
                console.warn(message);
            } else {
                console.log(message);
            }
        }
    },

    encode: function (uri, isAll) {
        if (encodeURIComponent instanceof Function) {
            return isAll ? encodeURI(uri) : encodeURIComponent(uri);
        } else {
            return escape(uri);
        }
    },

    decode: function (encodedURI, isAll) {
        var uri;
        encodedURI = encodedURI.split("+").join(" ");
        if (decodeURIComponent instanceof Function) {
            try {
                uri = isAll ? decodeURI(encodedURI) : decodeURIComponent(encodedURI);
            } catch (ex) {
                uri = unescape(encodedURI);
            }
        } else {
            uri = unescape(encodedURI);
        }
        return uri;
    },

    merge: function (receiver, supplier) {
        for (var key in supplier) {
            if (hasOwnProp.call(supplier, key)) {
                receiver[key] = supplier[key];
            }
        }
        return receiver;
    },

    buildQueryString: function (data) {
        var encode = util.encode;

        // construct query string
        var key, dataStr = [];
        for (key in data) {
            if (hasOwnProp.call(data, key)) {
                var value = typeof data[key] === 'object' ? util.stringify(data[key]) : data[key];
                dataStr.push(encode(key) + '=' + encode(value));
            }
        }
        return dataStr.join('&');
    },

    addEventListener: function (name, callback, useCapture) {
        if (window.addEventListener) {
            return window.addEventListener(name, callback, useCapture);
        } else if (window.attachEvent) {
            return window.attachEvent('on' + name, callback);
        }
    },

    onload: function (callback) {
        if (document.readyState === 'complete') {
            callback();
        } else {
            util.addEventListener('load', callback, false);
        }
    },

    domready: function (callback) {
        if (document.readyState === 'interactive') {
            callback();
        } else if (document.addEventListener) {
            document.addEventListener('DOMContentLoaded', callback, false);
        } else if (document.attachEvent) {
            document.attachEvent('onreadystatechange', callback);
        }
    },

    /**
     * page unload
     * onbeforeunload is the right event to fire, but not all browsers don't support it.
     * This allows us to fall back to onunload when onbeforeunload isn't implemented
     */
    onunload: function (callback) {
        util.addEventListener('unload', callback, false);
        util.addEventListener('beforeunload', callback, false);
    },

    now: function () {
        return (new Date()).getTime();
    }

};

;/* exported Cookie */

var Cookie = {
    /**
     * 获取cookie值
     * @param {String} name
     * @return {String} cookie值
     */
    get: function (name) {
        var cookie = document.cookie,
            arg = name + "=",
            alen = arg.length,
            clen = cookie.length,
            i = 0;
        while (i < clen) {
            var j = i + alen;
            if (cookie.substring(i, j) === arg) {
                return this._getValue(j);
            }
            i = cookie.indexOf(" ", i) + 1;
            if (i === 0) break;
        }
        return "";
    },

    /**
     * 设置cookie值
     * @param {String} name
     * @param {String|Number} value
     * @param {String} expires
     * @param {String} path
     * @param {String} domain
     * @param {String} secure
     */
    set: function (name, value, expires, path, domain, secure) {
        domain = domain ? domain : this._getDomain();
        document.cookie = name + "=" + encodeURIComponent(value) +
            ((expires) ? "; expires=" + expires : "") +
            ((path) ? "; path=" + path : "; path=/") +
            ((domain) ? "; domain=" + domain : "") +
            ((secure) ? "; secure" : "");
    },

    /**
     * 获取过期时间
     * @param {Number} days 天数
     * @param {Number} hours 小时数
     * @param {Number} minutes 分钟数
     * @return {String} 过期时间字符串
     */
    getExpire: function (days, hours, minutes) {
        var date = new Date();
        if (typeof days === "number" && typeof hours === "number" && typeof hours === "number") {
            date.setDate(date.getDate() + parseInt(days, 10));
            date.setHours(date.getHours() + parseInt(hours, 10));
            date.setMinutes(date.getMinutes() + parseInt(minutes, 10));
            return date.toGMTString();
        }
    },

    /**
     * 获取offset起的一对键值
     * @param {Number} offset
     * @return {String} 一对键值组成的字符串
     */
    _getValue: function (offset) {
        var cookie = document.cookie,
            endstr = cookie.indexOf(";", offset);
        if (endstr === -1) {
            endstr = cookie.length;
        }
        return decodeURIComponent(cookie.substring(offset, endstr));
    },

    /**
     * get domain
     */
    _getDomain: function () {
        /*global M*/
        var domain = document.domain;
        if (typeof M !== 'undefined' && M.DOMAIN_HOST) {
            domain = '.' + M.DOMAIN_HOST;
        }
        if ("www." === domain.substring(0, 4)) {
            domain = domain.substring(4);
        }
        return domain;
    }

};

;/* global util, Cookie */

var COOKIE_USER_TRACKING = '__mta';

/**
 * 采集客户端信息, Stealing from GA
 */
function Client() {
    var empty = "-",
        encode = util.encode,
        screen = window.screen,
        navigator = window.navigator,
        viewport = this._getViewport();

    this.screen = screen ? screen.width + "x" + screen.height : empty;
    this.viewport = viewport.width + "x" + viewport.height;
    this.charset = encode(document.characterSet ? document.characterSet : document.charset ? document.charset : empty);
    this.language = (navigator && navigator.language ? navigator.language : navigator && navigator.browserLanguage ? navigator.browserLanguage : empty).toLowerCase();
    this.javaEnabled = navigator && navigator.javaEnabled() ? 1 : 0;
    this.isFirstVisit = false;
    this.setCookie();
}

Client.prototype = {
    setCookie: function () {
        var cookieStr = Cookie.get(COOKIE_USER_TRACKING),
            expire = Cookie.getExpire(720, 0, 0),
            now = util.now();

        // if empty cookieStr, create newone, expire in 2 years
        if (!cookieStr) {
            var userId = this._hashInfo(),
                gmtFirstVisit = now,
                gmtLastVisit = now,
                gmtThisVisit = now,
                visitCount = 1;

            cookieStr = [userId, gmtFirstVisit, gmtLastVisit, gmtThisVisit, visitCount].join('.');
            Cookie.set(COOKIE_USER_TRACKING, cookieStr, expire);

            this.isFirstVisit = true;
            this.uuid = userId;

        // increment visit count, update last visit gmt
        } else {
            cookieStr = cookieStr.split('.');
            cookieStr[2] = cookieStr[3];
            cookieStr[3] = now;
            cookieStr[4] = parseInt(cookieStr[4], 10) + 1;
            Cookie.set(COOKIE_USER_TRACKING, cookieStr.join('.'), expire);
            this.uuid = cookieStr[0];
        }
    },
    getInfo: function () {
        return {
            /*jshint camelcase:false*/
            sr: this.screen,
            vp: this.viewport,
            csz: document.cookie ? document.cookie.length : 0
        };
    },
    _hashInfo: function () {
        var navigator = window.navigator,
            historyCount = window.history.length;

        /*jshint laxbreak:true*/
        navigator = navigator.appName
            + navigator.version
            + this.language
            + navigator.platform
            + navigator.userAgent
            + this.javaEnabled
            + this.screen
            + (document.cookie ? document.cookie : "")
            + (document.referrer ? document.referrer : "");

        /*jshint bitwise:false*/
        for (var len = navigator.length; historyCount > 0;) {
            navigator += historyCount-- ^ len++;
        }
        return util.hash(navigator);
    },
    _getViewport: function () {
        // This works for all browsers except IE8 and before
        if (window.innerWidth !== null) {
            return {
                width: window.innerWidth,
                height: window.innerHeight
            };
        }

        // For IE (or any browser) in Standards mode
        if (document.compatMode === "CSS1Compat") {
            return {
                width: document.documentElement.clientWidth,
                height: document.documentElement.clientHeight
            };
        }

        // For browsers in Quirks mode
        return {
            width: document.body.clientWidth,
            height: document.body.clientWidth
        };
    }
};


;/* globals util */

/**
 * 数据发送，当数据长度符合要求时发送正常beacon
 * 如果数据长度太大，发送数据长度的错误日志方便后端统计错误条数
 */
function Beacon(imageUrl) {
    this.imageUrl = imageUrl;
}

Beacon.prototype = {
    /**
     * send a beacon request
     * @param {Object} data 发送的数据
     * @param {Function} callback 发送完毕之后的回调
     */
    send: function (data, callback) {
        var dataStr = util.buildQueryString(data);

        // fast return when nothing to send
        if (!dataStr.length) {
            return;
        }

        // send beacon request, max url length comes from google analytics
        if (dataStr.length <= 4096) {
            this._sendByImage(dataStr, callback);
        } else {
            this._sendByImage("err=len&max=2036&len=" + dataStr.length, callback);
        }
    },
    _sendByImage: function (param, callback) {
        var image = new Image(1, 1);
        image.src = this.imageUrl + '?' + param;
        image.onload = function () {
            image.onload = null;
            if (callback) {
                callback();
            }
        };
    }
};


;/* global util, Client, Beacon */

/**
 * 创建新的性能数据追踪器
 * @param {Object} params
 *      beacon 发送beacon的图片地址，默认为beacon.gif
 *      useCombo 是否自动合并beacon请求，默认打开
 *      sampleRate 抽样比率，取值1~100之间
 */
function Tracker(config) {
    this._config = util.merge({
        sampleRate: 100,
        useCombo: true,
        beacon: document.location.protocol + '//frep.' + ((typeof M === 'object') ? M.CDN_DOMAIN_HOST : 'meituan.net') + '/_.gif'
    }, config || {});

    this._client = new Client();
    this._beacon = new Beacon(this._config.beacon);

    this._queue = [];
    this._timer = null;

    this.app = null;        // 产品线标识符
    this.tags = {};         // 每个请求都会带上的信息

    this.visitorCode = util.random();

}

Tracker.VERSION = 3;

/**
 * 插件管理
 */
Tracker.Plugins = {};
Tracker.addPlugin = function (name, plugin) {
    if (typeof plugin.data !== 'function') {
        throw new Error('cannot add plugin: ' + name);
    }
    Tracker.Plugins[name] = plugin;
};

Tracker.prototype = {
    /**
     * 执行指定的command, 该command应该是1个数组
     * 该数组的第1个元素必须是作为字符串传递的跟踪器对象方法的名称
     * 其余数组元素则是要作为不同参数传递给函数
     * 作用是在本脚本完全载入之前使用数组来替代 _mta
     * @param {Array} command 要执行的命令，可传入多项
     * @return {Number} 未能执行的命令的数量
     */
    push: function (/* command */) {
        var slice = Array.prototype.slice;
        for (var error = 0, i = 0, n = arguments.length; i < n; i++) {
            try {
                var command = arguments[i];
                if (typeof command === "function") {
                    arguments[i](this);
                } else {
                    command = slice.call(command, 0);
                    var fn = command[0];
                    this[fn].apply(this, command.slice(1));
                }
            } catch (exception) {
                error++;
            }
        }
        return error;
    },

    /**
     * set appname
     */
    create: function (appName, config) {
        this.app = appName;
        this._config = util.merge(this._config, config || {});
    },

    /**
     * update config
     */
    config: function (key, value) {
        switch (key) {
        case 'sampleRate':
            if (typeof value === 'number') {
                this._config.sampleRate = value;
            }
            break;
        case 'beaconImage':
            if (value) {
                this._config.beacon = value;
                this._beacon = new Beacon(this._config.beacon);
            }
            break;
        }
    },

    /**
     * add/remove tag
     */
    tag: function (key, value) {
        if (typeof value !== 'undefined') {
            this.tags[key] = value;
        } else if (typeof this.tags[key] !== 'undefined') {
            delete this.tags[key];
        }
    },

    /**
     * add plugin data into queue
     * or add data directly
     */
    send: function (key, data, type) {
        if (!key) {
            return;
        }
        var plugin = Tracker.Plugins[key];
        var hasNewData = false;
        if (plugin) {
            data = plugin.data();
            if (data) {
                hasNewData = true;
                this._queue.push({
                    category: key,
                    type: plugin.type || 'timer',
                    data: data
                });
            }
        } else if (typeof data !== 'undefined') {
            hasNewData = true;
            this._queue.push({
                category: key,
                type: type || 'timer',
                data: data
            });
        }

        if (hasNewData) {
            var tracker = this;
            if (this._timer) {
                window.clearTimeout(this._timer);
                this._timer = null;
            }
            this._timer = window.setTimeout(function () {
                tracker._send.call(tracker);
            }, 200);
        }
    },

    /**
     * send arbitary timing data
     * @example
     *      mta('timing', 'api', {deal/dynamic: 25})
     *      mta('timing', 'feature', { sidebar: {total:123, wait:100, api:200}})
     */
    timing: function (category, data) {
        this.send(category, data, 'timer');
    },

    /**
     * send arbitary counter data
     */
    count: function (category, data) {
        this.send(category, data, 'counter');
    },

    /**
     * send arbitary gauge data
     */
    gauge: function (category, data) {
        this.send(category, data, 'gauge');
    },

    /**
     * Construct a querystring of episodic time measurements and send it to the specified URL.
     * @param {Object} data An object of key|value pairs that are added to the URL's querystring
     */
    _send: function (data, sampleRate) {
        if (!this.app || !this._isSample(sampleRate)) {
            return;
        }

        var merge = util.merge,
            useCombo = this._config.useCombo,
            clientInfo = this._client.getInfo();

        var payload = merge({
            app: this.app,
            type: 'combo'
        }, data);

        payload = merge(payload, this.tags);
        payload = merge(payload, clientInfo);

        // single send
        if (data) {
            return this._beacon.send(payload);

        // combo send
        } else if (this._queue.length) {
            if (useCombo) {
                if (this._queue.length === 1) {
                    payload = merge(payload, this._queue[0]);
                    this._beacon.send(payload);
                } else {
                    payload.data = this._queue;
                    this._beacon.send(payload);
                }
            } else {
                // FIXME 过大的Queue可能导致URL过长
                for (var i = 0, n = this._queue.length; i < n; i++) {
                    this._beacon.send(this._queue[i]);
                }
            }

            // reset queue
            this._queue = [];
        }
    },

    /**
     * 是否命中采样，对于第1次访问的始终采集所有数据
     * CAUTION: 第1次上线这个脚本的城市会全量采样
     */
    _isSample: function (sampleRate) {
        sampleRate = sampleRate > 0 ? sampleRate : this._config.sampleRate;
        return (this.visitorCode % 1E4) < (sampleRate * 100);
    }

};

;/* global Tracker */

/**
 * cdn timing data collector
 *
 * @see http://www.w3.org/TR/2014/CR-resource-timing-20140325/
 * TODO move sub.js into this
 */
Tracker.addPlugin('cdn', {
    type: 'timer',
    data: function () {
        /* global M,SubResoucesTiming */
        if (typeof M === 'object' && M.subresources && M.subresources.names && SubResoucesTiming) {
            window.SubResoucesTiming = SubResoucesTiming;
            var lastImage = M.subresources.lastImage || "",
                firstImage = M.subresources.firstImage || "",
                resources = new SubResoucesTiming(M.subresources.names, lastImage, firstImage);

            if (!resources.length) {
                return;
            }

            var data = {};
            for (var i = 0, n = resources.length; i < n; i++) {
                var resource = resources[i];
                if (resource.server) {
                    data[resource.server] = {};
                    for (var key in resource) {
                        if (resource.hasOwnProperty(key) && parseInt(resource[key], 10) > 0) {
                            data[resource.server][key] = resource[key];
                        }
                    }
                }
            }

            return data;
        }
    }
});
;/* global Tracker */

/**
 * network data
 *
 * @see https://dvcs.w3.org/hg/webperf/raw-file/tip/specs/NavigationTiming/Overview.html
 * @see http://www.lognormal.com/blog/2013/11/11/calculating-first-paint/
 */

Tracker.addPlugin('network', {
    type: 'timer',
    data: function () {
        var win = window,
            performance = win.performance || win.mozPerformance || win.msPerformance || win.webkitPerformance;

        if (!performance) {
            return;
        }

        // append data from window.performance
        var timing = performance.timing;
        var data = {
            connection: timing.connectEnd - timing.connectStart,                    // 建连时间
            domainLookup: timing.domainLookupEnd - timing.domainLookupStart,        // DNS查找时间
            request: timing.responseStart - timing.requestStart,                    // 后端时间
            response: timing.responseEnd - timing.responseStart,                    // 接收时间
        };

        return data;
    }
});

;/* global Tracker */

/**
 * page loading, rendering performance data
 *
 * @see https://dvcs.w3.org/hg/webperf/raw-file/tip/specs/NavigationTiming/Overview.html
 * @see http://www.lognormal.com/blog/2013/11/11/calculating-first-paint/
 */

Tracker.addPlugin('page', {
    type: 'timer',
    data: function () {
        var win = window,
            performance = win.performance || win.mozPerformance || win.msPerformance || win.webkitPerformance;

        if (!performance) {
            return;
        }

        // append data from window.performance
        var timing = performance.timing;
        var data = {
            connection: timing.connectEnd - timing.connectStart,                    // 建连时间
            domainLookup: timing.domainLookupEnd - timing.domainLookupStart,        // DNS查找时间
            request: timing.responseStart - timing.requestStart,                    // 后端时间
            response: timing.responseEnd - timing.responseStart,                    // 接收时间
            load: timing.loadEventEnd,                                              // 完全加载全过程
            loadevent: timing.loadEventEnd - timing.loadEventStart,                 // loadevent持续
            domready: timing.domContentLoadedEventStart - timing.domLoading,        // domready时间
            domcomplete: timing.domComplete - timing.domLoading,                    // load时间
        };

        // msFirstPaint is IE9+ http://msdn.microsoft.com/en-us/library/ff974719
        if (timing.msFirstPaint) {
            data.firstPaint = timing.msFirstPaint;
        }

        // http://www.webpagetest.org/forums/showthread.php?tid=11782
        if (win.chrome && win.chrome.loadTimes) {
            var loadTimes = win.chrome.loadTimes();
            data.firstPaint = Math.round((loadTimes.firstPaintTime - loadTimes.startLoadTime) * 1000);
        }

        // 兼容原来的首屏时间
        if (typeof M !== 'undefined' && M.TimeTracker && M.TimeTracker.fst) {
            data.firstScreen = M.TimeTracker.fst - data.st;
        }

        return data;
    }
});

;/* global Tracker */

/**
 * resource timing data collector
 *
 * @see http://www.w3.org/TR/2014/CR-resource-timing-20140325/
 * TODO move sub.js into this
 */
Tracker.addPlugin('resource', {
    type: 'timer',
    data: function () {
        /* global M,SubResoucesTiming */
        if (typeof M === 'object' && M.subresources && M.subresources.names && SubResoucesTiming) {
            window.SubResoucesTiming = SubResoucesTiming;
            var lastImage = M.subresources.lastImage || "",
                firstImage = M.subresources.firstImage || "",
                resources = new SubResoucesTiming(M.subresources.names, lastImage, firstImage);

            if (!resources.length) {
                return;
            }

            var data = {};
            for (var i = 0, n = resources.length; i < n; i++) {
                var resource = resources[i];
                if (resource.id) {
                    data[resource.id] = {};
                    for (var key in resource) {
                        if (resource.hasOwnProperty(key) && parseInt(resource[key], 10) > 0) {
                            data[resource.id][key] = resource[key];
                        }
                    }
                }
            }

            return data;
        }
    }
});
;/*jshint indent:2, bitwise:false*/
// Generated by CoffeeScript 1.7.1

/*
 * Usage:
 * var sub = new SubResoucesTiming(items, itemWithURL)
 *
 */
var SubResoucesTiming;

SubResoucesTiming = (function () {
  var connectEnd, connectStart, domainLookupEnd, domainLookupStart, duration, getResourceIdentifier, getResourceServerName, properties, requestStart, responseEnd, responseStart, start;

  getResourceIdentifier = function (type, name) {
    var id;
    if (type === "img") {
      if (/logo/.test(name)) {
        id = "logo";
      } else {
        id = "content";
      }
    } else if (type === "script") {
      if (/deps/.test(name)) {
        id = "deps";
      } else if (/mt-core/.test(name)) {
        id = "yui";
      }
    } else if (type === "link") {
      if (/common/.test(name)) {
        id = "base";
      } else {
        id = "widget";
      }
    }
    return id;
  };

  getResourceServerName = function (name) {
    var serverName;
    serverName = /^https?:\/\/(\w+)(?:\.)/.exec(name);
    return serverName[1] || "";
  };

  start = "startTime";

  domainLookupStart = "domainLookupStart";

  domainLookupEnd = "domainLookupEnd";

  connectStart = "connectStart";

  connectEnd = "connectEnd";

  requestStart = "requestStart";

  responseStart = "responseStart";

  responseEnd = "responseEnd";

  duration = "duration";

  properties = [start, connectStart, connectEnd, domainLookupStart, domainLookupEnd, requestStart, responseStart, responseEnd, duration];

  function SubResoucesTiming(itemNames, detailedItem, firstItemName) {
    var blocking, connecting, diskCacheHit, dns, id, index, isIE, item, itemsEnd, itemsStart, minus, names, output, processedItem, queryObject, response, sending, serverName, transfer, url, _i, _len, _ref;
    if (!window.performance) {
      return;
    }
    if (!window.performance.getEntries) {
      return;
    }
    if (!([].forEach && [].indexOf)) {
      return;
    }
    isIE = navigator.userAgent.indexOf("MSIE" !== -1) ? true : false;
    names = [].concat(itemNames);

    /*
     * CDN start to finish
     */
    itemsStart = 0;
    itemsEnd = 0;
    queryObject = [];
    processedItem = {};

    /*
             * more deliberated substract
     */
    minus = function (to, from) {
      if (!processedItem[to] || !processedItem[from] || processedItem[to] === -1 || processedItem[from] === -1) {
        return -1;
      }
      return processedItem[to] - processedItem[from];
    };
    _ref = window.performance.getEntries();
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      item = _ref[_i];
      if (!names.length) {
        break;
      }
      index = names.indexOf(item.name);
      if (index === -1) {
        continue;
      }
      names.splice(index, 1);
      output = {};
      processedItem = {};
      properties.forEach(function (property) {
        var _property;
        _property = Math.max(item[property], 0);
        if (!_property) {
          return;
        }

        /* 
                     * Number | 0 is not quite reliable
                     * eg. 8987979878 | 0
         */
        processedItem[property] = (_property || -1).toFixed(0);
        return processedItem[property];
      });
      blocking = minus(domainLookupStart, start);
      dns = minus(domainLookupEnd, domainLookupStart);
      connecting = minus(connectEnd, connectStart);
      sending = minus(requestStart, connectEnd);
      response = minus(responseStart, requestStart);
      transfer = minus(responseEnd, responseStart);
      diskCacheHit = 0;
      if (isIE) {
        if (processedItem.fetchStart === processedItem.requestStart && processedItem.requestStart === processedItem.responseStart && processedItem.responseStart !== processedItem.responseEnd) {
          diskCacheHit = 1;
        }
      } else {
        if (processedItem.domainLookupStart !== 0 && processedItem.requestStart === 0) {
          diskCacheHit = 1;
        }
      }
      serverName = getResourceServerName(item.name);
      id = getResourceIdentifier(item.initiatorType, item.name);
      url = null;
      if (item.name === detailedItem || (detailedItem && detailedItem.push && detailedItem.indexOf(item.name) !== -1)) {
        url = item.name;
        itemsEnd = processedItem[responseEnd];
      }
      if (firstItemName && item.name === firstItemName) {
        itemsStart = processedItem[start];
      }
      output = {
        start: processedItem[start],
        duration: processedItem[duration],
        dc: diskCacheHit,
        server: serverName,
        type: item.initiatorType,
        id: id
      };
      if (url) {
        output.url = url;
      }
      if (~blocking) {
        output.blocking = blocking;
      }
      if (~dns) {
        output.dns = dns;
      }
      if (~connecting) {
        output.connecting = connecting;
      }
      if (~sending) {
        output.sending = sending;
      }
      if (~response) {
        output.response = response;
      }
      if (~transfer) {
        output.transfer = transfer;
      }
      queryObject.push(output);
    }
    if (itemsStart && itemsEnd) {
      output = {
        start: itemsStart,
        duration: itemsEnd - itemsStart,
        type: "items",
        id: "fsImg"
      };
      queryObject.push(output);
    }
    return queryObject;
  }

  return SubResoucesTiming;

})();
;/* globals util, Tracker */
util.onload(function () {
    if (!window['MeituanAnalyticsObject']) {
        return;
    }

    var toString = Object.prototype.toString,
        tracker = new Tracker(),
        obj = window[window['MeituanAnalyticsObject']],
        commands = obj ? obj.q : [];

    obj.q = tracker;

    if (commands && toString.call(commands) === "[object Array]") {
        tracker.push.apply(tracker, commands);
    }

});



})(window, document);