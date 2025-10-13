import { FCancellationException } from "../cancellation/index.js";
import { FException, FExceptionAggregate } from "../exception/index.js";
import { FExecutionContext } from "../execution_context/index.js";

import { FChannelEvent } from "./f_channel_event.js";

export class FChannelEventBase<
	TData = Uint8Array,
	TEvent extends FChannelEvent.Event<TData> = FChannelEvent.Event<TData>> implements FChannelEvent<TData, TEvent> {
	private _callbacks?: Array<FChannelEvent.Callback<TData, TEvent>>;

	public addHandler(cb: FChannelEvent.Callback<TData, TEvent>): void {
		if (this._callbacks === undefined) { this._callbacks = []; }

		this._callbacks.push(cb);
		if (this._callbacks.length === 1) {
			this.onAddFirstHandler();
		}
	}

	public removeHandler(cb: FChannelEvent.Callback<TData, TEvent>): void {
		if (this._callbacks === undefined) { return; }
		const index = this._callbacks.indexOf(cb);
		if (index !== -1) {
			this._callbacks.splice(index, 1);
			if (this._callbacks.length === 0) {
				this.onRemoveLastHandler();
			}
		}
	}

	protected constructor() {
		this._callbacks = [];
	}

	protected notify(executionContext: FExecutionContext, event: TEvent): Promise<void> {
		if (this._callbacks === undefined || this._callbacks.length === 0) {
			return Promise.resolve();
		}

		const callbacks = this._callbacks.slice();
		if (callbacks.length === 1) {
			const callback = callbacks[0]!;
			return callback(executionContext, event);
		}
		const promises: Array<Promise<void>> = [];
		const errors: Array<FException> = [];
		for (const callback of callbacks) {
			try {
				const result: Promise<void> = callback(executionContext, event);
				promises.push(result);
			} catch (e) {
				const ex = FException.wrapIfNeeded(e);
				errors.push(ex);
			}
		}

		if (promises.length === 1 && errors.length === 0) {
			return promises[0]!;
		} else if (promises.length > 0) {
			return Promise
				.all(promises.map(function (p: Promise<void>) {
					return p.catch(function (e: unknown) {
						const ex = FException.wrapIfNeeded(e);
						errors.push(ex);
					});
				}))
				.then(function () {
					if (errors.length > 0) {
						for (const error of errors) {
							if (!(error instanceof FCancellationException)) {
								throw new FExceptionAggregate(errors);
							}
						}
						// So, all errors are FCancellationException instances, throw first
						throw errors[0];
					}
				});
		} else {
			if (errors.length > 0) {
				for (const error of errors) {
					if (!(error instanceof FCancellationException)) {
						throw new FExceptionAggregate(errors);
					}
				}
				// So, all errors are FCancellationException instances, throw first
				throw errors[0];
			} else {
				return Promise.resolve();
			}
		}

	}

	protected get hasSubscribers(): boolean { return this._callbacks !== undefined && this._callbacks.length > 0; }
	protected onAddFirstHandler(): void { /* NOP */ }
	protected onRemoveLastHandler(): void { /* NOP */ }
}
