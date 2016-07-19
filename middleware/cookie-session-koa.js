module.exports = function(AV) {
  return function (options) {
    var middleware = require('./cookie-session')(AV)(options);

    return function *(next) {
      yield middleware.bind(null, this.req, this.res);

      this.request.currentUser = this.req.currentUser;
      this.request.sessionToken = this.req.sessionToken;

      this.response.saveCurrentUser = this.res.saveCurrentUser;
      this.response.clearCurrentUser = this.res.clearCurrentUser;

      yield next;
    }
  };
};
