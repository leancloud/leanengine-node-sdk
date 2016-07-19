# LeanEngine Node SDK

在 express 应用中使用：

```javascript
var app = require('express')();
var AV = require('leanengine');

AV.init({
  appId: process.env.LEANCLOUD_APP_ID,
  appKey: process.env.LEANCLOUD_APP_KEY,
  masterKey: process.env.LEANCLOUD_APP_MASTER_KEY
});

app.use(AV.express());

app.listen(process.env.LEANCLOUD_APP_PORT);
```

## AV.express

```javascript
AV.express(options?: object)
```

初始化一个 LeanEngine 中间件，可被挂载到 express 应用上。

## AV.koa

```javascript
AV.koa(options?: object)
```

初始化一个 LeanEngine 中间件，可被挂载到 koa 应用上。

## AV.Object

* `AV.Object#disableBeforeHook()`
* `AV.Object#disableAfterHook()`

LeanEngine SDK 为 AVObject 提供了这两个方法来防止死循环，当在一个 AVObject 实例上调用了这个方法，就不会触发对应的 Hook（需要 masterKey 权限）。详见文档：[云函数开发指南：防止死循环调用](https://leancloud.cn/docs/leanengine_cloudfunction_guide-node.html#防止死循环调用)。

## AV.Cloud

### AV.Cloud.define

```javascript
AV.Cloud.define(name: string, func: function)
AV.Cloud.define(name: string, options: object, func: function)
```

定义云函数有两种签名，其中 options 是一个可选的参数，`func` 的签名：`function(request: Request, response: Response)`。

`options` 的属性包括：

* `fetchUser: boolean`：是否自动抓取客户端的用户信息，默认为 `true`，若设置为 `false` 则 `request` 上将不会有 user 属性。

`Request` 上的属性包括：

* `params: object`：客户端发送的参数，当使用 `rpc` 调用时，也可能是 `AV.Object`.
* `currentUser?: AV.User`：客户端所关联的用户（根据客户端发送的 `LC-Session` 头）。
* `user?: AV.User`：同 `currentUser`.
* `meta: {remoteAddress}`：`meta.remoteAddress` 是客户端的 IP.
* `sessionToken?: string`：客户端发来的 sessionToken（`X-LC-Session` 头）。

`Response` 上的属性包括：

* `success: function(result?)`：向客户端发送结果，可以是包括 AV.Object 在内的各种数据类型或数组，客户端解析方式见各 SDK 文档。
* `error: function(err?: string)`：向客户端返回一个错误。

### AV.Cloud.run

运行已定义的云函数，与 JavaScript SDK 中会发起 HTTP 请求不同，在云引擎中默认变成直接调用指定的函数。

```javascript
AV.Cloud.run(name: string, data: object, options?: object): Promise
```

`options` 的属性包括：

* `user?: AV.User`：以特定的用户运行云函数（建议在 `remote: false` 时使用）。
* `sessionToken?: string`：以特定的 sessionToken 调用云函数（建议在 `remote: true` 时使用）。
* `remote?: boolean`：通过网络请求来调用云函数，默认 `false`.
* `req?`: Express 的 Request 对象，以便被调用的云函数得到 remoteAddress 等属性。

更多有关云函数的内容请参考文档 [云函数开发指南：云函数](https://leancloud.cn/docs/leanengine_cloudfunction_guide-node.html#云函数)。

### AV.Cloud.rpc

兼容 JavaScript SDK 的同名函数，是 `AV.Cloud.run` 的一个别名。

### 定义 Class Hook

* AV.Cloud.beforeSave
* AV.Cloud.afterSave
* AV.Cloud.beforeUpdate
* AV.Cloud.afterUpdate
* AV.Cloud.beforeDelete
* AV.Cloud.afterDelete

这些函数的签名：`function(className: string, func: function)`。

before 类 Hook 的 `func` 签名：`function(request: Request, response: Response)`，before 类 Hook 需要在执行完成后调用 `response.success` 或 `response.error` 接受或拒绝这次操作。

after 类 Hook 的 `func` 签名：`function(request: Request)`。

`Request` 上的属性包括：

* `object: AV.Object`：被操作的对象。
* `currentUser?: AV.User`：发起操作的用户。
* `user?: AV.User`：同 `currentUser`.

`Response` 上的属性包括：

* `success: function()`：允许这个操作，请在 15 秒内调用 `success`, 否则会认为操作被拒绝。
* `error: function(err: string)`：向客户端返回一个错误并拒绝这个操作。

LeanEngine 中间件会为这些 Hook 函数检查「Hook 签名」，确保调用者的确是 LeanCloud 或本地调试时的命令行工具。

更多有关 Hook 函数的内容请参考文档 [云函数开发指南：Hook 函数](https://leancloud.cn/docs/leanengine_cloudfunction_guide-node.html#Hook_函数)。

### 登录和认证 Hook

* AV.Cloud.onVerified
* AV.Cloud.onLogin

这两个函数的签名：`function(func: function)`，`func` 签名：`function(request: Request, response: Response)`，Hook 需要在执行完成后调用 `response.success` 或 `response.error` 接受或拒绝这次操作。

`Request` 上的属性包括：

* `currentUser: AV.User`：被操作的用户。
* `user: AV.User`：同 `currentUser`.

`Response` 上的属性包括：

* `success: function()`：允许这个操作，请在 15 秒内调用 `success`, 否则会认为操作被拒绝。
* `error: function(err: string)`：向客户端返回一个错误并拒绝这个操作。

更多有关 Hook 函数的内容请参考文档 [云函数开发指南：Hook 函数](https://leancloud.cn/docs/leanengine_cloudfunction_guide-node.html#Hook_函数)。

### 实时通信 Hook 函数

包括：

* `_messageReceived`
* `_receiversOffline`
* `_messageSent`
* `_conversationStart`
* `_conversationAdd`
* `_conversationRemove`
* `_conversationUpdate`

LeanEngine 中间件会为这些 Hook 函数检查「Hook 签名」，确保调用者的确是 LeanCloud 或本地调试时的命令行工具。

这些 Hook 需要用 `AV.Cloud.define` 来定义，详见文档 [实时通信概览：云引擎 Hook](https://leancloud.cn/docs/realtime_v2.html#云引擎_Hook)

### AV.Cloud.httpRequest

注意：该 API 已不再维护且可能在之后的版本中去除，请使用 [request](https://www.npmjs.com/package/request) 发起 HTTP 请求。

```javascript
AV.Cloud.httpRequest(options: object);
```

options 的属性包括：

* `url`：被请求的 Url, 例如 `https://api.leancloud.cn/1.1/ping`。
* `success: function(response: Response)`：成功回调，接受一个 HTTP 响应作为参数。
* `error: function(response: Response)`：失败回调，接受一个 HTTP 响应作为参数。
* `method: string`：HTTP 方法，默认为 `GET`。
* `params`：Query String，可以是对象 `{q : 'Sean Plott'}` 也可以是字符串 `q=Sean Plott`。
* `headers: object`：HTTP 头，例如 `{'Content-Type': 'application/json'}`。
* `body: object`：HTTP 请求正文，默认使用 urlencode 编码，如果指定了 `Content-Type` 为 `application/json` 则发送 JSON 格式的正文；不适用于 `GET` 或 `HEAD` 请求。
* `timeout: number`：超时时间，单位秒，默认 `10000`。

Response 的属性包括：

* `status: number`：HTTP 响应状态码。
* `headers: object`：HTTP 响应头。
* `text: string`：HTTP 响应正文。
* `buffer: Buffer`：HTTP 响应正文。
* `data` 解析后的 HTTP 响应正文，例如对于 `Content-Type` 为 `application/json` 时，会将响应正文解析为一个对象。

示例：

```javascript
AV.Cloud.httpRequest({
  method: 'POST',
  url: 'http://www.example.com/create_post',
  body: {
    title: 'Vote for Pedro',
    body: 'If you vote for Pedro, your wildest dreams will come true'
  },
  success: function(httpResponse) {
    console.log(httpResponse.text);
  },
  error: function(httpResponse) {
    console.error('Request failed with response code ' + httpResponse.status);
  }
});
```

## Middlewares

### cookie-session

该中间件提供了在 Express 或 Koa 中维护用户状态的能力，在 Express 中：

```javascript
app.use(AV.Cloud.CookieSession({secret: 'my secret', maxAge: 3600000, fetchUser: true}));
```

在 Koa 中（添加 `framework: 'koa'` 参数）：

```javascript
app.use(AV.Cloud.CookieSession({framework: 'koa', secret: 'my secret', maxAge: 3600000, fetchUser: true}));
```

参数包括：

* `koa?: boolean`：返回一个 koa（而不是 express）中间件。
* `secret: string`：对 Cookie 进行签名的密钥，请选用一个随机字符串。
* `name?: string`：Cookie 名称，默认为 `avos.sess`。
* `maxAge?: number`：Cookie 过期时间。
* `fetchUser?: boolean`：是否自动查询用户信息，默认为 `false`，即不自动查询，这种情况下只能访问用户的 `id` 和 `sessionToken`.
* `httpOnly?: boolean`: 不允许客户端读写该 Cookie，默认 `false`.

express 的 `Request`（或 koa 的 `ctx.request`）上会有这些属性可用：

* `currentUser?: AV.User`：和当前客户端关联的用户信息（根据 Cookie），如未开启 `cookie-session` 的 `fetchUser` 选项则只可以访问 `id` 和 `sessionToken`.
* `sessionToken?: string`：和当前客户端关联的 `sessionToken`（根据 Cookie）。

express 的 `Response`（或 koa 的 `ctx.response`）上会有这些属性可用：

* `saveCurrentUser(user: AV.User)`：将当前客户端与特定用户关联（会写入 Cookie）。
* `clearCurrentUser()`：清除当前客户端关联的用户（删除 Cookie）。

更多有关在 express 维护用户状态的技巧见文档：[网站托管开发指南：处理用户登录和登出](https://leancloud.cn/docs/leanengine_webhosting_guide-node.html#处理用户登录和登出)。

### https-redirect

该中间件会自动将 HTTP 请求重定向到 HTTPS 上，在 Express 中：

```javascript
app.enable('trust proxy');
app.use(AV.Cloud.HttpsRedirect());
```

Koa 中（添加 `framework: 'koa'` 参数）：

```javascript
app.proxy = true;
app.use(AV.Cloud.HttpsRedirect({framework: 'koa'}));
```
