import { FDisposable } from "./f_disposable.js";
import { FExecutionContext } from "../execution_context/f_execution_context.js";
import { FException, FExceptionAggregate, FExceptionInvalidOperation } from "../exception/index.js";

import "./tc39.js";

export abstract class FInitable extends FDisposable {
	public abstract init(executionContext: FExecutionContext): Promise<void>;

	public static async initAll(executionContext: FExecutionContext, ...instances: ReadonlyArray<FInitable>): Promise<void> {
		const initializedInstances: Array<FInitable> = [];
		try {
			for (const instance of instances) {
				await instance.init(executionContext);
				initializedInstances.push(instance);
			}
		} catch (initEx) {
			const disposeExs: Array<FException> = [];
			for (const initializedInstance of initializedInstances.reverse()) {
				try {
					await initializedInstance.dispose();
				} catch (disposeEx) {
					disposeExs.push(FException.wrapIfNeeded(disposeEx));
				}
				if (disposeExs.length > 0) {
					throw new FExceptionAggregate([
						FException.wrapIfNeeded(initEx),
						...disposeExs
					]);
				}
			}
			throw initEx;
		}
	}

	public static override instanceOf(test: unknown): test is FInitable {
		if (test instanceof FInitable) {
			return true;
		}

		if (
			typeof test === "object"
			&& test !== null // {}
			&& "init" in test // { init: ... }
			&& typeof test.init === "function" // { init: function(...) {} }
			&& test.init.length === 1 // { init: function(probablyExecutionContext) {} }
		) {
			return true;
		}

		return false;
	}
}

export abstract class FInitableBase extends FInitable {
	private _initialized?: boolean;
	private _initializingPromise?: Promise<void>;
	private _disposed?: boolean;
	private _disposingPromise?: Promise<void>;
	private _initExecutionContext: FExecutionContext | null;

	public get initialized(): boolean { return this._initialized === true; }
	public get initializing(): boolean { return this._initializingPromise !== undefined; }
	public get disposed(): boolean { return this._disposed === true; }
	public get disposing(): boolean { return this._disposingPromise !== undefined; }

	public constructor() {
		super();
		this._initExecutionContext = null;
	}

	public init(executionContext: FExecutionContext): Promise<void> {
		this.verifyNotDisposed();
		if (!this._initialized) {
			if (this._initializingPromise === undefined) {
				this._initExecutionContext = executionContext;
				this._initializingPromise = Promise.resolve();
				const onInitializeResult = this.onInit();
				if (onInitializeResult instanceof Promise) {
					this._initializingPromise = this._initializingPromise
						.then(() => onInitializeResult)
						.finally(() => {
							delete this._initializingPromise;
							this._initialized = true;
						});
					return this._initializingPromise;
				} else {
					this._initialized = true;
					delete this._initializingPromise;
				}
			} else {
				return this._initializingPromise;
			}
		}
		return Promise.resolve();
	}

	public dispose(): Promise<void> {
		if (this._disposed !== true) {
			if (this._disposingPromise === undefined) {
				if (this._initializingPromise !== undefined) {
					this._disposingPromise = this._initializingPromise;
					this._disposingPromise = this._disposingPromise
						.then(() => this.onDispose())
						.finally(() => {
							delete this._disposingPromise;
							this._disposed = true;
						});
					return this._disposingPromise;
				} else {
					this._disposingPromise = Promise.resolve();
					if (this._initialized) {
						const onDisposeResult = this.onDispose();
						if (onDisposeResult instanceof Promise) {
							this._disposingPromise = this._disposingPromise
								.then(() => onDisposeResult)
								.finally(() => {
									delete this._disposingPromise;
									this._disposed = true;
								});
							return this._disposingPromise;
						}
					}
					this._disposed = true;
					delete this._disposingPromise;
				}
			} else {
				return this._disposingPromise;
			}
		}
		return Promise.resolve();
	}

	/**
	 * @remark Defined as property to be able to use inside dispose()
	 */
	protected get initExecutionContext(): FExecutionContext {
		if (!(this.initialized || this.initializing)) {
			throw new Error("Wrong operation. Cannot obtain initExecutionContext before call init().");
		}
		return this._initExecutionContext!;
	}

	/**
	 * Override this method to insert own logic at initialize phase
	 * 
	 * Note: this.initExecutionContext may be used here
	 */
	protected abstract onInit(): void | Promise<void>;

	/**
	 * Override this method to insert own logic at disposing phase
	 * 
	 * Note: this.initExecutionContext may be used here
	 */
	protected abstract onDispose(): void | Promise<void>;

	protected verifyInitialized() {
		if (!this.initialized) {
			throw new Error("Wrong operation on non-initialized object");
		}
	}

	protected verifyNotDisposed() {
		if (this.disposed || this.disposing) {
			throw new Error("Wrong operation on disposed object");
		}
	}

	protected verifyInitializedAndNotDisposed() {
		this.verifyInitialized();
		this.verifyNotDisposed();
	}
}

export class FInitableMixin extends FInitableBase {
	public static applyMixin(targetClass: any): void {
		let sourceType = FInitableBase;
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

		Object.getOwnPropertyNames(FInitableMixin.prototype).forEach(name => {
			if (name === "constructor") {
				// Skip constructor
				return;
			}

			const propertyDescriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(FInitableMixin.prototype, name);

			if (name === "onInit" || name === "onDispose") {
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

	/**
	 * Override this method to insert own logic at initialize phase
	 * 
	 * Note: this.initExecutionContext may be used here
	 */
	protected onInit(): void | Promise<void> {
		// Do nothing here by design. Users will override this method.
	}

	/**
	 * Override this method to insert own logic at disposing phase
	 * 
	 * Note: this.initExecutionContext may be used here
	 */
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
