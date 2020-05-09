import {Request, RequestHandler} from 'express';
import {User, Object as LCObject} from 'leancloud-storage';
export * from 'leancloud-storage';

declare namespace Express {
  export interface Request {
    AV: {
      id: string,
      key: string,
      masterKey: string,
      prod: number,
      sessionToken: string
    };

    currentUser?: User;
    sessionToken?: string;
  }

  export interface Response {
    saveCurrentUser(user: User): void;
    clearCurrentUser(): void;
  }
}

interface InitializeOptions {
  appId: string,
  appKey: string,
  masterKey?: string,
  hookKey?: string,
}

interface MiddlewareOptions {
  timeout?: string,
  printFullStack?: boolean,
  onError?(err: Error): void,
  ignoreInvalidSessionToken?: boolean
}

export function init(options: InitializeOptions): void;

export function express(options?: MiddlewareOptions): RequestHandler;
export function koa(options?: MiddlewareOptions): Function;
export function koa2(options?: MiddlewareOptions): any;

declare class HookObject extends LCObject {
  disableBeforeHook(): void;
  disableAfterHook(): void;

  updatedKeys?: string[];
}

export { HookObject as Object }

export namespace Insight {
  type InsightHandler = (result: Object) => Promise<any>;

  export function on(event: string, handler: InsightHandler): Promise<any>;
}

export namespace Cloud {
  interface DefineOptions {
    fetchUser?: boolean
    internal?: boolean
  }

  interface RunOptions {
    remote?: boolean,
    user?: User,
    sessionToken?: string,
    req?: Request
  }

  interface EnqueueOptions {
    attempts?: number,
    backoff?: number,
    delay?: number,
    notify?: string,
    retryTimeout?: boolean,
  }

  enum TaskStatus {
    Queued = 'queued',
    Success = 'success',
    Failed = 'failed'
  }

  interface TaskInfo {
    uniqueId: string
    status: TaskStatus
    finishedAt?: Date
    statusCode?: number
    result?: any
    error?: string
    retryAt?: Date
  }

  interface MiddlewareOptions {
    framework?: string
  }

  interface CookieSessionOptions extends MiddlewareOptions {
    secret: string
    fetchUser?: boolean
  }

  interface CloudFunctionRequestMeta {
    remoteAddress: string
  }

  interface CloudFunctionRequest {
    meta: CloudFunctionRequestMeta,
    params: Object,
    currentUser?: User,
    sessionToken?: string
  }

  interface ClassHookRequest {
    object: HookObject,
    currentUser?: User
  }

  interface UserHookRequest {
    currentUser: User
  }

  type CloudFunction = (request: CloudFunctionRequest) => Promise<any>;
  type ClassHookFunction = (request: ClassHookRequest) => Promise<any>;
  type UserHookFunction = (request: UserHookRequest) => Promise<any>;

  export class Error {
    constructor(message: string, options?: {status?: number, code?: number})
  }

  export function define(name: string, options: DefineOptions, handler: CloudFunction): void;
  export function define(name: string, handler: CloudFunction): void;

  export function run(name: string, params?: Object, options?: RunOptions): Promise<any>;
  export function rpc(name: string, params?: Object, options?: RunOptions): Promise<any>;
  export function enqueue(name: string, params?: Object, options?: EnqueueOptions): Promise<{uniqueId: string}>;
  export function getTaskInfo(uniqueId: string): Promise<TaskInfo>;

  export function beforeSave(className: string, handler: ClassHookFunction): void;
  export function afterSave(className: string, handler: ClassHookFunction): void;
  export function beforeUpdate(className: string, handler: ClassHookFunction): void;
  export function afterUpdate(className: string, handler: ClassHookFunction): void;
  export function beforeDelete(className: string, handler: ClassHookFunction): void;
  export function afterDelete(className: string, handler: ClassHookFunction): void;

  export function onVerified(handler: UserHookFunction): void;
  export function onLogin(handler: UserHookFunction): void;

  export function onIMMessageReceived(handler: CloudFunction): void;
  export function onIMReceiversOffline(handler: CloudFunction): void;
  export function onIMMessageSent(handler: CloudFunction): void;
  export function onIMMessageUpdate(handler: CloudFunction): void;
  export function onIMConversationStart(handler: CloudFunction): void;
  export function onIMConversationStarted(handler: CloudFunction): void;
  export function onIMConversationAdd(handler: CloudFunction): void;
  export function onIMConversationAdded(handler: CloudFunction): void;
  export function onIMConversationRemove(handler: CloudFunction): void;
  export function onIMConversationRemoved(handler: CloudFunction): void;
  export function onIMConversationUpdate(handler: CloudFunction): void;
  export function onIMClientOnline(handler: CloudFunction): void;
  export function onIMClientOffline(handler: CloudFunction): void;
  export function onIMClientSign(handler: CloudFunction): void;

  export function LeanCloudHeaders(options?: MiddlewareOptions): RequestHandler;
  export function CookieSession(options?: CookieSessionOptions): RequestHandler;
  export function HttpsRedirect(options?: MiddlewareOptions): RequestHandler;

  export function start(): void;
  export function stop(): void;
}
