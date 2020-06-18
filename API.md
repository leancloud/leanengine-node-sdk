# LeanEngine Node SDK

在 express 应用中使用：

```javascript
var app = require('express')();
var AV = require('leanengine');

AV.init({
  appId: process.env.LEANCLOUD_APP_ID,
  appKey: process.env.LEANCLOUD_APP_KEY,
  masterKey: process.env.LEANCLOUD_APP_MASTER_KEY
  hookKey: process.env.LEANCLOUD_APP_HOOK_KEY
});

app.use(AV.express());

app.listen(process.env.LEANCLOUD_APP_PORT);
```

## 路由框架

目前 Node SDK 支持 express、koa、koa2 三种路由框架，可以通过下面的 3 种方法创建中间件并挂载到你的路由框架上：

```javascript
AV.express(options?: object)
AV.koa(options?: object)
AV.koa2(options?: object)
```

`options` 的属性包括：

- `onError?: function(err: Error)`：全局错误处理器，当云函数和 Hook 抛出异常时会调用该回调，可用于统一的错误报告。
- `ignoreInvalidSessionToken?: boolean`：忽略客户端发来的错误的 sessionToken（`X-LC-Session` 头），而不是抛出 401 错误 `{"code": 211, "error": "Verify sessionToken failed, maybe login expired: ..."}`。

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
* `internal: boolean`：只允许在云引擎内（使用 `AV.Cloud.run` 且未开启 `remote` 选项）或 masterKey 调用（使用 `AV.Cloud.run` 时传入 `useMasterKey`），不允许客户端直接调用，默认 `false`。

`Request` 上的属性包括：

* `params: object`：客户端发送的参数，当使用 `rpc` 调用时，也可能是 `AV.Object`.
* `currentUser?: AV.User`：客户端所关联的用户（根据客户端发送的 `X-LC-Session` 头）。
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
AV.Cloud.run(name: string, params: object, options?: object): Promise
```

`options` 的属性包括：

* `user?: AV.User`：以特定的用户运行云函数（建议在 `remote: false` 时使用）。
* `sessionToken?: string`：以特定的 sessionToken 调用云函数（建议在 `remote: true` 时使用）。
* `remote?: boolean`：通过网络请求来调用云函数，默认 `false`.
* `req?`: `http.ClientRequest` 或 Express 的 Request 对象，以便被调用的云函数得到 remoteAddress 等属性。

更多有关云函数的内容请参考文档 [云函数开发指南：云函数](https://leancloud.cn/docs/leanengine_cloudfunction_guide-node.html#云函数)。

### AV.Cloud.rpc

兼容 JavaScript SDK 的同名函数，是 `AV.Cloud.run` 的一个别名。

### AV.Cloud.enqueue

在队列中运行云函数。

```javascript
AV.Cloud.enqueue(name: string, params: object, options?: object): Promise<{uniqueId: string}>
```

`options` 的属性包括：

- `attempts?: number`：最大重试次数，默认 `1`
- `backoff?: number`：重试间隔（毫秒），默认 `60000`（一分钟）
- `delay?: number`：延时执行（毫秒）
- `deliveryMode?: string`：超时时的行为，值是 `atLeastOnce`（至少一次，可能会重试多次）、`atMostOnce`（至多一次，不会重试），默认是 `atLeastOnce`
- `keepResult?: number` 在队列中保留结果的时间（毫秒），默认 `300000`（五分钟）
- `priority?: number`：优先级，默认是当前时间戳，设置为更小的值可以在队列拥堵时让特定任务更快地被执行
- `timeout?: number`：超时时间（毫秒），默认 `15000`，目前最大也是 `15000`，后续会提供更长的时间
- `uniqueId?: string`：任务的唯一 ID，会据此进行去重，最长 32 个字符，默认是随机的 UUID

### AV.Cloud.getTaskInfo

查询队列任务结果。

```javascript
AV.Cloud.getTaskInfo(uniqueId: string): Promise<TaskInfo>
```

`TaskInfo` 的属性包括：

- `uniqueId: string`：任务的唯一 ID
- `status: string`：任务的状态，包括 `queued`（等待或正在执行）、`success`（执行成功）、`failed`（执行失败）

执行完成的 `TaskInfo` 会有：

- `finishedAt?: string` 执行完成（成功或失败）的时间
- `statusCode?: number` 云函数响应的 HTTP 状态码
- `result?: object` 来自云函数的响应

执行失败的 `TaskInfo` 会有：

- `error?: string` 错误提示
- `retryAt?: string` 下次重试的时间

### 定义 Class Hook

* `AV.Cloud.beforeSave`
* `AV.Cloud.afterSave`
* `AV.Cloud.beforeUpdate`
* `AV.Cloud.afterUpdate`
* `AV.Cloud.beforeDelete`
* `AV.Cloud.afterDelete`

这些函数的签名：`function(className: string, func: function)`，其中 `func` 是接受一个 Request 对象作为参数，返回 Promise 的函数。在 before 类 Hook 中如果没有抛出异常则视作接受这次操作。如果抛出使用 `AV.Cloud.Error` 构造的异常表示客户端错误，拒绝本次操作；如果抛出其他类型的异常则视作服务器端错误，返回 500 响应并打印错误到标准输出，也会拒绝本次操作。

`Request` 上的属性包括：

* `object: AV.Object`：被操作的对象。
* `currentUser?: AV.User`：发起操作的用户。
* `user?: AV.User`：同 `currentUser`.

LeanEngine 中间件会为这些 Hook 函数检查「Hook 签名」，确保调用者的确是 LeanCloud 或本地调试时的命令行工具。

更多有关 Hook 函数的内容请参考文档 [云函数开发指南：Hook 函数](https://leancloud.cn/docs/leanengine_cloudfunction_guide-node.html#Hook_函数)。

### 登录和认证 Hook

* `AV.Cloud.onVerified`
* `AV.Cloud.onLogin`

这两个函数的签名：`function(func: function)`，其中 `func` 是接受一个 Request 对象作为参数，返回 Promise 的函数，如果没有抛出异常则视作接受这次操作。

`Request` 上的属性包括：

* `currentUser: AV.User`：被操作的用户。
* `user: AV.User`：同 `currentUser`.
* `object: AV.User`：同 `currentUser`，因为登录认证 hook 被操作的对象正好是发起操作的用户。

### 实时通信 Hook 函数

包括：

* `AV.Cloud.onIMMessageReceived`
* `AV.Cloud.onIMReceiversOffline`
* `AV.Cloud.onIMMessageSent`
* `AV.Cloud.onIMMessageUpdate`
* `AV.Cloud.onIMConversationStart`
* `AV.Cloud.onIMConversationStarted`
* `AV.Cloud.onIMConversationAdd`
* `AV.Cloud.onIMConversationAdded`
* `AV.Cloud.onIMConversationRemove`
* `AV.Cloud.onIMConversationRemoved`
* `AV.Cloud.onIMConversationUpdate`
* `AV.Cloud.onIMClientOnline`
* `AV.Cloud.onIMClientOffline`
* `AV.Cloud.onIMClientSign`

LeanEngine 中间件会为这些 Hook 函数检查「Hook 签名」，确保调用者的确是 LeanCloud 或本地调试时的命令行工具。

这些 Hook 函数签名是 `function(func: function)`，其中 `func` 是接受一个 Request 对象作为参数，返回 Promise 的函数，详见文档 [实时通信概览：云引擎 Hook](https://leancloud.cn/docs/realtime_v2.html#云引擎_Hook)

### 启动和停止

单独运行云函数时，可以使用 `AV.Cloud.start()` 启动应用。如果该方法调用时 AV 对象尚未初始化，则 LeanEngine 中间件会使用 `LEANCLOUD_APP_ID` 等环境变量进行初始化。

在需要的时候，可以调用 `AV.Cloud.stop()` 来停止新链接的创建，但是已有链接不会主动断开。

## Middlewares

因为 Node SDK 同时支持多种路由框架，需要你在创建中间件时指定类型，默认为 express：

```javascript
app.use(AV.Cloud.LeanCloudHeaders({framework: 'express'}));
app.use(AV.Cloud.LeanCloudHeaders({framework: 'koa'}));
app.use(AV.Cloud.LeanCloudHeaders({framework: 'koa2'}));
```

### leancloud-headers

该中间件会将 `X-LC` 系列的头解析为 request.AV 上的属性，在 Express 中：

```javascript
app.use(AV.Cloud.LeanCloudHeaders());
```

express 的 `Request`（或 koa 的 `ctx`）上会有这些属性可用：

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

其他参数包括：

* `secret: string`：对 Cookie 进行签名的密钥，请选用一个随机字符串。
* `name?: string`：Cookie 名称，默认为 `avos.sess`。
* `maxAge?: number`：Cookie 过期时间。
* `fetchUser?: boolean`：是否自动查询用户信息，默认为 `false`，即不自动查询，这种情况下只能访问用户的 `id` 和 `sessionToken`.
* `httpOnly?: boolean`: 不允许客户端读写该 Cookie，默认 `false`.

express 的 `Request`（或 koa 的 `ctx`）上会有这些属性可用：

* `currentUser?: AV.User`：和当前客户端关联的用户信息（根据 Cookie），如未开启 `cookie-session` 的 `fetchUser` 选项则只可以访问 `id` 和 `sessionToken`.
* `sessionToken?: string`：和当前客户端关联的 `sessionToken`（根据 Cookie）。

express 的 `Response`（或 koa 的 `ctx`）上会有这些属性可用：

* `saveCurrentUser(user: AV.User)`：将当前客户端与特定用户关联（会写入 Cookie）。
* `clearCurrentUser()`：清除当前客户端关联的用户（删除 Cookie）。

更多有关在 express 维护用户状态的技巧见文档：[网站托管开发指南：处理用户登录和登出](https://leancloud.cn/docs/leanengine_webhosting_guide-node.html#处理用户登录和登出)。

### https-redirect

该中间件会自动将 HTTP 请求重定向到 HTTPS 上，在 Express 中：

```javascript
app.enable('trust proxy');
app.use(AV.Cloud.HttpsRedirect());
```

Koa 中：

```javascript
app.proxy = true;
app.use(AV.Cloud.HttpsRedirect({framework: 'koa'}));
```
