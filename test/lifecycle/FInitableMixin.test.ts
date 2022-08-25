import { assert } from "chai";

import { FExecutionContext, FInitable, FInitableMixin } from "../../src";

interface Deferred<T = any> {
	resolve: (value?: T) => void;
	reject: (err: any) => void;
	promise: Promise<T>;
}
namespace Deferred {
	export function create<T = void>(): Deferred<T> {
		const deferred: any = {};
		deferred.promise = new Promise<void>((r, j) => {
			deferred.resolve = r;
			deferred.reject = j;
		});
		return deferred;
	}
}
async function nextThreeTicks(): Promise<void> {
	await new Promise<void>(resolve => process.nextTick(resolve));
	await new Promise<void>(resolve => process.nextTick(resolve));
	await new Promise<void>(resolve => process.nextTick(resolve));
}


describe("FInitable tests", function () {

	let onInitPromise: Promise<void> | null = null;
	let onDisposePromise: Promise<void> | null = null;

	class TestInitable implements FInitable {
		public throwIfDisposed() {
			this.verifyNotDisposed();
		}
		public throwIfNotInitializedOrDisposed() {
			this.verifyInitializedAndNotDisposed();
		}
		public throwIfNotInitialized() {
			this.verifyInitialized();
		}

		protected onInit(): void | Promise<void> {
			if (onInitPromise) {
				return onInitPromise;
			}
		}

		protected onDispose(): void | Promise<void> {
			if (onDisposePromise) {
				return onDisposePromise;
			}
		}
	}
	interface TestInitable extends FInitableMixin { }
	FInitableMixin.applyMixin(TestInitable);

	it("Positive test onInit(): void and onDispose(): void", async function () {
		const disposable = new TestInitable();
		assert.isFalse(disposable.initialized);
		assert.isFalse(disposable.initializing);
		assert.isFalse(disposable.disposed);
		assert.isFalse(disposable.disposing);

		disposable.throwIfDisposed(); // should not raise an error
		assert.throw(() => disposable.throwIfNotInitialized()); // should raise an error
		assert.throw(() => disposable.throwIfNotInitializedOrDisposed()); // should raise an error

		const initPromise = disposable.init(FExecutionContext.Empty);

		assert.isTrue(disposable.initialized);
		assert.isFalse(disposable.initializing);
		assert.isFalse(disposable.disposed);
		assert.isFalse(disposable.disposing);

		disposable.throwIfDisposed(); // should not raise an error
		disposable.throwIfNotInitialized(); // should not raise an error
		disposable.throwIfNotInitializedOrDisposed(); // should not raise an error

		await nextThreeTicks();

		disposable.throwIfDisposed(); // should not raise an error
		disposable.throwIfNotInitialized(); // should not raise an error
		disposable.throwIfNotInitializedOrDisposed(); // should not raise an error

		assert.isTrue(disposable.initialized);
		assert.isFalse(disposable.initializing);
		assert.isFalse(disposable.disposed);
		assert.isFalse(disposable.disposing);

		await initPromise;

		disposable.throwIfDisposed(); // should not raise an error
		disposable.throwIfNotInitialized(); // should not raise an error
		disposable.throwIfNotInitializedOrDisposed(); // should not raise an error

		assert.isTrue(disposable.initialized);
		assert.isFalse(disposable.initializing);
		assert.isFalse(disposable.disposed);
		assert.isFalse(disposable.disposing);

		const disposePromise = disposable.dispose();

		disposable.throwIfNotInitialized(); // should not raise an error
		assert.throw(() => disposable.throwIfDisposed());
		assert.throw(() => disposable.throwIfNotInitializedOrDisposed());

		assert.isTrue(disposable.initialized);
		assert.isFalse(disposable.initializing);
		assert.isTrue(disposable.disposed);
		assert.isFalse(disposable.disposing);
	});

	it("Positive test onInit(): void and onDispose(): Promise<void>", async function () {
		const disposable = new TestInitable();
		assert.isFalse(disposable.initialized);
		assert.isFalse(disposable.initializing);
		assert.isFalse(disposable.disposed);
		assert.isFalse(disposable.disposing);

		disposable.throwIfDisposed(); // should not raise an error
		assert.throw(() => disposable.throwIfNotInitialized()); // should raise an error
		assert.throw(() => disposable.throwIfNotInitializedOrDisposed()); // should raise an error

		const initPromise = disposable.init(FExecutionContext.Empty);

		assert.isTrue(disposable.initialized);
		assert.isFalse(disposable.initializing);
		assert.isFalse(disposable.disposed);
		assert.isFalse(disposable.disposing);

		disposable.throwIfDisposed(); // should not raise an error
		disposable.throwIfNotInitialized(); // should not raise an error
		disposable.throwIfNotInitializedOrDisposed(); // should not raise an error

		await nextThreeTicks();

		disposable.throwIfDisposed(); // should not raise an error
		disposable.throwIfNotInitialized(); // should not raise an error
		disposable.throwIfNotInitializedOrDisposed(); // should not raise an error

		assert.isTrue(disposable.initialized);
		assert.isFalse(disposable.initializing);
		assert.isFalse(disposable.disposed);
		assert.isFalse(disposable.disposing);

		await initPromise;

		const defer = Deferred.create();
		onDisposePromise = defer.promise;
		try {
			let disposablePromiseResolved = false;
			const disposablePromise = disposable.dispose().then(() => { disposablePromiseResolved = true; });

			assert.isFalse(disposablePromiseResolved);
			assert.throw(() => disposable.throwIfNotInitializedOrDisposed());
			assert.throw(() => disposable.throwIfDisposed());

			await nextThreeTicks();

			assert.isFalse(disposablePromiseResolved);
			assert.throw(() => disposable.throwIfNotInitializedOrDisposed());
			assert.throw(() => disposable.throwIfDisposed());

			assert.isTrue(disposable.initialized);
			assert.isFalse(disposable.initializing);
			assert.isFalse(disposable.disposed);
			assert.isTrue(disposable.disposing);

			let secondDisposablePromiseResolved = false;
			disposable.dispose().then(() => { secondDisposablePromiseResolved = true; });

			assert.isFalse(secondDisposablePromiseResolved);

			await nextThreeTicks();

			assert.isFalse(disposablePromiseResolved);
			assert.isFalse(secondDisposablePromiseResolved);
			assert.throw(() => disposable.throwIfNotInitializedOrDisposed());
			assert.throw(() => disposable.throwIfDisposed());
			assert.isTrue(disposable.initialized);
			assert.isFalse(disposable.initializing);
			assert.isFalse(disposable.disposed);
			assert.isTrue(disposable.disposing);

			defer.resolve();

			assert.isFalse(disposablePromiseResolved);
			assert.isFalse(secondDisposablePromiseResolved);
			assert.throw(() => disposable.throwIfNotInitializedOrDisposed());
			assert.throw(() => disposable.throwIfDisposed());

			await nextThreeTicks();

			assert.isTrue(disposablePromiseResolved);
			assert.isTrue(secondDisposablePromiseResolved);
			assert.throw(() => disposable.throwIfNotInitializedOrDisposed());
			assert.throw(() => disposable.throwIfDisposed());

			assert.isTrue(disposable.disposed);
			assert.isFalse(disposable.disposing);

			let thirdDisposablePromiseResolved = false;
			disposable.dispose().then(() => { thirdDisposablePromiseResolved = true; });
			assert.isFalse(thirdDisposablePromiseResolved);
			await nextThreeTicks();
			assert.isTrue(thirdDisposablePromiseResolved);
		} finally {
			onDisposePromise = null;
		}
	});

	it("Positive test onInit(): Promise<void> and onDispose(): void", async function () {
		const defer = Deferred.create();
		onInitPromise = defer.promise;
		try {
			const disposable = new TestInitable();
			assert.isFalse(disposable.initialized);
			assert.isFalse(disposable.initializing);
			assert.isFalse(disposable.disposed);
			assert.isFalse(disposable.disposing);

			disposable.throwIfDisposed(); // should not raise an error
			assert.throw(() => disposable.throwIfNotInitialized()); // should raise an error
			assert.throw(() => disposable.throwIfNotInitializedOrDisposed()); // should raise an error

			const initPromise = disposable.init(FExecutionContext.Empty);

			assert.isFalse(disposable.initialized);
			assert.isTrue(disposable.initializing);
			assert.isFalse(disposable.disposed);
			assert.isFalse(disposable.disposing);

			defer.resolve();

			assert.isFalse(disposable.initialized);
			assert.isTrue(disposable.initializing);
			assert.isFalse(disposable.disposed);
			assert.isFalse(disposable.disposing);

			const disposablePromise = disposable.dispose();

			await nextThreeTicks();

			assert.isTrue(disposable.initialized);
			assert.isFalse(disposable.initializing);
			assert.isTrue(disposable.disposed);
			assert.isFalse(disposable.disposing);
		} finally {
			onInitPromise = null;
		}
	});

	it("Positive test onInit(): Promise<void> and onDispose(): Promise<void>", async function () {
		const disposable = new TestInitable();
		assert.isFalse(disposable.disposed);
		assert.isFalse(disposable.disposing);

		disposable.throwIfDisposed(); // should not raise an error

		const initDefer = Deferred.create();
		const disposeDefer = Deferred.create();
		onInitPromise = initDefer.promise;
		onDisposePromise = disposeDefer.promise;
		try {
			let initablePromiseResolved = false;
			let disposablePromiseResolved = false;
			const initablePromise = disposable.init(FExecutionContext.Empty).then(() => { initablePromiseResolved = true; });
			const disposablePromise = disposable.dispose().then(() => { disposablePromiseResolved = true; });

			assert.isFalse(initablePromiseResolved);
			assert.isFalse(disposablePromiseResolved);
			assert.throw(() => disposable.throwIfDisposed());

			await nextThreeTicks();

			assert.isFalse(initablePromiseResolved);
			assert.isFalse(disposablePromiseResolved);
			assert.throw(() => disposable.throwIfDisposed());

			assert.isFalse(disposable.initialized);
			assert.isFalse(disposable.disposed);
			assert.isTrue(disposable.initializing);
			assert.isTrue(disposable.disposing);

			let secondDisposablePromiseResolved = false;
			disposable.dispose().then(() => { secondDisposablePromiseResolved = true; });

			assert.isFalse(secondDisposablePromiseResolved);

			await nextThreeTicks();

			assert.isFalse(disposablePromiseResolved);
			assert.isFalse(secondDisposablePromiseResolved);
			assert.throw(() => disposable.throwIfDisposed());
			assert.isFalse(disposable.disposed);
			assert.isTrue(disposable.disposing);

			initDefer.resolve();
			disposeDefer.resolve();

			assert.isFalse(disposablePromiseResolved);
			assert.isFalse(secondDisposablePromiseResolved);
			assert.throw(() => disposable.throwIfDisposed());

			await nextThreeTicks();

			assert.isTrue(disposablePromiseResolved);
			assert.isTrue(secondDisposablePromiseResolved);
			assert.throw(() => disposable.throwIfDisposed());

			assert.isTrue(disposable.disposed);
			assert.isFalse(disposable.disposing);

			let thirdDisposablePromiseResolved = false;
			disposable.dispose().then(() => { thirdDisposablePromiseResolved = true; });
			assert.isFalse(thirdDisposablePromiseResolved);
			await nextThreeTicks();
			assert.isTrue(thirdDisposablePromiseResolved);
		} finally {
			onDisposePromise = null;
		}
	});

	it("Positive test onDispose(): void", async function () {
		const disposable = new TestInitable();
		assert.isFalse(disposable.disposed);
		assert.isFalse(disposable.disposing);

		disposable.throwIfDisposed(); // should not raise an error

		const disposablePromise = disposable.dispose();

		assert.isTrue(disposable.disposed);
		assert.isFalse(disposable.disposing);

		assert.throw(() => disposable.throwIfDisposed());

		await nextThreeTicks();

		assert.throw(() => disposable.throwIfDisposed());

		assert.isTrue(disposable.disposed);
		assert.isFalse(disposable.disposing);

		await disposablePromise;

		assert.throw(() => disposable.throwIfDisposed());

		assert.isTrue(disposable.disposed);
		assert.isFalse(disposable.disposing);
	});

	it("Twice call of init()", async function () {
		onInitPromise = Promise.resolve();

		const disposable = new TestInitable();

		const initPromise1 = disposable.init(FExecutionContext.Empty);

		await nextThreeTicks();

		disposable.throwIfDisposed(); // should not raise an error
		disposable.throwIfNotInitialized(); // should not raise an error
		disposable.throwIfNotInitializedOrDisposed(); // should not raise an error

		assert.isTrue(disposable.initialized);
		assert.isFalse(disposable.initializing);
		assert.isFalse(disposable.disposed);
		assert.isFalse(disposable.disposing);

		await initPromise1;

		disposable.throwIfDisposed(); // should not raise an error
		disposable.throwIfNotInitialized(); // should not raise an error
		disposable.throwIfNotInitializedOrDisposed(); // should not raise an error

		assert.isTrue(disposable.initialized);
		assert.isFalse(disposable.initializing);
		assert.isFalse(disposable.disposed);
		assert.isFalse(disposable.disposing);

		let isSuccessed = false;
		const initPromise2 = disposable.init(FExecutionContext.Empty).finally(() => { isSuccessed = true; });
		await nextThreeTicks();
		assert.isTrue(isSuccessed);
		await initPromise2;
		await disposable.dispose();
	});

	it("Should throw error from init()", async function () {
		class MyInitable implements FInitable {
			protected onInit(): Promise<void> { return Promise.reject(new Error("test error")); }
			protected onDispose(): Promise<void> { return Promise.resolve(); }
		}
		interface MyInitable extends FInitableMixin { }
		FInitableMixin.applyMixin(MyInitable);

		const initable = new MyInitable();

		let expectedError: any = null;
		try {
			await initable.init(FExecutionContext.Empty);
		} catch (e) {
			expectedError = e;
		}

		assert.isNotNull(expectedError);
		assert.instanceOf(expectedError, Error);
		assert.equal((expectedError as Error).message, "test error");
	});

	it("Should throw error from dispose()", async function () {
		class MyInitable implements FInitable {
			protected onInit(): Promise<void> { return Promise.resolve(); }
			protected onDispose(): Promise<void> { return Promise.reject(new Error("test error")); }
		}
		interface MyInitable extends FInitableMixin { }
		FInitableMixin.applyMixin(MyInitable);

		const initable = new MyInitable();

		await initable.init(FExecutionContext.Empty);

		let expectedError: any = null;
		try {
			await initable.dispose();
		} catch (e) {
			expectedError = e;
		}

		assert.isNotNull(expectedError);
		assert.instanceOf(expectedError, Error);
		assert.equal((expectedError as Error).message, "test error");
	});

	// it("Should execute and wait for initable and disposable tasks", async function () {
	// 	let onInitTaskCalled = false;
	// 	let onDisposeTaskCalled = false;

	// 	const onInitTask: Promise<void> = Task.create(() => {
	// 		onInitTaskCalled = true;
	// 	});
	// 	const onDisposeTask: Promise<void> = Task.create(() => {
	// 		onDisposeTaskCalled = true;
	// 	});

	// 	class MyInitable extends FInitable {
	// 		protected onInit(): Promise<void> { return onInitTask; }
	// 		protected onDispose(): Promise<void> { return onDisposeTask; }
	// 	}

	// 	const initable = new MyInitable();

	// 	await initable.init();
	// 	assert.isTrue(onInitTaskCalled, "init() should execute init task");

	// 	await initable.dispose();
	// 	assert.isTrue(onDisposeTaskCalled, "dispose() should execute dispose task");
	// });

	// it("Should execute and wait for initable and disposable tasks if called both init() + dispose()", async function () {
	// 	let onInitTaskCalled = false;
	// 	let onDisposeTaskCalled = false;

	// 	const onInitTask: cryptopay.Task = Task.create(() => {
	// 		onInitTaskCalled = true;
	// 	});
	// 	const onDisposeTask: cryptopay.Task = Task.create(() => {
	// 		onDisposeTaskCalled = true;
	// 	});

	// 	class MyInitable extends FInitable {
	// 		protected onInit(): Promise<void> { return onInitTask; }
	// 		protected onDispose(): Promise<void> { return onDisposeTask; }
	// 	}

	// 	const initable = new MyInitable();

	// 	initable.init(DUMMY_CANCELLATION_TOKEN);
	// 	await initable.dispose();

	// 	assert.isTrue(onInitTaskCalled, "init() should execute init task");
	// 	assert.isTrue(onDisposeTaskCalled, "dispose() should execute dispose task");
	// });
});
