# LeanEngine Node SDK

在 express 应用中使用：

```javascript
var app = require('express')();
var AV = require('leanengine');

AV.init({
  appId: process.env.APP_ID,
  appKey: process.env.LC_APP_KEY,
  masterKey: process.env.LC_APP_MASTER_KEY
});

app.use(AV.express());

app.listen(process.env.LC_APP_PORT);
```

## AV.express

```javascript
AV.express(options?: object)
```

初始化一个 LeanEngine 中间件，可被挂载到 express 应用上。

## AV.Object

* `AV.Object#disableBeforeHook()`
* `AV.Object#disableAfterHook()`

LeanEngine SDK 为 AVObject 提供了这两个方法来防止死循环，当在一个 AVObject 实例上调用了这个方法，就不会触发对应的 Hook（需要 masterKey 权限）。详见文档：[云函数开发指南：防止死循环调用](https://leancloud.cn/docs/leanengine_cloudfunction_guide-node.html#防止死循环调用)。

## AV.Cloud

### AV.Cloud.define

```javascript
AV.Cloud.define(name: string, func: function)
```

定义云函数，`func` 的签名：`function(request: Request, response: Response)`。

`Request` 上的属性包括：

* `params: object`：客户端发送的参数，当使用 `rpc` 调用时，也可能是 `AV.Object`.
* `user?: AV.User`：客户端所关联的用户（根据客户端发送的 `LC-Session` 头）。
* `meta: {remoteAddress}`：客户端的 IP.

`Response` 上的属性包括：

* `success: function(result)`：向客户端发送结果，可以是包括 AV.Object 在内的各种数据类型或数组，客户端解析方式见各 SDK 文档。
* `error: function(err: string)`：向客户端返回一个错误。

### AV.Cloud.run

运行已定义的云函数，与 JavaScript SDK 中会发起 HTTP 请求不同，在云引擎中默认变成直接调用指定的函数。

```javascript
AV.Cloud.run(name: string, data: object, options?: object): Promise
```

`options` 的属性包括：

* `user: AV.User`：以特定的用户运行云函数（建议在 `remote: false` 时使用）。
* `sessionToken: string`：以特定的 sessionToken 调用云函数（建议在 `remote: true` 时使用）。
* `remote: boolean`：通过网络请求来调用云函数，默认 `false`.

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

before 类 Hook 的 `func` 签名：`function(request: Request, response: Response)`，after 类 Hook 需要在执行完成后调用 `response.success` 或 `response.error` 接受或拒绝这次操作。

after 类 Hook 的 `func` 签名：`function(request: Request)`。

`Request` 上的属性包括：

* `object: AV.Object`：被操作的对象。
* `user?: AV.User`：发起操作的用户。

`Response` 上的属性包括：

* `success: function()`：允许这个操作，请在 15 秒内调用 `success`, 否则会认为操作被拒绝。
* `error: function(err: string)`：向客户端返回一个错误并拒绝这个操作。

更多有关 Hook 函数的内容请参考文档 [云函数开发指南：防止死循环调用：Hook 函数](https://leancloud.cn/docs/leanengine_cloudfunction_guide-node.html#Hook_函数)。

### 登录和认证 Hook

* AV.Cloud.onVerified
* AV.Cloud.onLogin

这两个函数的签名：`function(func: function)`，`func` 签名：`function(request: Request, response: Response)`，Hook 需要在执行完成后调用 `response.success` 或 `response.error` 接受或拒绝这次操作。

`Request` 上的属性包括：

* `user: AV.User`：被操作的用户。

`Response` 上的属性包括：

* `success: function()`：允许这个操作，请在 15 秒内调用 `success`, 否则会认为操作被拒绝。
* `error: function(err: string)`：向客户端返回一个错误并拒绝这个操作。

更多有关 Hook 函数的内容请参考文档 [云函数开发指南：防止死循环调用：Hook 函数](https://leancloud.cn/docs/leanengine_cloudfunction_guide-node.html#Hook_函数)。

### 实时通信 Hook 函数

包括：

* `_messageReceived`
* `_receiversOffline`
* `_conversationStart`
* `_conversationAdd`
* `_conversationRemove`

这些 Hook 需要用 `AV.Cloud.define` 来定义，详见文档 [实时通信概览：云引擎 Hook](https://leancloud.cn/docs/realtime_v2.html#云引擎_Hook)

## Middlewares

### cookie-session

该中间件提供了在 Express 中维护用户状态的能力。

```javascript
app.use(AV.Cloud.CookieSession({ secret: 'my secret', maxAge: 3600000, fetchUser: true }));
```

参数包括：

* `secret: string`：对 Cookie 进行签名的密钥，请选用一个随机字符串。
* `name?: string`：Cookie 名称，默认为 `avos.sess`。
* `maxAge?: number`：Cookie 过期时间。
* `fetchUser?: boolean`：是否自动查询用户信息，默认为 `false`，即不自动查询，这种情况下只能访问用户的 `id` 和 `sessionToken`.
* `httpOnly?: boolean`: 不允许客户端读写该 Cookie，默认 `false`.

### https-redirect

该中间件会自动将 HTTP 请求重定向到 HTTPS 上：

```javascript
app.use(AV.Cloud.HttpsRedirect());
```

## Express

当启用了 `cookie-session` 中间件后，express 的 `Request` 上会有这些属性可用：

* `currentUser?: AV.User`：和当前客户端关联的用户信息（根据 Cookie），如未开启 `cookie-session` 的 `fetchUser` 选项则只可以访问 `id` 和 `sessionToken`.
* `sessionToken?: string`：和当前客户端关联的 `sessionToken`（根据 Cookie）。

express 的 `Response` 上会有这些属性可用：

* `saveCurrentUser(user: AV.User)`：将当前客户端与特定用户关联（会写入 Cookie）。
* `clearCurrentUser()`：清除当前客户端关联的用户（删除 Cookie）。

更多有关在 express 维护用户状态的技巧见文档：[网站托管开发指南：处理用户登录和登出](https://leancloud.cn/docs/leanengine_webhosting_guide-node.html#处理用户登录和登出)。
