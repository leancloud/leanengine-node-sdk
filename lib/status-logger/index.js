var onFinished = require('on-finished');
var onHeaders = require('on-headers');
var _;

module.exports = function(options) {
  _ = options.AV._;

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

      if (res._lc_startedAt)
        responseTime = res._lc_startedAt.getTime() - req._lc_startedAt.getTime();

      collector.putRecord({
        url: req.originalUrl,
        endedAt: new Date(),
        statusCode: res.statusCode,
        responseTime: responseTime
      });
    });

    next();
  };
};

function createCollector(options) {
  var commitCycle = options.commitCycle || 60 * 1000;

  var ReponseLog = options.AV.Object.extend('LeanEngineReponseLog');
  var records = [];
  var lastCommitTime = new Date();

  var commitToServer = function() {
    var groupedRecords = _.groupBy(records, function(record) {
      return record.url;
    });

    records = [];
    lastCommitTime = new Date();

    _.each(groupedRecords, function(records, urlPattern) {
      var log = new ReponseLog();

      var fromTime = null;
      var toTime = null;
      var responseTimes = {};
      var statusCodes = {};

      records.forEach(function (record) {
        if (!fromTime || record.endedAt < fromTime)
          fromTime = record.endedAt;
        if (!toTime || record.endedAt > toTime)
          toTime = record.endedAt;

        if (statusCodes[record.statusCode])
          statusCodes[record.statusCode]++;
        else
          statusCodes[record.statusCode] = 1;

        if (responseTimes[record.responseTime])
          responseTimes[record.responseTime]++;
        else
          responseTimes[record.responseTime] = 1;
      });

      log.save({
        from: fromTime,
        to: toTime,
        urlPattern: urlPattern,
        responseTimes: responseTimes,
        statusCodes: statusCodes
      }, {
        success: function() {
          console.log('Save success', {
            urlPattern: urlPattern,
            statusCodes: statusCodes
          });
        },
        error: function(log ,err) {
          console.error(err.stack);
        }
      });
    });
  };

  setInterval(function() {
    if (Date.now() - lastCommitTime.getTime() > commitCycle)
      commitToServer();
  });

  return {
    putRecord: function(record) {
      records.push(record);
    }
  }
}
