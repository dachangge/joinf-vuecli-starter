/* eslint-disable */
/*!
 * @module report
 * @author kael, chriscai
 * @date @DATE
 * Copyright (c) 2014 kael, chriscai
 * Licensed under the MIT license.
 */
var global = window;
var _log_list = [];
var _log_map = {};
var _config = {
    id: 0, // 上报 id
    uin: 0, // user id
    url: "//track.mangoerp.com/badjs", // 上报 接口
    offline_url: "", // 离线日志上报 接口
    offline_auto_url: "", // 检测是否自动上报
    ext: null, // 扩展参数 用于自定义上报
    level: 4, // 错误级别 1-debug 2-info 4-error
    ignore: [], // 忽略某个错误, 支持 Regexp 和 Function
    random: 1, // 抽样 (0-1] 1-全量
    delay: 1000, // 延迟上报 combo 为 true 时有效
    submit: null, // 自定义上报方式
    repeat: 5, // 重复上报次数(对于同一个错误超过多少次不上报),
    offlineLog: false,
    offlineLogExp: 5,  // 离线日志过期时间 ， 默认5天
    offlineLogAuto: false,  //是否自动询问服务器需要自动上报
    windowOnError: true   // 是否收集
};

var Offline_DB = {
    db: null,
    // ready 主要是打开数据库并设置success和upgradeneeded监听事件
    ready: function(callback) {
        var self = this;
        if (!window.indexedDB || !_config.offlineLog) {
            _config.offlineLog = false;
            return callback();
        }

        if (this.db) {
            setTimeout(function() {
                callback(null, self);
            }, 0);

            return;
        }
        // 版本
        var version = 1;
        // 打开数据库
        var request = window.indexedDB.open("badjs", version);

        if (!request) {
            _config.offlineLog = false;
            return callback();
        }

        request.onerror = function(e) {
            callback(e);
            _config.offlineLog = false;
            console.log("indexdb request error");
            return true;
        };
        request.onsuccess = function(e) {
            self.db = e.target.result;

            setTimeout(function() {
                callback(null, self);
            }, 500);


        };
        request.onupgradeneeded = function(e) {
            var db = e.target.result;
            if (!db.objectStoreNames.contains('logs')) {
                db.createObjectStore('logs', { autoIncrement: true });
            }
        };
    },
    // 插入信息 到indexDB 内部
    insertToDB: function(log) {
        var store = this.getStore();
        store.add(log);
    },
    /**
     * @name addlog
     * @desc 添加日志
     * @author chenxin <542501270@qq.com>
     * @time 2020年03月21日 11:01:39 星期六
     * @param {Object} {log}
     * @return  {*}
     */
    addLog: function(log) {
        if (!this.db) {
            return;
        }
        this.insertToDB(log);
    },
    /**
     * @name addlogs
     * @desc 循环处理
     * @author chenxin <542501270@qq.com>
     * @time 2020年03月21日 11:02:37 星期六
     * @param {Array} {}
     * @return  {*}
     */
    addLogs: function(logs) {
        if (!this.db) {
            return;
        }

        for (var i = 0; i < logs.length; i++) {
            this.addLog(logs[i]);
        }

    },
    // 获取indexDB日志信息
    getLogs: function(opt, callback) {
        if (!this.db) {
            return;
        }
        var store = this.getStore();
        var request = store.openCursor();
        var result = [];
        request.onsuccess = function(event) {
            var cursor = event.target.result;
            if (cursor) {
                if (cursor.value.time >= opt.start && cursor.value.time <= opt.end && cursor.value.id == opt.id && cursor.value.uin == opt.uin) {
                    result.push(cursor.value);
                }
                //# cursor.continue
                cursor["continue"]();
            } else {
                callback(null, result);
            }
        };

        request.onerror = function(e) {
            callback(e);
            return true;
        };
    },
    // 清除indexDB信息
    clearDB: function(daysToMaintain) {
        if (!this.db) {
            return;
        }

        var store = this.getStore();
        if (!daysToMaintain) {
            store.clear();
            return;
        }
        var range = (Date.now() - (daysToMaintain || 2) * 24 * 3600 * 1000);
        var request = store.openCursor();
        request.onsuccess = function(event) {
            var cursor = event.target.result;
            if (cursor && (cursor.value.time < range || !cursor.value.time)) {
                store["delete"](cursor.primaryKey);
                cursor["continue"]();
            }
        };
    },
    /**
     * @name 获取数据库事务
     * @desc --
     * @author chenxin <542501270@qq.com>
     * @time 2020年03月21日 11:04:02 星期六
     * @param {Object} {}
     * @return  {*}
     */
    getStore: function() {
        var transaction = this.db.transaction("logs", 'readwrite');
        return transaction.objectStore("logs");
    },

};

var T = {
    // 判断类型
    isOBJByType: function(o, type) {
        return Object.prototype.toString.call(o) === "[object " + (type || "Object") + "]";
    },
    // 是否OBJ
    isOBJ: function(obj) {
        var type = typeof obj;
        return type === "object" && !!obj;
    },
    // 空 判断
    isEmpty: function(obj) {
        if (obj === null) return true;
        if (T.isOBJByType(obj, "Number")) {
            return false;
        }
        return !obj;
    },
    // extend
    extend: function(src, source) {
        for (var key in source) {
            src[key] = source[key];
        }
        return src;
    },
    // 错误处理
    processError: function(errObj) {
        try {
            if (errObj.stack) {
                var stack = T.processStackMsg(errObj);

                var url = stack.match("https?://[^@]+");
                url = url ? url[0] : "";
                var rowCols = url.match(":(\\d+):(\\d+)");
                if (!rowCols) {
                    rowCols = [0, 0, 0];
                }

                return {
                    msg: stack,
                    rowNum: rowCols[1],
                    colNum: rowCols[2],
                    target: url.replace(rowCols[0], ""),
                    _orgMsg: errObj.toString()
                };
            } else {
                //ie 独有 error 对象信息，try-catch 捕获到错误信息传过来，造成没有msg
                if (errObj.name && errObj.message && errObj.description) {
                    return {
                        msg: JSON.stringify(errObj)
                    };
                }
                return errObj;
            }
        } catch (err) {
            return errObj;
        }
    },
    // 格式处理
    processStackMsg: function(error) {
      var stack = error.stack;
      var msg = error.toString();
      var isInclude = stack.indexOf(msg) !== -1;
            
      // 将blob转换为真实url
      stack = stack.replace(/blob:(https?:\/\/[^:]+)/, function (all, url) {
          return blobMap[url];
        })
        .replace(/\n/gi, "")
        .split(/\bat\b/)
        .slice(0, 9)
        .join("@")
        // 兼容??格式, 避免误删除
        // 只删除?t=30033
        .replace(/([^\?])\?[^\?][^:]+/gi, '$1');
      if (!isInclude) {
        stack = msg + "@" + stack;
      }
      if (error.cause) {
        stack = error.cause + "@" + stack;
      }
      return stack;
    },
    // 是否重复
    isRepeat: function(error) {
        if (!T.isOBJ(error)) return true;
        var msg = error.msg;
        var times = _log_map[msg] = (parseInt(_log_map[msg]) || 0) + 1;
        return times > _config.repeat;
    }
};

var orgError = global.onerror;
// 改写全局错误信息处理
// 以便捕获到程序发生的错误。重写后的onerror主要是格式化错误信息，并把错误push进错误队列中
// 同时push()方法也会触发_process_log()。
global.onerror = function(msg, url, line, col, error) {
    var newMsg = msg;

    if (_config.windowOnError) {
        // 格式化错误信息
      if (error && error.stack) {
          newMsg = T.processStackMsg(error);
      }

      if (T.isOBJByType(newMsg, "Event")) {
          newMsg += newMsg.type ?
              ("--" + newMsg.type + "--" + (newMsg.target ?
                  (newMsg.target.tagName + "::" + newMsg.target.src) : "")) : "";
      }
      // 将错误信息对象推入错误队列中，执行_process_log方法进行上报
      report.push({
          msg: newMsg,
          target: url,
          rowNum: line,
          colNum: col,
          _orgMsg: msg
      });

      _process_log();
    }
    // 调用原有的全局 onerror事件
    orgError && orgError.apply(global, arguments);
};


/**
 * @name 把日志转成str
 * @desc --
 * @author chenxin <542501270@qq.com>
 * @time 2020年03月21日 11:09:08 星期六
 * @param {Object} {错误对象}
 * @param {num} {index}
 * @return  {*} string
 */
var _report_log_tostring = function(error, index) {
    var param = [];
    var params = [];
    var stringify = [];
    if (T.isOBJ(error)) {
        error.level = error.level || _config.level;
        for (var key in error) {
            var value = error[key];
            if (!T.isEmpty(value)) {
                if (T.isOBJ(value)) {
                    try {
                        value = JSON.stringify(value);
                    } catch (err) {
                        value = "[BJ_REPORT detect value stringify error] " + err.toString();
                    }
                }
                stringify.push(key + ":" + value);
                param.push(key + "=" + encodeURIComponent(value));
                params.push(key + "[" + index + "]=" + encodeURIComponent(value));
            }
        }
    }

    // msg[0]=msg&target[0]=target -- combo report
    // msg:msg,target:target -- ignore
    // msg=msg&target=target -- report with out combo
    return [params.join("&"), stringify.join(","), param.join("&")];
};



var _offline_buffer = [];
// 保存离线日志
var _save2Offline = function(key, msgObj) {
    msgObj = T.extend({ id: _config.id, uin: _config.uin, time: new Date - 0 }, msgObj);

    if (Offline_DB.db) {
        Offline_DB.addLog(msgObj);
        return;
    }


    if (!Offline_DB.db && !_offline_buffer.length) {
        Offline_DB.ready(function(err, DB) {
            if (DB) {
                if (_offline_buffer.length) {
                    DB.addLogs(_offline_buffer);
                    _offline_buffer = [];
                }

            }
        });
    }
    _offline_buffer.push(msgObj);
};
// 汇报离线日志
var _autoReportOffline = function() {
    var script = document.createElement("script");
    script.src = _config.offline_auto_url || _config.url.replace(/badjs$/, "offlineAuto") + "?id=" + _config.id + "&uin=" + _config.uin;
    window._badjsOfflineAuto = function(isReport) {
        console.log(isReport)
        if (isReport) {
            console.log(BJ_REPORT)
            BJ_REPORT.reportOfflineLog();
        }
    };
    // document.head.appendChild(script);
    window.fetch(_config.offline_auto_url || _config.url.replace(/badjs$/, "offlineAuto") + "?id=" + _config.id + "&uin=" + _config.uin, {
        method: 'GET',
        cache: 'no-cache',
        mode: 'no-cors'
    })
};



var submit_log_list = [];
var comboTimeout = 0;
// 提交离线日志
var _submit_log = function() {
    clearTimeout(comboTimeout);
    // https://github.com/BetterJS/badjs-report/issues/34
    comboTimeout = 0;

    if (!submit_log_list.length) {
        return;
    }

    var url = _config._reportUrl + submit_log_list.join("&") + "&count=" + submit_log_list.length + "&_t=" + (+new Date);

    if (_config.submit) {
        _config.submit(url, submit_log_list);
    } else {
        var _img = new Image();
        _img.src = url;
    }

    submit_log_list = [];
};
// 上报方法
var _process_log = function(isReportNow) {
    if (!_config._reportUrl) return;

    var randomIgnore = Math.random() >= _config.random;


    while (_log_list.length) {
        var isIgnore = false;
        var report_log = _log_list.shift();
        //有效保证字符不要过长
        report_log.msg = (report_log.msg + "" || "").substr(0, 800);
        // 重复上报,每次循环时先判断是否超过重复上报数
        if (T.isRepeat(report_log)) continue;
        var log_str = _report_log_tostring(report_log, submit_log_list.length);
        // 若用户自定义了ignore规则，则按照规则进行筛选
        if (T.isOBJByType(_config.ignore, "Array")) {
            for (var i = 0, l = _config.ignore.length; i < l; i++) {
                var rule = _config.ignore[i];
                if ((T.isOBJByType(rule, "RegExp") && rule.test(log_str[1])) ||
                    (T.isOBJByType(rule, "Function") && rule(report_log, log_str[1]))) {
                    isIgnore = true;
                    break;
                }
            }
        }
        if (!isIgnore) {
            // 若离线日志功能已开启，则将日志存入数据库
            _config.offlineLog && _save2Offline("badjs_" + _config.id + _config.uin, report_log);
            // level为20表示是offlineLog方法push进来的，只存入离线日志而不上报
            if (!randomIgnore && report_log.level != 20) {
                // 若可以上报，则推入submit_log_list，稍后由_submit_log方法来清空该队列并上报
                submit_log_list.push(log_str[0]);
                // 执行上报回调函数
                _config.onReport && (_config.onReport(_config.id, report_log));
            }

        }
    }


    if (isReportNow) {
        _submit_log(); // 立即上报
    } else if (!comboTimeout) {
        comboTimeout = setTimeout(_submit_log, _config.delay); // 延迟上报
    }
};

var blobMap = {};

var report = global.BJ_REPORT = {
    // 普通url和blob对应关系
    createObjectURL: function (text, url) {
      var blob = new Blob([text])
      var blobUrl = URL.createObjectURL(blob)
      // 缓存
      blobMap[blobUrl.slice('5')] = url
      return blobUrl
    },
    // 将错误推到缓存池
    push: function(msg) {

        var data = T.isOBJ(msg) ? T.processError(msg) : {
            msg: msg
        };

        // ext 有默认值, 且上报不包含 ext, 使用默认 ext
        if (_config.ext && !data.ext) {
            data.ext = _config.ext;
        }
        // 在错误发生时获取页面链接
        // https://github.com/BetterJS/badjs-report/issues/19
        if (!data.from) {
            data.from = location.href;
        }

        if (data._orgMsg) {
            var _orgMsg = data._orgMsg;
            delete data._orgMsg;
            data.level = 4;
            _log_list.push(data);
            /*
            data.level = 2;
            var newData = T.extend({}, data);
            newData.level = 4;
            newData.msg = _orgMsg;
            _log_list.push(data);
            _log_list.push(newData);
            */
        } else {
            _log_list.push(data);
        }

        _process_log();
        return report;
    },
    // error report
    report: function(msg, isReportNow) {
        msg && report.push(msg);

        isReportNow && _process_log(true);
        return report;
    },
    // info report
    info: function(msg) {
        if (!msg) {
            return report;
        }
        if (T.isOBJ(msg)) {
            msg.level = 2;
        } else {
            msg = {
                msg: msg,
                level: 2
            };
        }
        report.push(msg);
        return report;
    },
    // debug report
    debug: function(msg) {
        if (!msg) {
            return report;
        }
        if (T.isOBJ(msg)) {
            msg.level = 1;
        } else {
            msg = {
                msg: msg,
                level: 1
            };
        }
        report.push(msg);
        return report;
    },
    // 上报离线日志
    reportOfflineLog: function() {
        if (!window.indexedDB) {
            BJ_REPORT.info("unsupport offlineLog");
            return;
        }
        // indexDB 初始化之后执行
        Offline_DB.ready(function(err, DB) {
            if (!DB) {
                return;
            }
            var startDate = new Date - 0 - _config.offlineLogExp * 24 * 3600 * 1000;
            var endDate = new Date - 0;
            // 获取indexDB 日志信息
            DB.getLogs({
                start: startDate,
                end: endDate,
                id: _config.id,
                uin: _config.uin
            }, function(err, result) {
                // 创建iframe元素
                var iframe = document.createElement("iframe");
                iframe.name = "badjs_offline_" + (new Date - 0);
                iframe.frameborder = 0;
                iframe.height = 0;
                iframe.width = 0;
                iframe.src = "javascript:false;";
                iframe.onload = function() {
                    // 创建form 表单 进行日志提交
                    var form = document.createElement("form");
                    form.style.display = "none";
                    form.target = iframe.name;
                    form.method = "POST";
                    form.action = _config.offline_url || _config.url.replace(/badjs$/, "offlineLog");
                    // form.enctype = 'multipart/form-data';

                    var input = document.createElement("input");
                    input.style.display = "none";
                    input.type = "hidden";
                    input.name = "offline_log";
                    input.value = JSON.stringify({ logs: result, userAgent: navigator.userAgent, startDate: startDate, endDate: endDate, id: _config.id, uin: _config.uin });

                    iframe.contentDocument.body.appendChild(form);
                    form.appendChild(input);
                    form.submit();

                    setTimeout(function() {
                        document.body.removeChild(iframe);
                    }, 10000);

                    iframe.onload = null;
                };
                document.body.appendChild(iframe);
            });
        });
    },
    // 写入日志
    offlineLog: function(msg) {
        // 没有msg信息，不执行
        if (!msg) {
            return report;
        }
        // msg是个对象，设levle值为20
        if (T.isOBJ(msg)) {
            msg.level = 20;
        } else {
            // 不是对象就转换一下
            msg = {
                msg: msg,
                level: 20
            };
        }
        report.push(msg);
        return report;
    },
    // 初始化
    init: function(config) {
        if (T.isOBJ(config)) {
            T.extend(_config, config);
        }
        // 没有设置id将不上报
        var id = parseInt(_config.id);
        if (id) {
            _config._reportUrl = (_config.url || "/badjs") +
                "?id=" + id +
                "&uin=" + _config.uin +
                // "&from=" + encodeURIComponent(location.href) +
                "&";
        }

        // if had error in cache , report now
        // 清空错误列表
        if (_log_list.length) {
            _process_log();
        }

        // init offline
        // indexDB没有初始化，就去执行
        if (!Offline_DB._initing) {
            Offline_DB._initing = true;
            // indexDB ready完成之后的回调
            Offline_DB.ready(function(err, DB) {
                if (DB) {
                    setTimeout(function() {
                        // 清除过期的indexDB信息
                        DB.clearDB(_config.offlineLogExp);
                        setTimeout(function() {
                            // 设置了上报离线日志，就去执行
                            _config.offlineLogAuto && _autoReportOffline();
                        }, 5000);
                    }, 1000);
                }

            });
        }



        return report;
    },

    __onerror__: global.onerror
};

typeof console !== "undefined" && console.error && setTimeout(function() {
    var err = ((location.hash || "").match(/([#&])BJ_ERROR=([^&$]+)/) || [])[2];
    err && console.error("BJ_ERROR", decodeURIComponent(err).replace(/(:\d+:\d+)\s*/g, "$1\n"));
}, 0);

export default report;
