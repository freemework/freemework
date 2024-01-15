import { FCancellationException } from "../cancellation/index.js";
import { FException, FExceptionAggregate } from "../exception/index.js";
import { FExecutionContext } from "../execution_context/index.js";

import { FChannelEvent } from "./FChannelEvent.js";

export class FChannelEventMixin<
	TData = Uint8Array,
	TEvent extends FChannelEvent.Event<TData> = FChannelEvent.Event<TData>> implements FChannelEvent<TData, TEvent> {
	private __callbacks?: Array<FChannelEvent.Callback<TData, TEvent>>;

	public static applyMixin(targetClass: any): void {
		Object.getOwnPropertyNames(FChannelEventMixin.prototype).forEach(name => {
			const propertyDescr = Object.getOwnPropertyDescriptor(FChannelEventMixin.prototype, name);

			if (name === "constructor") {
				// Skip constructor
				return;
			}
			if (name === "onAddFirstHandler" || name === "onRemoveLastHandler") {
				// Add NOP methods into mixed only if it not implements its
				if (propertyDescr !== undefined) {
					const existingPropertyDescr = Object.getOwnPropertyDescriptor(targetClass.prototype, name);
					if (existingPropertyDescr === undefined) {
						Object.defineProperty(targetClass.prototype, name, propertyDescr);
					}
				}
				return;
			}

			if (propertyDescr !== undefined) {
				Object.defineProperty(targetClass.prototype, name, propertyDescr);
			}
		});
	}

	public addHandler(cb: FChannelEvent.Callback<TData, TEvent>): void {
		if (this.__callbacks === undefined) { this.__callbacks = []; }

		this.__callbacks.push(cb);
		if (this.__callbacks.length === 1) {
			this.onAddFirstHandler();
		}
	}

	public removeHandler(cb: FChannelEvent.Callback<TData, TEvent>): void {
		if (this.__callbacks === undefined) { return; }
		const index = this.__callbacks.indexOf(cb);
		if (index !== -1) {
			this.__callbacks.splice(index, 1);
			if (this.__callbacks.length === 0) {
				this.onRemoveLastHandler();
			}
		}
	}

	protected notify(executionContext: FExecutionContext, event: TEvent): Promise<void> {
		if (this.__callbacks === undefined || this.__callbacks.length === 0) {
			return Promise.resolve();
		}

		const callbacks = this.__callbacks.slice();
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

	protected get hasSubscribers(): boolean { return this.__callbacks !== undefined && this.__callbacks.length > 0; }
	protected onAddFirstHandler(): void { /* NOP */ }
	protected onRemoveLastHandler(): void { /* NOP */ }

	private constructor() {
		// Never called, due mixin
		// Private constructor has two kinds of responsibility
		// 1) Restrict to extends the mixin
		// 2) Restrict to make instances of the mixin
	}
}