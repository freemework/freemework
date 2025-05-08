import * as http from "http";
import * as https from "https";
import {
	ParsedMediaType,
	parse as contentTypeParse,
} from "content-type";

import { FCancellationExecutionContext, FCancellationException, FCancellationToken } from "../cancellation/index.js";
import { FChannelInvoke } from "../channel/index.js";
import { FException, FExceptionInvalidOperation, FExceptionNativeErrorWrapper } from "../exception/index.js";
import { FExecutionContext } from "../execution_context/index.js";
import { FLogger, FLoggerLabel, FLoggerLabelsExecutionContext, FLoggerLevel } from "../logging/index.js";

export class FHttpClientLoggerLabel extends FLoggerLabel {
    public static readonly URL = new FHttpClientLoggerLabel("out.http.url", "Describes HTTP URL of output request");
    public static readonly METHOD = new FHttpClientLoggerLabel("out.http.method", "Describes HTTP method of output request (like a GET, POST, etc.)");
    // ...
}

export class FHttpClient implements FHttpClient.HttpInvokeChannel {
	private readonly _log: FLogger;
	private readonly _logLevelHeaders: FLoggerLevel;
	private readonly _logLevelBody: FLoggerLevel;
	private readonly _proxyOpts: FHttpClient.ProxyOpts | null;
	private readonly _sslOpts: FHttpClient.SslOpts | null;
	private readonly _requestTimeout: number;
	public constructor(opts?: FHttpClient.Opts) {
		this._log = opts !== undefined && opts.log !== undefined ? opts.log : FLogger.create(this.constructor.name);
		this._logLevelBody = opts !== undefined && opts.logLevelBody !== undefined ? opts.logLevelBody : FLoggerLevel.DEBUG;
		this._logLevelHeaders = opts !== undefined && opts.logLevelHeaders !== undefined ? opts.logLevelHeaders : FLoggerLevel.DEBUG;
		this._proxyOpts = opts !== undefined && opts.proxyOpts !== undefined ? opts.proxyOpts : null;
		this._sslOpts = opts !== undefined && opts.sslOpts !== undefined ? opts.sslOpts : null;
		this._requestTimeout = opts !== undefined && opts.timeout !== undefined ? opts.timeout : FHttpClient.DEFAULT_TIMEOUT;
	}

	public async invoke(
		executionContext: FExecutionContext,
		{ url, method, headers, body }: FHttpClient.Request
	): Promise<FHttpClient.Response> {
		executionContext = new FLoggerLabelsExecutionContext(
			executionContext,
			FHttpClientLoggerLabel.METHOD.value(method),
			FHttpClientLoggerLabel.URL.value(url.toString()),
		);

		this._log.trace(executionContext, "Begin invoke");
		try {
			return await new Promise<FHttpClient.Response>((resolve, reject) => {
				const cancellationToken: FCancellationToken = FCancellationExecutionContext.of(executionContext).cancellationToken;

				let isConnectTimeout: boolean = false;
				let resolved: boolean = false;

				const errorHandler = (e: Error) => {
					const ex: FException = FException.wrapIfNeeded(e);
					if (!resolved) {
						resolved = true;
						const msg = isConnectTimeout ? "Connect Timeout"
							: `${method} ${url} failed with error: ${ex.message}. See innerException for details`;
						this._log.debug(executionContext, msg, ex);
						return reject(new FHttpClient.CommunicationError(url, method,
							headers !== undefined ? headers : {},
							body !== undefined ? body : Buffer.alloc(0),
							msg, ex
						));
					}
				};

				const responseHandler = (response: http.IncomingMessage) => {
					const responseDataChunks: Array<Buffer> = [];
					response.on("data", (chunk: Buffer) => responseDataChunks.push(chunk));
					response.on("error", errorHandler);
					response.on("end", () => {
						if (!resolved) {
							resolved = true;

							if (isConnectTimeout) {
								return reject(new FHttpClient.CommunicationError(url, method,
									headers !== undefined ? headers : {},
									body !== undefined ? body : Buffer.alloc(0),
									"Connect Timeout",
								));
							}

							const respStatus: number = response.statusCode || 500;
							const respDescription: string = response.statusMessage || "";
							const respHeaders = response.headers;
							const respBody: Buffer = Buffer.concat(responseDataChunks);

							this._log.log(executionContext, this._logLevelHeaders, () => `Recv head: ${JSON.stringify({ respStatus, respDescription, respHeaders })}`);
							this._log.log(executionContext, this._logLevelBody, () => `Recv body: ${respBody.toString()}`);

							if (respStatus < 400) {
								return resolve({
									statusCode: respStatus, statusDescription: respDescription,
									headers: respHeaders, body: respBody,
								});
							} else {
								return reject(
									new FHttpClient.WebError(
										respStatus, respDescription,
										url, method,
										headers !== undefined ? headers : {}, body !== undefined ? body : Buffer.alloc(0),
										respHeaders, respBody,
									)
								);
							}
						}
					});
				};

				try {
					cancellationToken.throwIfCancellationRequested(); // Will raise error, we want to reject this Promise exactly with cancellation exception.
				} catch (e) {
					return reject(e);
				}

				this._log.log(executionContext, this._logLevelHeaders, () => `Write head: ${JSON.stringify({ reqHeaders: headers })}`);
				const request: http.ClientRequest = this.createClientRequest(executionContext, { url, method, headers: headers! }, responseHandler);
				if (body !== undefined) {
					this._log.log(executionContext, this._logLevelBody, () => `Write body: ${body.toString()}`);
					request.write(body);
				}
				request.end();

				request.on("error", errorHandler);
				request.on("close", () => request.removeListener("close", errorHandler)); // Prevent memory-leaks

				request.setTimeout(this._requestTimeout, () => {
					isConnectTimeout = true;
					request.destroy();
				});
				request.on("socket", socket => {
					// this will setup connect timeout
					socket.setTimeout(this._requestTimeout);
					// socket.on("timeout", () => {
					// 	isConnectTimeout = true;
					// 	request.abort();
					// });
				});
				if (cancellationToken !== undefined) {
					const cb = () => {
						request.destroy();
						if (!resolved) {
							resolved = true;
							try {
								cancellationToken.throwIfCancellationRequested(); // Should raise error
								// Guard for broken implementation of cancellationToken
								reject(new FCancellationException("Cancelled by user"));
							} catch (e) {
								reject(e);
							}
						}
					};
					cancellationToken.addCancelListener(cb);
					request.on("close", () => cancellationToken.removeCancelListener(cb)); // Prevent memory-leaks
				}
			});
		} finally {
			this._log.trace(executionContext, "End invoke");
		}
	}

	private createClientRequest(
		executionContext: FExecutionContext,
		{ url, method, headers }: FHttpClient.Request,
		callback: (res: http.IncomingMessage) => void,
	): http.ClientRequest {
		const proxyOpts = this._proxyOpts;
		if (proxyOpts && proxyOpts.type === "http") {
			const reqOpts = {
				protocol: "http:",
				host: proxyOpts.host,
				port: proxyOpts.port,
				path: url.href,
				method,
				headers: { Host: url.host, ...headers }
			};
			this._log.trace(executionContext, () => `http.request(${JSON.stringify(reqOpts)})`);
			return http.request(reqOpts, callback);
		} else {
			const reqOpts: https.RequestOptions = {
				protocol: url.protocol,
				host: url.hostname,
				port: url.port,
				path: url.pathname + url.search,
				method: method,
				headers: headers
			};
			if (reqOpts.protocol === "https:") {
				const sslOpts = this._sslOpts;
				if (sslOpts) {
					if (sslOpts.ca) {
						reqOpts.ca = sslOpts.ca;
					}
					if (sslOpts.rejectUnauthorized !== undefined) {
						reqOpts.rejectUnauthorized = sslOpts.rejectUnauthorized;
					}
					if ("pfx" in sslOpts) {
						reqOpts.pfx = sslOpts.pfx;
						reqOpts.passphrase = sslOpts.passphrase;
					} else if ("cert" in sslOpts) {
						reqOpts.key = sslOpts.key;
						reqOpts.cert = sslOpts.cert;
					}
				}
				this._log.trace(executionContext, () => `https.request(${JSON.stringify(reqOpts)})`);
				return https.request(reqOpts, callback);
			} else {
				this._log.trace(executionContext, () => `http.request(${JSON.stringify(reqOpts)})`);
				return http.request(reqOpts, callback);
			}
		}
	}
}

export namespace FHttpClient {
	export const DEFAULT_TIMEOUT: number = 60000;

	export interface Opts {
		/**
		 * Use used-defined logger
		 */
		log?: FLogger;

		/**
		 * Headers (request/response) will be be logged at this level
		 * 
		 * @default FLoggerLevel.DEBUG
		 */
		logLevelHeaders?: FLoggerLevel,

		/**
		 * Body (request/response) will be be logged at this level
		 * 
		 * @default FLoggerLevel.DEBUG
		 */
		logLevelBody?: FLoggerLevel,
		timeout?: number;
		proxyOpts?: ProxyOpts;
		sslOpts?: SslOpts;
	}

	export type ProxyOpts = HttpProxyOpts | Socks5ProxyOpts;

	export interface HttpProxyOpts {
		type: "http";
		host: string;
		port: number;
	}

	export interface Socks5ProxyOpts {
		type: "socks5";
	}

	export type SslOpts = SslOptsBase | SslCertOpts | SslPfxOpts;

	export interface SslOptsBase {
		ca?: Buffer | Array<Buffer>;
		rejectUnauthorized?: boolean;
	}

	export interface SslCertOpts extends SslOptsBase {
		key: Buffer;
		cert: Buffer;
	}

	export interface SslPfxOpts extends SslOptsBase {
		pfx: Buffer;
		passphrase: string;
	}

	export enum HttpMethod {
		CONNECT = "CONNECT",
		DELETE = "DELETE",
		HEAD = "HEAD",
		GET = "GET",
		OPTIONS = "OPTIONS",
		PATCH = "PATCH",
		POST = "POST",
		PUT = "PUT",
		TRACE = "TRACE"
	}

	export interface Request {
		readonly url: URL;
		readonly method: HttpMethod | string;
		readonly headers?: http.OutgoingHttpHeaders;
		readonly body?: Uint8Array;
	}
	export interface Response {
		readonly statusCode: number;
		readonly statusDescription: string;
		readonly headers: http.IncomingHttpHeaders;
		readonly body: Uint8Array;
	}

	export type HttpInvokeChannel = FChannelInvoke<Request, Response>;

	/** Base error type for WebClient */
	export abstract class HttpClientError extends FException {
		private readonly _url: URL;
		private readonly _method: string;
		private readonly _requestHeaders: http.OutgoingHttpHeaders;
		private readonly _requestBody: Uint8Array;

		public constructor(
			url: URL, method: string,
			requestHeaders: http.OutgoingHttpHeaders,
			requestBody: Uint8Array,
			errorMessage: string,
			innerException?: FException
		) {
			super(errorMessage, innerException);
			this._url = url;
			this._method = method;
			this._requestHeaders = requestHeaders;
			this._requestBody = requestBody;
		}

		public get url(): URL { return this._url; }
		public get method(): string { return this._method; }
		public get requestHeaders(): http.OutgoingHttpHeaders { return this._requestHeaders; }
		public get requestBody(): Uint8Array { return this._requestBody; }
		public get requestObject(): any { return parseJsonBody(this.requestBody, this.requestHeaders); }
	}

	/**
	 * WebError is a wrapper of HTTP responses with code 4xx/5xx
	 */
	export class WebError extends HttpClientError implements Response {
		private readonly _statusCode: number;
		private readonly _statusDescription: string;
		private readonly _responseHeaders: http.IncomingHttpHeaders;
		private readonly _responseBody: Uint8Array;

		public constructor(
			statusCode: number, statusDescription: string,
			url: URL, method: string,
			requestHeaders: http.OutgoingHttpHeaders, requestBody: Uint8Array,
			responseHeaders: http.IncomingHttpHeaders, responseBody: Uint8Array,
			innerException?: FException
		) {
			super(url, method, requestHeaders, requestBody, `${statusCode} ${statusDescription}`, innerException);
			this._statusCode = statusCode;
			this._statusDescription = statusDescription;
			this._responseHeaders = responseHeaders;
			this._responseBody = responseBody;
		}

		public get statusCode(): number { return this._statusCode; }
		public get statusDescription(): string { return this._statusDescription; }
		public get headers(): http.IncomingHttpHeaders { return this._responseHeaders; }
		public get body(): Uint8Array { return this._responseBody; }
		public get object(): any { return parseJsonBody(this.body, this.headers); }
	}

	/**
	 * CommunicationError is a wrapper over underlying network errors.
	 * Such a DNS lookup issues, TCP connection issues, etc...
	 */
	export class CommunicationError extends HttpClientError {
		public constructor(
			url: URL, method: string,
			requestHeaders: http.OutgoingHttpHeaders, requestBody: Uint8Array,
			errorMessage: string, innerException?: FException
		) {
			super(url, method, requestHeaders, requestBody, errorMessage, innerException);
		}

		public get code(): string | null {
			const innerException: FException | null = this.innerException;
			if (innerException !== null && innerException instanceof FExceptionNativeErrorWrapper) {
				const error: Error & { code?: any } = innerException.nativeError;
				if ("code" in error) {
					const code = error.code;
					if (typeof (code) === "string") {
						return code;
					}
				}
			}
			return null;
		}
	}
}


function parseJsonBody(body: Buffer | Uint8Array, headers: http.IncomingHttpHeaders | http.OutgoingHttpHeaders): any {
	let contentType: ParsedMediaType | null = null;
	if (headers !== null) {
		const contentTypeHeaderName = Object.keys(headers).find(header => header.toLowerCase() === "content-type");
		if (contentTypeHeaderName !== undefined) {
			const headerValue = headers[contentTypeHeaderName];
			if (typeof headerValue === "string") {
				contentType = contentTypeParse(headerValue);
			}
		}
	}

	if (
		contentType === null
		|| contentType.type !== "application/json"
		|| (
			"charset" in contentType.parameters
			&& contentType.parameters["charset"].toLowerCase() !== "utf-8"
		)
	) {
		throw new FExceptionInvalidOperation("Wrong operation. The property available only for UTF-8 'application/json' content type.");
	}

	const friendlyBody: Buffer = body instanceof Buffer ? body : Buffer.from(body);

	return JSON.parse(friendlyBody.toString("utf-8"));
}
