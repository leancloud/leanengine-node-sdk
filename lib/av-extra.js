'use strict';
var AV = require('avoscloud-sdk');
var crypto = require('crypto');

AV._config.disableCurrentUser = true;
AV.Promise.setPromisesAPlusCompliant(true);

// 调用 API 时增加 prod 信息
if (!AV._old_request) {
  AV._old_request = AV._request;
  AV._request = function (route, className, objectId, method, dataObject, sessionToken) {
    if (!dataObject) {
      dataObject = {};
    }
    dataObject._ApplicationProduction = AV.Cloud.__prod;
    return AV._old_request(route, className, objectId, method, dataObject, sessionToken);
  };
}

AV.Object.prototype.disableBeforeHook = function() {
  this.set('__before', signDisableHook('__before_for_' + this.className, new Date().getTime()));
};

AV.Object.prototype.disableAfterHook = function() {
  this.set('__after', signDisableHook('__after_for_' + this.className, new Date().getTime()));
};

function signDisableHook(hookName, ts) {
  var sign = crypto.createHmac('sha1', AV.masterKey)
    .update(hookName + ':' + ts)
    .digest('hex');
  return ts + ',' + sign;
}

module.exports = AV;
