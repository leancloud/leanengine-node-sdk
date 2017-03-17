var crypto = require('crypto');

var utils = require('../lib/utils');

module.exports = function(AV) {
  return function(options) {
    options = options || {};

    return function(req, res, next) {
      var appId, appKey, masterKey, contentType, param, prod, prodHeader, prodValue, sessionToken;
      contentType = req.headers['content-type'];
      if (/^text\/plain.*/i.test(contentType)) {
        if (req.body && req.body !== '') {
          req.body = JSON.parse(req.body);
        }
        appId = req.body._ApplicationId;
        appKey = req.body._ApplicationKey;
        masterKey = req.body._MasterKey;
        prodValue = req.body._ApplicationProduction;
        sessionToken = req.body._SessionToken;
        for (param in req.body) {
          // remove _* but keep __*
          if (param.charAt(0) === '_' && param.charAt(1) !== '_') {
            delete req.body[param];
          }
        }
        prod = 1;
        if (prodValue === 0 || prodValue === false) {
          prod = 0;
        }
        req.AV = {
          id: appId,
          key: appKey,
          masterKey: masterKey,
          prod: prod,
          sessionToken: sessionToken
        };
      } else {
        appId = req.headers['x-lc-id'] ||
          req.headers['x-avoscloud-application-id'] ||
          req.headers['x-uluru-application-id'];
        appKey = req.headers['x-lc-key'] ||
          req.headers['x-avoscloud-application-key'] ||
          req.headers['x-uluru-application-key'];
        masterKey = req.headers['x-avoscloud-master-key'] || req.headers['x-uluru-master-key'];
        prodHeader = req.headers['x-lc-prod'] ||
          req.headers['x-avoscloud-application-production'] ||
          req.headers['x-uluru-application-production'];
        sessionToken = req.headers['x-lc-session'] ||
          req.headers['x-uluru-session-token'] ||
          req.headers['x-avoscloud-session-token'];
        prod = 1;
        if (prodHeader === '0' || prodHeader === 'false') {
          prod = 0;
        }
        if (appKey && (appKey.indexOf(',master') > 0)) {
          masterKey = appKey.slice(0, appKey.indexOf(','));
          appKey = null;
        }
        req.sessionToken = sessionToken;
        req.AV = {
          id: appId,
          key: appKey,
          masterKey: masterKey,
          prod: prod,
          sessionToken: sessionToken
        };
      }

      if (options.restrict) {
        var key, master, requestSign, sign, timestamp, validSign, _ref;
        if (!req.AV.id) {
          return utils.unauthResp(res);
        }
        if (AV.applicationId === req.AV.id &&
            (AV.applicationKey === req.AV.key ||
             AV.masterKey === req.AV.key ||
             AV.masterKey === req.AV.masterKey)) {
          if (AV.masterKey === req.AV.masterKey) {
            req.AV.authMasterKey = true;
          }
          return next();
        }
        requestSign = req.headers['x-lc-sign'] || req.headers['x-avoscloud-request-sign'];
        if (requestSign) {
          _ref = requestSign.split(',');
          sign = _ref[0];
          timestamp = _ref[1];
          master = _ref[2];
          key = master === 'master' ? AV.masterKey : AV.applicationKey;
          validSign = signByKey(timestamp, key);
          if (validSign === sign.toLowerCase()) {
            if (master === 'master') {
              req.AV.authMasterKey = true;
              req.AV.masterKey = key;
            } else {
              req.AV.key = key;
            }
            return next();
          }
        }
        return utils.unauthResp(res);
      } else {
        return next();
      }
    };
  }
}

function signByKey(timestamp, key) {
  return crypto.createHash('md5').update('' + timestamp + key).digest('hex');
}
