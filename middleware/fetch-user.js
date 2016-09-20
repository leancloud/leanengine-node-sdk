var utils = require('../lib/utils');

module.exports = function(AV) {
  return function(req, res, next) {
    if (req.AV.sessionToken && req.AV.sessionToken !== '') {
      AV.User.become(req.AV.sessionToken).then(
        function(user) {
          req.AV.user = user;
          next();
        },
        next
      );
    } else {
      return next();
    }
  };
};
