'use strict';
var AV = require('leancloud-storage');
var utils = require('./utils');

AV._config.disableCurrentUser = true;
AV.Promise.setPromisesAPlusCompliant(true);

if (process.env.LEANCLOUD_REGION) {
  AV._config.region = process.env.LEANCLOUD_REGION;
}

if (process.env.LC_API_SERVER) {
  AV._config.APIServerURL = process.env.LC_API_SERVER;
}

AV._config.userAgent = 'AVOS Cloud Code Node ' + require('../package').version;
AV.Cloud.__prod = process.env.NODE_ENV === 'production' ? 1 : 0;
AV.setProduction(AV.Cloud.__prod);

AV.Object.prototype.disableBeforeHook = function() {
  this.set('__before', utils.signHook(AV.masterKey, '__before_for_' + this.className, new Date().getTime()));
};

AV.Object.prototype.disableAfterHook = function() {
  this.set('__after', utils.signHook(AV.masterKey, '__after_for_' + this.className, new Date().getTime()));
};

module.exports = AV;
