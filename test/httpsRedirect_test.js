'use strict';
var config = require('./config'),
  AV = require('..'),
  express = require('express');

var appId = config.appId;
var appKey = config.appKey;
var masterKey = config.masterKey;

AV.initialize(appId, appKey, masterKey);

var app = express();

app.enable('trust proxy');
app.use(AV.Cloud.HttpsRedirect());

app.get('/test', function (req, res) {
  res.send('Hello World!');
});

var request = require('supertest');

describe('httsRedirect', function() {
  it('test', function(done) {
    request(app)
      .get('/test')
      .set('host', 'stg-abc.leanapp.cn')
      .expect(302)
      .expect("Found. Redirecting to https://stg-abc.leanapp.cn/test", done);
  });

  it('not_leanapp_host', function(done) {
    request(app)
      .get('/test')
      .expect(200)
      .expect("Hello World!", done);
  });
});
