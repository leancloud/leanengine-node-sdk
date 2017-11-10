'use strict';
var AV = require('leancloud-storage/live-query');

AV._config.disableCurrentUser = true;

if (process.env.LEANCLOUD_REGION) {
  AV._config.region = process.env.LEANCLOUD_REGION;
}

if (process.env.LC_API_SERVER) {
  AV.setServerURLs(process.env.LC_API_SERVER);
}

if (process.env.LEANCLOUD_API_SERVER) {
  AV.setServerURLs(process.env.LEANCLOUD_API_SERVER);
}

AV._sharedConfig.userAgent = 'AVOS Cloud Code Node ' + require('../package').version;
AV.Cloud.__prod = process.env.NODE_ENV === 'production' ? 1 : 0;
AV.setProduction(AV.Cloud.__prod);

module.exports = AV;
