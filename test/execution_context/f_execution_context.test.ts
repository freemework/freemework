import {
	FCancellationTokenAggregated, FCancellationTokenSource, FCancellationTokenSourceManual,
	FCancellationExecutionContext, FCancellationExecutionElement, FCancellationToken,
	FExecutionContext, FExecutionContextBase,
	FLoggerLabelsExecutionContext,
	FLoggerLabelsExecutionElement,
	FLoggerLabel,
} from "../../src/index.js";

import { assert } from "chai";

class MyLoggerLabel extends FLoggerLabel {
	public static readonly LABEL1 = new MyLoggerLabel("test.label1", "Label for unit tests");
	public static readonly LABEL2 = new MyLoggerLabel("test.label2", "Label for unit tests");
	// ...
}


describe("FExecutionContext test", function () {
	it("Empty execution context should NOT have prevContext", function () {
		const emptyCtx: FExecutionContext = FExecutionContext.Empty;
		assert.isNull(emptyCtx.prevContext);
	});

	it("Cancellation execution context should be resolved on head of chain", function () {
		const emptyCtx: FExecutionContext = FExecutionContext.Empty;
		const cancellationCtx: FExecutionContext = new FCancellationExecutionContext(emptyCtx, FCancellationToken.Dummy);

		const element: FCancellationExecutionElement = FCancellationExecutionContext.of(cancellationCtx);
		assert.strictEqual(element.owner, cancellationCtx);
		assert.strictEqual(element.cancellationToken, FCancellationToken.Dummy);
	});

	it("Cancellation execution context should be resolved on chain", function () {
		const emptyCtx: FExecutionContext = FExecutionContext.Empty;
		const cancellationCtx: FExecutionContext = new FCancellationExecutionContext(emptyCtx, FCancellationToken.Dummy);
		const stubCtx = new StubExecutionContext(cancellationCtx);

		const element: FCancellationExecutionElement = FCancellationExecutionContext.of(stubCtx);
		assert.strictEqual(element.owner, cancellationCtx);
		assert.strictEqual(element.cancellationToken, FCancellationToken.Dummy);
	});

	it("Cancellation execution context should aggregate tokens", function () {
		const emptyCtx: FExecutionContext = FExecutionContext.Empty;

		const cts1: FCancellationTokenSource = new FCancellationTokenSourceManual();
		const cts2: FCancellationTokenSource = new FCancellationTokenSourceManual();

		const cancellationCtx1: FExecutionContext = new FCancellationExecutionContext(emptyCtx, cts1.token);
		const cancellationCtx2: FExecutionContext = new FCancellationExecutionContext(cancellationCtx1, cts2.token, true);
		const stubCtx = new StubExecutionContext(cancellationCtx2);

		const element: FCancellationExecutionElement = FCancellationExecutionContext.of(stubCtx);
		assert.strictEqual(element.owner, cancellationCtx2);
		assert.notStrictEqual(element.cancellationToken, cts1.token);
		assert.notStrictEqual(element.cancellationToken, cts2.token);
		assert.instanceOf(element.cancellationToken, FCancellationTokenAggregated);
	});

	it("Logger execution context should be resolved on head of chain", function () {
		const emptyCtx: FExecutionContext = FExecutionContext.Empty;
		const loggerCtx: FExecutionContext = new FLoggerLabelsExecutionContext(emptyCtx,
			MyLoggerLabel.LABEL1.value("test"),
			MyLoggerLabel.LABEL2.value("42"),
		);

		const element: FLoggerLabelsExecutionElement = FLoggerLabelsExecutionContext.of(loggerCtx)!;
		assert.isNotNull(element);
		assert.strictEqual(element.owner, loggerCtx);
		assert.strictEqual(element.loggerLabelValues.length, 2);
		assert.strictEqual(element.loggerLabelValues.find(w => w.label === MyLoggerLabel.LABEL1)!.value, "test");
		assert.strictEqual(element.loggerLabelValues.find(w => w.label === MyLoggerLabel.LABEL2)!.value, "42");
	});

	it("Logger execution context should be resolved on chain", function () {
		const emptyCtx: FExecutionContext = FExecutionContext.Empty;
		const loggerCtx1: FExecutionContext = new FLoggerLabelsExecutionContext(emptyCtx,
			MyLoggerLabel.LABEL1.value("test"),
			MyLoggerLabel.LABEL2.value("42"),
		);
		const loggerCtx2: FExecutionContext = new FLoggerLabelsExecutionContext(loggerCtx1,
			MyLoggerLabel.LABEL1.value("test"),
			MyLoggerLabel.LABEL2.value("43"),
		);
		const stubCtx = new StubExecutionContext(loggerCtx2);

		const element: FLoggerLabelsExecutionElement = FLoggerLabelsExecutionContext.of(stubCtx)!;
		assert.isNotNull(element);
		assert.strictEqual(element.owner, loggerCtx2);

		assert.strictEqual(element.loggerLabelValues.length, 2);
		assert.strictEqual(element.loggerLabelValues.find(w => w.label === MyLoggerLabel.LABEL1)!.value, "test");
		assert.strictEqual(element.loggerLabelValues.find(w => w.label === MyLoggerLabel.LABEL2)!.value, "42");
	});
});

class StubExecutionContext extends FExecutionContextBase {
}
