var utils = require('../lib/utils');

module.exports = function(AV) {
  return function(req, res, next) {
    if (req.AV.sessionToken && req.AV.sessionToken !== '') {
      AV.User.become(req.AV.sessionToken, {
        success: function(user) {
          req.AV.user = user;
          next();
        },
        error: function(user, err) {
          next(err);
        }
      });
    } else {
      return next();
    }
  };
};
