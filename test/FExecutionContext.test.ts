import {
	FCancellationTokenAggregated, FCancellationTokenSource, FCancellationTokenSourceManual,
	FExecutionContextCancellation, FExecutionElementCancellation, FCancellationToken,
	FExecutionContext, FExecutionContextBase, FLogger,
	FExecutionContextLogger, FExecutionElementLogger
} from "../src/index";

import { assert } from "chai";

describe("FExecutionContext test", function () {
	it("Empty execution context should NOT have prevContext", function () {
		const emptyCtx: FExecutionContext = FExecutionContext.Empty;
		assert.isNull(emptyCtx.prevContext);
	});

	it("Cancellation execution context should be resolved on head of chain", function () {
		const emptyCtx: FExecutionContext = FExecutionContext.Empty;
		const cancellationCtx: FExecutionContext = new FExecutionContextCancellation(emptyCtx, FCancellationToken.None);

		const element: FExecutionElementCancellation = FExecutionContextCancellation.of(cancellationCtx);
		assert.strictEqual(element.owner, cancellationCtx);
		assert.strictEqual(element.cancellationToken, FCancellationToken.None);
	});

	it("Cancellation execution context should be resolved on chain", function () {
		const emptyCtx: FExecutionContext = FExecutionContext.Empty;
		const cancellationCtx: FExecutionContext = new FExecutionContextCancellation(emptyCtx, FCancellationToken.None);
		const stubCtx = new StubExecutionContext(cancellationCtx);

		const element: FExecutionElementCancellation = FExecutionContextCancellation.of(stubCtx);
		assert.strictEqual(element.owner, cancellationCtx);
		assert.strictEqual(element.cancellationToken, FCancellationToken.None);
	});

	it("Cancellation execution context should aggregate tokens", function () {
		const emptyCtx: FExecutionContext = FExecutionContext.Empty;

		const cts1: FCancellationTokenSource = new FCancellationTokenSourceManual();
		const cts2: FCancellationTokenSource = new FCancellationTokenSourceManual();

		const cancellationCtx1: FExecutionContext = new FExecutionContextCancellation(emptyCtx, cts1.token);
		const cancellationCtx2: FExecutionContext = new FExecutionContextCancellation(cancellationCtx1, cts2.token, true);
		const stubCtx = new StubExecutionContext(cancellationCtx2);

		const element: FExecutionElementCancellation = FExecutionContextCancellation.of(stubCtx);
		assert.strictEqual(element.owner, cancellationCtx2);
		assert.notStrictEqual(element.cancellationToken, cts1.token);
		assert.notStrictEqual(element.cancellationToken, cts2.token);
		assert.instanceOf(element.cancellationToken, FCancellationTokenAggregated);
	});

	it("Logger execution context should be resolved on head of chain", function () {
		const emptyCtx: FExecutionContext = FExecutionContext.Empty;
		const loggerCtx: FExecutionContext = new FExecutionContextLogger(emptyCtx, FLogger.None);

		const element: FExecutionElementLogger = FExecutionContextLogger.of(loggerCtx);
		assert.strictEqual(element.owner, loggerCtx);
		assert.strictEqual(element.logger, FLogger.None);
	});

	it("Logger execution context should be resolved on chain", function () {
		const emptyCtx: FExecutionContext = FExecutionContext.Empty;
		const loggerCtx: FExecutionContext = new FExecutionContextLogger(emptyCtx, FLogger.None);
		const stubCtx = new StubExecutionContext(loggerCtx);

		const element: FExecutionElementLogger = FExecutionContextLogger.of(stubCtx);
		assert.strictEqual(element.owner, loggerCtx);
		assert.strictEqual(element.logger, FLogger.None);
	});

	it("Logger execution context should instantiate from logger context", function () {
		const emptyCtx: FExecutionContext = FExecutionContext.Empty;
		const loggerCtx: FExecutionContext = new FExecutionContextLogger(emptyCtx, FLogger.None);
		const loggerWithPropertiesCtx: FExecutionContext = new FExecutionContextLogger(loggerCtx, "TestLogger", { "data": "42" });
		const stubCtx = new StubExecutionContext(loggerWithPropertiesCtx);

		const element: FExecutionElementLogger = FExecutionContextLogger.of(stubCtx);
		assert.strictEqual(element.owner, loggerWithPropertiesCtx);
		assert.notStrictEqual(element.logger, FLogger.None, "Logger should be changed by instastiation second FExecutionContextLogger");
		assert.deepEqual(element.logger.context, { "data": "42" });
	});

	it("Logger execution context should merge logger contexts", function () {
		const emptyCtx: FExecutionContext = FExecutionContext.Empty;
		const loggerCtx: FExecutionContext = new FExecutionContextLogger(emptyCtx, FLogger.None);
		const loggerWithPropertiesCtx1: FExecutionContext = new FExecutionContextLogger(loggerCtx, "TestLogger", { "data": "42" });
		const loggerWithPropertiesCtx2: FExecutionContext = new FExecutionContextLogger(loggerWithPropertiesCtx1, "TestLogger", { "data": "43", "data2": 42 });
		const stubCtx = new StubExecutionContext(loggerWithPropertiesCtx2);

		const element: FExecutionElementLogger = FExecutionContextLogger.of(stubCtx);
		assert.strictEqual(element.owner, loggerWithPropertiesCtx2);
		assert.notStrictEqual(element.logger, FLogger.None, "Logger should be changed by instastiation second FExecutionContextLogger");
		assert.deepEqual(element.logger.context, { "data": "43", "data2": 42 });
	});
});

class StubExecutionContext extends FExecutionContextBase {
}