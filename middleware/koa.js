module.exports = function(AV) {
  return function(options) {
    const middleware = AV.express(options);

    return function *(next) {
      yield middleware.bind(null, this.req, this.res);
      yield next;
    }
  }
};
