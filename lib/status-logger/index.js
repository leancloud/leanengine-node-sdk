'use strict';

var onFinished = require('on-finished');
var onHeaders = require('on-headers');
var EventEmitter = require('events');
var _;

module.exports = function(options) {
  _ = options.AV._;

  var collector = createCollector({
    AV: options.AV,
    commitCycle: 60000
  });

  var realtimeJSON = function(req, res) {
    res.json(collector.recentRecords());
  };

  return function statusLogger(req, res, next) {
    req._lc_startedAt = new Date();

    onHeaders(res, function() {
      res._lc_startedAt = new Date();
    });

    onFinished(res, function(err) {
      if (err) return console.error(err.stack);

      var responseTime = null;

      if (res._lc_startedAt)
        responseTime = res._lc_startedAt.getTime() - req._lc_startedAt.getTime();

      collector.putRecord({
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTime: responseTime
      });
    });

    if (req.path == '/_lc_realtimeJSON')
      realtimeJSON(req, res);
    else
      next();
  };
};

function createCollector(options) {
  var commitCycle = options.commitCycle || 300000;
  var realtimeCycle = options.realtimeCycle || 5000;

  var ReponseLog = options.AV.Object.extend('LeanEngineReponseLog');
  var bucket = {};
  var realtimeBucket = {};
  var events = new EventEmitter();

  var commitToServer = function() {
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
      var stat = bucket[record.url];

      if (!stat) {
        stat = bucket[record.url] = {
          urlPattern: record.url,
          totalResponseTime: 0,
          success: 0,
          clientError: 0,
          serverError: 0,
          other: 0
        };
      }

      stat[typeOfStatusCode(record.statusCode)]++;
      stat.totalResponseTime += record.responseTime;
    },
    recentRecords: function() {
      return bucket;
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
