import { FCancellationExecutionContext, FCancellationException, FCancellationToken } from "../cancellation/index.js";
import { FExecutionContext } from "../execution_context/index.js";

/**
 * @deprecated Use `fsleep()` instead
 */
export function FSleep(cancellationToken: FCancellationToken, ms?: number): Promise<void>;
export function FSleep(executionContext: FExecutionContext, ms?: number): Promise<void>;
export function FSleep(data: FExecutionContext | FCancellationToken, ms?: number): Promise<void> {
	return fsleep(data as any, ms);
}

/**
 * Provide a "sleeping" `Promise` that completes via timeout or cancellationToken
 * @param cancellationToken The cancellation token to cancel "sleeping"
 * @param ms Timeout delay in milliseconds. If omitted, the "sleeping" `Promise` will sleep infinitely and wait for cancellation token activation
 * @example
 * await fsleep(FCancellationToken.Dummy, 25); // Suspend execution for 25 milliseconds
 * @example
 * const cancellationTokenSource = new FCancellationTokenSourceManual();
 * ...
 * await fsleep(cancellationTokenSource.token, 25); // Suspend execution for 25 milliseconds or cancel if cancellationTokenSource activates
 * @example
 * const cancellationTokenSource = new FCancellationTokenSourceManual();
 * ...
 * await fsleep(cancellationTokenSource.token); // Suspend infinitely while cancellationTokenSource activates
 * @example
 * const executionContext: FExecutionContext = ...;
 * ...
 * await fsleep(executionContext); // Cancellation token will extracted from execution context
 */
export function fsleep(cancellationToken: FCancellationToken, ms?: number): Promise<void>;
export function fsleep(executionContext: FExecutionContext, ms?: number): Promise<void>;
export function fsleep(data: FExecutionContext | FCancellationToken, ms?: number): Promise<void> {
	const cancellationToken: FCancellationToken = data instanceof FExecutionContext
		? FCancellationExecutionContext.of(data).cancellationToken
		: data;

	return new Promise<void>((resolve, reject) => {
		if (cancellationToken.isCancellationRequested) {
			return reject(new FCancellationException());
		}

		let timeout: NodeJS.Timeout | null = null;

		if (ms !== undefined) {
			function timeoutCallback() {
				cancellationToken.removeCancelListener(cancelCallback);
				return resolve();
			}
			timeout = setTimeout(timeoutCallback, ms);
		}

		function cancelCallback() {
			cancellationToken.removeCancelListener(cancelCallback);
			if (timeout !== null) {
				clearTimeout(timeout);
			}
			return reject(new FCancellationException());
		}

		cancellationToken.addCancelListener(cancelCallback);
	});
}
