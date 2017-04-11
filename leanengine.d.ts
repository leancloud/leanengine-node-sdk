import {Promise} from 'es6-promise';
import {Request, RequestHandler} from 'express';
import {User as LCUser, Object as LCObject} from 'leancloud-storage';

declare namespace Express {
  export interface Request {
    AV: {
      id: string,
      key: string,
      masterKey: string,
      prod: number,
      sessionToken: string
    };

    currentUser?: LCUser;
    sessionToken?: string;
  }

  export interface Response {
    saveCurrentUser(user: LCUser);
    clearCurrentUser();
  }
}

declare module 'leanengine' {
  interface InitializeOptions {
    appId: string,
    appKey: string,
    masterKey: string
  }

  interface MiddlewareOptions {
    timeout?: string,
    printFullStack?: boolean
  }

  export function init(options: InitializeOptions): void;

  export function express(options?: MiddlewareOptions): RequestHandler;
  export function koa(options?: MiddlewareOptions): Function;

  export class Object {
    disableBeforeHook(): void;
    disableAfterHook(): void;
  }

  export namespace Insight {
    type InsightHandler = (result: Object) => Promise<any>;

    export function on(event: string, handler: InsightHandler): Promise<any>;
  }

  export namespace Cloud {
    interface DefineOptions {
      fetchUser?: boolean
    }

    interface RunOptions {
      remote?: boolean,
      user?: LCUser,
      sessionToken?: string,
      req?: Request
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
      currentUser?: LCUser,
      sessionToken?: string
    }

    interface ClassHookRequest {
      object: LCObject,
      currentUser?: LCUser
    }

    interface UserHookRequest {
      currentUser: LCUser
    }

    type CloudFunction = (request: CloudFunctionRequest) => Promise<any>;
    type ClassHookFunction = (request: ClassHookRequest) => Promise<any>;
    type UserHookFunction = (request: UserHookRequest) => Promise<any>;

    export class Error {
      constructor(message: string, options?: {status?: number, code?: number})
    }

    export function define(name: string, options: DefineOptions, handler: CloudFunction);
    export function define(name: string, handler: CloudFunction);

    export function run(name: string, params: Object, options?: RunOptions): Promise<any>;
    export function rpc(name: string, params: Object, options?: RunOptions): Promise<any>;

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
    export function onIMConversationStart(handler: CloudFunction): void;
    export function onIMConversationStarted(handler: CloudFunction): void;
    export function onIMConversationAdd(handler: CloudFunction): void;
    export function onIMConversationRemove(handler: CloudFunction): void;
    export function onIMConversationUpdate(handler: CloudFunction): void;

    export function LeanCloudHeaders(options?: MiddlewareOptions): RequestHandler;
    export function CookieSession(options?: CookieSessionOptions): RequestHandler;
    export function HttpsRedirect(options?: MiddlewareOptions): RequestHandler;
  }
}
