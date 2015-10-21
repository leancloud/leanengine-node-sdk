'use strict';

var onFinished = require('on-finished');
var onHeaders = require('on-headers');
var EventEmitter = require('events');
var pathToRegexp = require('path-to-regexp');
var debug = require('debug')('AV:statusLogger');
var _ = require('underscore');
var os = require('os');

var instanceId = os.hostname() + ' ' + process.env.LC_APP_PORT;

/**
 * @param options.AV
 */
module.exports = exports = function(options) {
  var collector = createCollector({
    AV: options.AV,
    className: 'LeanEngineReponseLog5Min',
    groupByField: 'urlPattern',
    counterFields: ['totalResponseTime', 'success', 'clientError', 'serverError', 'other'],
    beforeSave: function(grouped) {
      var requests = grouped.success + grouped.clientError + grouped.serverError + grouped.other;
      grouped.avgResponseTime = grouped.totalResponseTime / requests;
      grouped.instance = instanceId;
      delete grouped.totalResponseTime;
      return grouped;
    }
  });

  return function statusLogger(req, res, next) {
    req._lc_startedAt = new Date();

    onHeaders(res, function() {
      res._lc_startedAt = new Date();
    });

    onFinished(res, function(err) {
      if (err) return console.error(err);

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

      var record = {
        urlPattern: req.method.toUpperCase() + ' ' + urlPattern,
        totalResponseTime: responseTime
      };

      record[typeOfStatusCode(res.statusCode)] = 1;

      collector.putRecord(record);
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
 */
exports.collectCloudAPICall = function(options) {
  var AV = options.AV;
  var originalRequest = AV._request;

  var collector = createCollector({
    AV: AV,
    className: 'LeanEngineCloudAPI5Min',
    groupByField: 'urlPattern',
    counterFields: ['totalResponseTime', 'success', 'clientError', 'serverError'],
    beforeSave: function(grouped) {
      var requests = grouped.success + grouped.clientError + grouped.serverError;
      grouped.avgResponseTime = grouped.totalResponseTime / requests;
      grouped.instance = instanceId;
      delete grouped.totalResponseTime;
      return grouped;
    }
  });

  var generateUrl = function(route, className, objectId, method) {
    var url = method + ' ' + route;

    if (className)
      url += '/' + className;

    if (objectId)
      url += '/:id';

    return url;
  };

  AV._request = function(route, className, objectId, method) {
    var startedAt = new Date();
    var promise = originalRequest.apply(AV, arguments);

    var record = {
      urlPattern: generateUrl(route, className, objectId, method)
    };

    promise.then(function(result, statusCode) {
      if (record.urlPattern.match(/POST classes\/LeanEngine(ReponseLog|CloudAPI)/))
        return;

      record.totalResponseTime = Date.now() - startedAt.getTime();
      record.success = 1;
      debug('cloudAPI: %s %s', record.urlPattern, statusCode);
      collector.putRecord(record);
    }, function(err) {
      record.totalResponseTime = Date.now() - startedAt.getTime();

      if (err.code > 0)
        record.clientError = 1;
      else
        record.serverError = 1;

      debug('cloudAPI: %s Error %s', record.urlPattern, err.code);
      collector.putRecord(record);
    });

    return promise;
  };
};

/**
 * @param {AV} options.AV
 * @param {String} options.className
 * @param {Number=300000} options.commitCycle
 * @param {Number=5000} options.realtimeCycle
 * @param {String[]} options.counterFields
 * @param {String} options.groupByField
 * @param {Function} options.beforeSave
 */
function createCollector(options) {
  var commitCycle = options.commitCycle || 300000;
  var realtimeCycle = options.realtimeCycle || 5000;
  var groupByField = options.groupByField;
  var counterFields = options.counterFields;
  var beforeSave = options.beforeSave;

  var Storage = options.AV.Object.extend(options.className);
  var bucket = {};
  var realtimeBucket = {};
  var events = new EventEmitter();

  var commitToServer = function() {
    debug('commitToServer');

    _.each(bucket, function(grouped) {
      (new Storage()).save(beforeSave(grouped), {
        success: function(log) {
          debug('Save success: %s', log.get(groupByField));
        },
        error: function(log ,err) {
          console.error(err);
        }
      });
    });

    bucket = {};
  };

  var putToBucket = function(bucket, record) {
    var grouped = bucket[record[groupByField]];

    if (!grouped) {
      grouped = bucket[record[groupByField]] = {};

      grouped[groupByField] = record[groupByField];

      counterFields.forEach(function(field) {
        grouped[field] = record[field] || 0;
      });
    } else {
      counterFields.forEach(function(field) {
        if (record[field])
          grouped[field] += record[field];
      });
    }
  };

  setInterval(function() {
    commitToServer();
  }, commitCycle);

  setInterval(function() {
    events.emit('realtime', realtimeBucket);
    realtimeBucket = {};
  }, realtimeCycle);

  return {
    on: events.on.bind(events),

    putRecord: function(record) {
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
