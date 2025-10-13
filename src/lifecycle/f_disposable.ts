import { FException, FExceptionAggregate, FExceptionInvalidOperation } from "../exception/index.js";

import "./tc39.js";

export abstract class FDisposable {
	public async [Symbol.asyncDispose](): Promise<void> {
		await this.dispose();
	}

	public abstract dispose(): Promise<void>;

	public static async disposeAll(...instances: ReadonlyArray<FDisposable>): Promise<void> {
		const innerExceptions: Array<FException> = [];
		for (const instance of instances) {
			try {
				await instance.dispose();
			} catch (e) {
				innerExceptions.push(FException.wrapIfNeeded(e));
			}
		}
		FExceptionAggregate.throwIfNeeded(innerExceptions);
	}

	public static instanceOf(test: unknown): test is FDisposable {
		if (test instanceof FDisposable) {
			return true;
		}

		if (
			typeof test === "object"
			&& test !== null // {}
			&& "dispose" in test // { init: ... }
			&& typeof test.dispose === "function" // { dispose: function(...) {} }
			&& test.dispose.length === 0 // { dispose: function() {} }
		) {
			return true;
		}

		return false;
	}
}

export abstract class FDisposableBase extends FDisposable {
	private _disposed?: boolean;
	private _disposingPromise?: Promise<void>;

	public get disposed(): boolean { return this._disposed === true; }
	public get disposing(): boolean { return this._disposingPromise !== undefined; }

	public dispose(): Promise<void> {
		if (this._disposed !== true) {
			if (this._disposingPromise === undefined) {
				this._disposingPromise = Promise.resolve();
				const onDisposeResult = this.onDispose();
				if (onDisposeResult instanceof Promise) {
					this._disposingPromise = this._disposingPromise
						.then(() => onDisposeResult)
						.finally(() => {
							delete this._disposingPromise;
							this._disposed = true;
						});
					return this._disposingPromise;
				} else {
					this._disposed = true;
					delete this._disposingPromise;
				}
			} else {
				return this._disposingPromise;
			}
		}
		return Promise.resolve();
	}

	protected abstract onDispose(): void | Promise<void>;

	protected verifyNotDisposed() {
		if (this.disposed || this.disposing) {
			throw new Error("Wrong operation on disposed object");
		}
	}
}

export class FDisposableMixin extends FDisposableBase {
	public static applyMixin(targetClass: any): void {
		let sourceType = FDisposableBase;
		while (sourceType.prototype !== undefined) {
			Object.getOwnPropertySymbols(sourceType.prototype).forEach(name => {
				const propertyDescriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(sourceType.prototype, name);

				if (propertyDescriptor !== undefined) {
					Object.defineProperty(targetClass.prototype, name, propertyDescriptor);
				}
			});

			Object.getOwnPropertyNames(sourceType.prototype).forEach(name => {

				if (name === "constructor") {
					// Skip constructor
					return;
				}

				const propertyDescriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(sourceType.prototype, name);

				if (propertyDescriptor !== undefined) {
					Object.defineProperty(targetClass.prototype, name, propertyDescriptor);
				}
			});

			sourceType = Object.getPrototypeOf(sourceType);
		}

		Object.getOwnPropertyNames(FDisposableMixin.prototype).forEach(name => {

			if (name === "constructor") {
				// Skip constructor
				return;
			}

			const propertyDescriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(FDisposableMixin.prototype, name);

			if (name === "onDispose") {
				// Add NOP methods into mixed only if it not implements its
				if (propertyDescriptor !== undefined) {
					const existingPropertyDescriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(targetClass.prototype, name);
					if (existingPropertyDescriptor === undefined) {
						Object.defineProperty(targetClass.prototype, name, propertyDescriptor);
					}
				}
				return;
			}

			if (propertyDescriptor !== undefined) {
				Object.defineProperty(targetClass.prototype, name, propertyDescriptor);
			}
		});
	}

	protected onDispose(): void | Promise<void> {
		// Do nothing here by design. Users will override this method.
	}

	private constructor() {
		super();
		// Never called, due mixin
		// Private constructor has two kinds of responsibility
		// 1) Restrict to extends the mixin
		// 2) Restrict to make instances of the mixin
		throw new FExceptionInvalidOperation("Private constructor");
	}
}

class FDisposableAdapter extends FDisposable {
	public constructor(
		private readonly _dispose: () => void | Promise<void>) {
		super();
	}

	public override async dispose(): Promise<void> {
		await this._dispose();
	}
}
export function makeDisposable(dispose: () => void | Promise<void>): FDisposable {
	return new FDisposableAdapter(dispose);
}
