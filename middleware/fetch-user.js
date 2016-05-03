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
    } else if (req.body.user) {
      var userObj = new AV.User();
      userObj._finishFetch(req.body.user, true);
      req.AV.user = userObj;
      return next();
    } else {
      return next();
    }
  };
};
