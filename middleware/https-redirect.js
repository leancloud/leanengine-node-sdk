'use strict';

var endsWith = require('../lib/utils').endsWith;

module.exports = function(AV) {
  return function() {
    return function(req, res, next) {
      if ((AV.Cloud.__prod || endsWith(req.get('host'), '.leanapp.cn')) && (!req.secure)) {
        return res.redirect('https://' + req.get('host') + req.originalUrl);
      } else {
        return next();
      }
    }
  }
};
