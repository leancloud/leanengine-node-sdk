'use strict';

var endsWith = require('../lib/utils').endsWith;
var getForwardedClient = require('../lib/utils').getForwardedClient;
var _ = require('underscore');

module.exports = function(AV) {
  return function() {
    return function(req, res, next) {
      var forwardedClient = getForwardedClient(req)

      if (forwardedClient && forwardedClient.proto === 'http' && !_.include(['loopback', 'private'], forwardedClient.range) ||
          !forwardedClient && (AV.Cloud.__prod || endsWith(req.headers.host, '.leanapp.cn')) && (!req.secure)) {
        const url = `https://${req.headers.host}${req.originalUrl || req.url}`;

        res.statusCode = 302;
        res.setHeader('Location', url);
        res.end(`Found. Redirecting to ${url}`);
      } else {
        return next();
      }
    }
  }
};
