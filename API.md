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

定义云函数有两种签名，其中 `options` 是一个可选的参数，`func` 是接受一个 Request 对象作为参数，返回 Promise 的函数，Promise 的值即为云函数的响应。在 Promise 中可以抛出使用 `AV.Cloud.Error` 构造的异常表示客户端错误，如参数不合法；如果抛出其他类型的异常则视作服务器端错误，会打印错误到标准输出。

`options` 的属性包括：

* `fetchUser: boolean`：是否自动抓取客户端的用户信息，默认为 `true`，若设置为 `false` 则 `request` 上将不会有 user 属性。

`Request` 上的属性包括：

* `params: object`：客户端发送的参数，当使用 `rpc` 调用时，也可能是 `AV.Object`.
* `currentUser?: AV.User`：客户端所关联的用户（根据客户端发送的 `LC-Session` 头）。
* `user?: AV.User`：同 `currentUser`.
* `meta: {remoteAddress}`：`meta.remoteAddress` 是客户端的 IP.
* `sessionToken?: string`：客户端发来的 sessionToken（`X-LC-Session` 头）。

1.x 兼容模式：在早期版本中，云函数和 before 类的 Hook 是接受两个参数（`request` 和 `response`）的，**我们会继续兼容这种用法到下一个大版本，希望开发者尽快迁移到 Promise 风格的云函数上**。

### AV.Cloud.Error

```javascript
new AV.Cloud.Error(message: string, options?)
```

继承自 `Error`，用于在云函数和 Class Hook 中表示客户端错误，其中第二个参数支持：

- `status?: number`：设置 HTTP 响应代码（默认 400）
- `code?: number`：设置响应正文中的错误代码（默认 1）

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

这些函数的签名：`function(className: string, func: function)`，其中 `func` 是接受一个 Request 对象作为参数，返回 Promise 的函数。在 before 类 Hook 中如果没有抛出异常则视作接受这次操作。如果抛出使用 `AV.Cloud.Error` 构造的异常表示客户端错误，拒绝本次操作；如果抛出其他类型的异常则视作服务器端错误，返回 500 响应并打印错误到标准输出，也会拒绝本次操作。

`Request` 上的属性包括：

* `object: AV.Object`：被操作的对象。
* `currentUser?: AV.User`：发起操作的用户。
* `user?: AV.User`：同 `currentUser`.

LeanEngine 中间件会为这些 Hook 函数检查「Hook 签名」，确保调用者的确是 LeanCloud 或本地调试时的命令行工具。

更多有关 Hook 函数的内容请参考文档 [云函数开发指南：Hook 函数](https://leancloud.cn/docs/leanengine_cloudfunction_guide-node.html#Hook_函数)。

### 登录和认证 Hook

* AV.Cloud.onVerified
* AV.Cloud.onLogin

这两个函数的签名：`function(func: function)`，其中 `func` 是接受一个 Request 对象作为参数，返回 Promise 的函数，如果没有抛出异常则视作接受这次操作。

`Request` 上的属性包括：

* `currentUser: AV.User`：被操作的用户。
* `user: AV.User`：同 `currentUser`.

### 实时通信 Hook 函数

包括：

* `onIMMessageReceived`
* `onIMReceiversOffline`
* `onIMMessageSent`
* `onIMConversationStart`
* `onIMConversationStarted`
* `onIMConversationAdd`
* `onIMConversationRemove`
* `onIMConversationUpdate`

LeanEngine 中间件会为这些 Hook 函数检查「Hook 签名」，确保调用者的确是 LeanCloud 或本地调试时的命令行工具。

这些 Hook 函数签名是 `function(func: function)`，其中 `func` 是接受一个 Request 对象作为参数，返回 Promise 的函数，详见文档 [实时通信概览：云引擎 Hook](https://leancloud.cn/docs/realtime_v2.html#云引擎_Hook)

## Middlewares

### leancloud-headers

该中间件会将 `X-LC` 系列的头解析为 request.AV 上的属性，在 Express 中：

```javascript
app.use(AV.Cloud.LeanCloudHeaders());
```

在 Koa 中（添加 `framework: 'koa'` 参数）：

```javascript
app.use(AV.Cloud.LeanCloudHeaders({framework: 'koa'}));
```

express 的 `Request`（或 koa 的 `ctx.request`）上会有这些属性可用：

* `AV.id?`：App ID
* `AV.key?`：App Key
* `AV.masterKey?`：App Master Key
* `AV.prod`：`0` 或 `1`
* `AV.sessionToken?`：Session Token

### cookie-session

该中间件提供了在 Express 或 Koa 中维护用户状态的能力，在 Express 中：

```javascript
app.use(AV.Cloud.CookieSession({secret: 'my secret', maxAge: 3600000, fetchUser: true}));
```

在 Koa 中（添加 `framework: 'koa'` 参数）：

```javascript
app.use(AV.Cloud.CookieSession({framework: 'koa', secret: 'my secret', maxAge: 3600000, fetchUser: true}));
```

其他参数包括：

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
