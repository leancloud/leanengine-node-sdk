'use strict';

var endsWith = require('../lib/utils').endsWith;

module.exports = function(AV) {
  return function() {
    return function(req, res, next) {
      if ((AV.Cloud.__prod || endsWith(req.headers.host, '.leanapp.cn')) && (!req.secure)) {
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
