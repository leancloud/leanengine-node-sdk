function express(middleware) {
  return middleware;
}

function koa(middleware) {
  return function*(next) {
    yield middleware.bind(null, this.req, this.res);

    if (this.req.currentUser) {
      this.request.currentUser = this.req.currentUser;
      this.currentUser = this.req.currentUser;
    }

    if (this.req.sessionToken) {
      this.request.sessionToken = this.req.sessionToken;
      this.sessionToken = this.req.sessionToken;
    }

    if (this.res.saveCurrentUser) {
      this.response.saveCurrentUser = this.res.saveCurrentUser;
      this.saveCurrentUser = this.res.saveCurrentUser;
    }

    if (this.res.clearCurrentUser) {
      this.response.clearCurrentUser = this.res.clearCurrentUser;
      this.clearCurrentUser = this.res.clearCurrentUser;
    }

    yield next;
  };
}

function koa2(middleware) {
  return function(ctx, next) {
    return new Promise( (resolve, reject) => {
      middleware(ctx.req, ctx.res, err => {
        if (ctx.req.currentUser) {
          ctx.currentUser = ctx.req.currentUser;
        }

        if (ctx.req.sessionToken) {
          ctx.sessionToken = ctx.req.sessionToken;
        }

        if (ctx.res.saveCurrentUser) {
          ctx.saveCurrentUser = ctx.res.saveCurrentUser;
        }

        if (ctx.res.clearCurrentUser) {
          ctx.clearCurrentUser = ctx.res.clearCurrentUser;
        }

        if (err) {
          reject(err);
        } else {
          resolve(next());
        }
      });
    });
  };
}

const converters = {express, koa, koa2};

module.exports = function(middleware, framework) {
  if (framework) {
    if (converters[framework] !== -1) {
      return converters[framework](middleware);
    } else {
      throw new Error(`Unsupported framework: ${framework}`);
    }
  } else {
    return express(middleware);
  }
};
