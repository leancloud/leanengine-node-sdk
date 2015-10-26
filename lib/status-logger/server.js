'use strict';

var basicAuth = require('basic-auth')
var express = require('express');
var _ = require('underscore');

module.exports = function(options) {
  var routerCollector = options.routerCollector;
  var AV = options.AV;

  var router = new express.Router();

  var authenticate = function(req, res, next) {
    var credentials = basicAuth(req);

    if (credentials && credentials.name == AV.applicationId && credentials.pass == AV.masterKey) {
      next();
    } else {
      res.header('WWW-Authenticate', 'Basic');
      res.status(401).json({
        code: 401, error: "Unauthorized."
      });
    }
  }

  router.use('/__lcStatusLogger', authenticate, express.static(__dirname + '/public'));

  router.use('/__lcStatusLogger/initial.json', authenticate, function(req, res) {
    var result = {
      routerSuccessAndError: [],
      responseTime: [],
      routerPie: [],
      statusPie: []
    };

    routerCollector.getLastDayStatistics().then(function(data) {
      result.routerSuccessAndError.push({
        name: 'success',
        data: data.map(function(log) {
          return log.get('success');
        })
      }, {
        name: 'clientError',
        data: data.map(function(log) {
          return log.get('clientError');
        })
      }, {
        name: 'serverError',
        data: data.map(function(log) {
          return log.get('serverError');
        })
      });

      result.responseTime.push({
        name: 'Router',
        data: data.map(function(log) {
          return log.get('responseTime');
        })
      });

      var routerPie = {
        name: 'Routers',
        data: []
      };

      data.forEach(function(log) {
        log.get('urls').forEach(function(url) {
          if (_.findWhere(routerPie.data, {name: url.urlPattern})){
            _.findWhere(routerPie.data, {name: url.urlPattern}).y += url.success + url.clientError + url.serverError;
          } else {
            routerPie.data.push({
              name: url.urlPattern,
              y: url.success + url.clientError + url.serverError
            });
          }
        });
      });

      result.routerPie.push(routerPie);

      var statusPie = {
        name: 'StatusCode',
        data: []
      };

      data.forEach(function(log) {
        log.get('urls').forEach(function(url) {
          _.each(url, function(value, key) {
            if (isFinite(parseInt(key))) {
              if (_.findWhere(statusPie.data, {name: key})) {
                _.findWhere(statusPie.data, {name: key}).y += value;
              } else {
                statusPie.data.push({
                  name: key,
                  y: value
                });
              }
            }
          });
        });
      });

      result.statusPie.push(statusPie);

      res.json(result);
    });
  });

  return router;
};
