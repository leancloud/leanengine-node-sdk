'use strict';

var onFinished = require('on-finished');
var onHeaders = require('on-headers');
var EventEmitter = require('events');
var pathToRegexp = require('path-to-regexp');
var debug = require('debug')('AV:statusLogger');
var _ = require('underscore');
var os = require('os');

var instanceId = os.hostname() + ':' + process.env.LC_APP_PORT;

/**
 * @param {AV} options.AV
 * @param {Number[]=} options.specialStatusCodes
 * @param {Number=300000} options.commitCycle
 * @param {Number=5000} options.realtimeCycle
 * @param {Object[]=} options.rules
 *          {match: /^GET \/(js|css).+/, ignore: true}
 *          {match: /^GET \/(js|css).+/, rewrite: 'GET /*.$1'}
 */
module.exports = exports = function(options) {
  var specialStatusCodes = options.specialStatusCodes || [200, 201, 302, 304, 400, 404, 500, 502];
  var rewriteRules = options.rules || [];

  var cloudCollector = collectCloudAPICall(options);

  var routerCollector = createCollector(_.extend({
    className: 'LeanEngineReponseLog5Min',
    counterFields: specialStatusCodes
  }, options));

  var statusLogger = function(req, res, next) {
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

      urlPattern = req.method.toUpperCase() + ' ' + urlPattern;

      if (urlPattern.match(/__lcStatusLogger/))
        return;

      if (rewriteRules.some(function(rule) {
        if (urlPattern.match(rule.match)) {
          if (rule.ignore)
            return true;

          urlPattern = urlPattern.replace(rule.match, rule.rewrite);
        }
      })) {
        return;
      }

      var record = {
        urlPattern: urlPattern,
        responseTime: responseTime
      };

      record[typeOfStatusCode(res.statusCode)] = 1;

      if (_.contains(specialStatusCodes, res.statusCode))
        record[res.statusCode] = 1;

      debug('router: %s %s %sms', urlPattern, res.statusCode, responseTime);
      routerCollector.putRecord(record);
    });

    next();
  };

  return [statusLogger, require('./server')({
    AV: options.AV,
    routerCollector: routerCollector,
    cloudCollector: cloudCollector
  })];
};

/**
 * @param options.AV
 * @param {Number=300000} options.commitCycle
 * @param {Number=5000} options.realtimeCycle
 */
function collectCloudAPICall(options) {
  var AV = options.AV;
  var originalRequest = AV._request;

  var collector = createCollector({
    AV: AV,
    className: 'LeanEngineCloudAPI5Min'
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
      if (record.urlPattern.match(/classes\/LeanEngine(ReponseLog|CloudAPI)/))
        return;

      record.responseTime = Date.now() - startedAt.getTime();
      record.success = 1;
      debug('cloudAPI: %s %s', record.urlPattern, statusCode);
      collector.putRecord(record);
    }, function(err) {
      record.responseTime = Date.now() - startedAt.getTime();

      if (err.code > 0)
        record.clientError = 1;
      else
        record.serverError = 1;

      debug('cloudAPI: %s Error %s', record.urlPattern, err.code);
      collector.putRecord(record);
    });

    return promise;
  };

  return collector;
}

/**
 * @param {AV} options.AV
 * @param {String} options.className
 * @param {Number=300000} options.commitCycle
 * @param {Number=5000} options.realtimeCycle
 * @param {String[]} options.counterFields
 */
function createCollector(options) {
  var AV = options.AV;
  var commitCycle = options.commitCycle || 300000;
  var realtimeCycle = options.realtimeCycle || 5000;
  var counterFields = _.union(['responseTime', 'success', 'clientError', 'serverError'], options.counterFields);

  var Storage = AV.Object.extend(options.className);
  var bucket = {};
  var realtimeBucket = {};
  var events = new EventEmitter();

  var commitToServer = function() {
    if (_.isEmpty(bucket))
      return;

    debug('commitToServer');

    var totalResponseTime = 0;

    var log = {
      urls: _.map(bucket, function(urlStat) {
        totalResponseTime += urlStat.responseTime;
        urlStat.responseTime = urlStat.responseTime / requestCount(urlStat);
        return urlStat;
      }),
      instance: instanceId
    };

    counterFields.forEach(function(field) {
      var fieldName = field;

      if (!isNaN(parseInt(field)))
        fieldName = 'status' + field;

      log[fieldName] = _.reduce(log.urls, function(memory, stat) {
        return memory + stat[field];
      }, 0);
    });

    log.responseTime = totalResponseTime / requestCount(log);

    (new Storage()).save(log, {
      success: function() {
        debug('Save success %s', options.className);
      },
      error: function(log ,err) {
        console.error(err);
      }
    });

    bucket = {};
  };

  var putToBucket = function(bucket, record) {
    var grouped = bucket[record.urlPattern];

    if (!grouped) {
      grouped = bucket[record.urlPattern] = {};

      grouped.urlPattern = record.urlPattern;

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

    getLastDayStatistics: function(options) {
      var query = new AV.Query(Storage);
      query.greaterThan('createdAt', new Date(Date.now() - 24 * 3600 * 1000));
      return query.limit(1000).find(options);
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
}

function requestCount(urlStat) {
  var result = 0;
  ['success', 'clientError', 'serverError'].forEach(function(field) {
    if (urlStat[field])
      result += urlStat[field];
  });
  return result;
}
