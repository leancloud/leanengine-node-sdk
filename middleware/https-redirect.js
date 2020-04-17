'use strict';

var endsWith = require('../lib/utils').endsWith;

module.exports = function(AV) {
  return function() {
    return function(req, res, next) {
      engineHealth = '/1.1/functions/_ops/metadatas'
      if (AV.Cloud.__prod  && req.path !== engineHealth && req.get('X-Forwarded-Proto') && !req.secure) {
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
