'use strict';

var onFinished = require('on-finished');
var onHeaders = require('on-headers');
var EventEmitter = require('events');
var pathToRegexp = require('path-to-regexp');
var debug = require('debug')('AV:statusLogger');
var _ = require('underscore');

/**
 * @param options.AV
 */
module.exports = function(options) {
  var collector = createCollector({
    AV: options.AV
  });

  return function statusLogger(req, res, next) {
    req._lc_startedAt = new Date();

    onHeaders(res, function() {
      res._lc_startedAt = new Date();
    });

    onFinished(res, function(err) {
      if (err) return console.error(err.stack);

      var responseTime = null;
      var urlPattern = req.originalUrl.replace(/\?.*/, '');

      if (res._lc_startedAt)
        responseTime = res._lc_startedAt.getTime() - req._lc_startedAt.getTime();

      if (req.route) {
        // 如果这个请求属于一个路由，则用路由路径替换掉 URL 中匹配的部分

        var regexp = pathToRegexp(req.route.path).toString().replace(/^\/\^/, '').replace(/\/i$/, '');
        var matched = urlPattern.match(new RegExp(regexp, 'i'));

        if (matched[0]) {
          urlPattern = urlPattern.slice(0, matched.index) + req.route.path;
        }
      }

      collector.putRecord({
        urlPattern: req.method.toUpperCase() + ' ' + urlPattern,
        statusCode: res.statusCode,
        responseTime: responseTime
      });
    });

    if (req.path == '/_lc_recent.json')
      res.json(collector.recentStatistics());
    else if (req.path == '/_lc_realtime.json')
      res.json(collector.realtimeStatistics());
    else
      next();
  };
};

/**
 * @param options.AV
 * @param options.commitCycle
 * @param options.realtimeCycle
 */
function createCollector(options) {
  var commitCycle = options.commitCycle || 300000;
  var realtimeCycle = options.realtimeCycle || 5000;

  var ReponseLog = options.AV.Object.extend('LeanEngineReponseLog5Min');
  var bucket = {};
  var realtimeBucket = {};
  var events = new EventEmitter();

  var commitToServer = function() {
    debug('commitToServer');

    _.each(bucket, function(stat) {
      var log = new ReponseLog();

      var requests = stat.success + stat.clientError + stat.serverError + stat.other;
      stat.avgResponseTime = stat.totalResponseTime / requests;
      delete stat.totalResponseTime;

      log.save(stat, {
        success: function(log) {
          console.log('Save success', log.attributes);
        },
        error: function(log ,err) {
          console.error(err.stack);
        }
      });
    });

    bucket = {};
  };

  var putToBucket = function(bucket, record) {
    var stat = bucket[record.urlPattern];

    if (!stat) {
      stat = bucket[record.urlPattern] = {
        urlPattern: record.urlPattern,
        totalResponseTime: 0,
        success: 0,
        clientError: 0,
        serverError: 0,
        other: 0
      };
    }

    stat[typeOfStatusCode(record.statusCode)]++;
    stat.totalResponseTime += record.responseTime;
  };

  setInterval(function() {
    commitToServer();
  }, commitCycle);

  setInterval(function() {
    debug('emit realtime');
    events.emit('realtime', realtimeBucket);
    realtimeBucket = {};
  }, realtimeCycle);

  return {
    on: events.on.bind(events),

    putRecord: function(record) {
      debug('putRecord: %s %s %sms', record.urlPattern, record.statusCode, record.responseTime);
      putToBucket(bucket, record);
      putToBucket(realtimeBucket, record);
    },

    recentStatistics: function() {
      return bucket;
    },

    realtimeStatistics: function() {
      return realtimeBucket;
    }
  };
}

function typeOfStatusCode(code) {
  if (code >= 200 && code < 400)
    return 'success';
  else if (code >= 400 && code < 500)
    return 'clientError';
  else if (code >= 500)
    return 'serverError';
  else
    return 'other';
}
