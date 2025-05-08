import { FExecutionContext, FExecutionElement, FExecutionContextBase } from "../execution_context/f_execution_context.js";

import { FLoggerLabel, FLoggerLabelValue } from "../logging/f_logger_labels.js";

export class FLoggerLabelsExecutionContext extends FExecutionContextBase {
	private readonly _loggerLabelValues: ReadonlyArray<FLoggerLabelValue>;

	public static of(
		executionContext: FExecutionContext
	): FLoggerLabelsExecutionElement | null {
		const loggerCtx: FLoggerLabelsExecutionContext | null = FExecutionContext.findExecutionContext(
			executionContext,
			FLoggerLabelsExecutionContext
		);

		if (loggerCtx === null) { return null; }

		const chain: Array<FLoggerLabelsExecutionContext> = [loggerCtx];
		const prevExecutionContext = loggerCtx.prevContext;
		if (prevExecutionContext != null) {
			chain.push(
				...FExecutionContext
					.listExecutionContexts(
						prevExecutionContext,
						FLoggerLabelsExecutionContext,
					)
			);
		}

		return new FLoggerLabelsExecutionElement(loggerCtx, chain);
	}

	// TODO: make true-readonly set
	public get loggerLabelValues(): ReadonlyArray<FLoggerLabelValue> { return this._loggerLabelValues; }

	public constructor(
		prevContext: FExecutionContext,
		...loggerLabelValues: Array<FLoggerLabelValue>
	) {
		super(prevContext);
		this._loggerLabelValues = Object.freeze([...loggerLabelValues]);
	}
}
export class FLoggerLabelsExecutionElement<
	TExecutionContextLogger extends FLoggerLabelsExecutionContext = FLoggerLabelsExecutionContext>
	extends FExecutionElement<TExecutionContextLogger> {
	public readonly chain: Array<FLoggerLabelsExecutionContext>;

	public constructor(
		owner: TExecutionContextLogger,
		chain: Array<FLoggerLabelsExecutionContext>,
	) {
		super(owner);
		this.chain = chain;
	}

	public get loggerLabelValues(): ReadonlyArray<FLoggerLabelValue> {
		// using reduceRight to take priority for first property in chain.
		const dict = this.chain.reduceRight((p, c) => {
			c.loggerLabelValues.forEach((lv) => {

				if (!p.has(lv.label)) {
					p.set(lv.label, lv);
				}
			});
			return p;
		}, new Map<FLoggerLabel, FLoggerLabelValue>);

		// TODO: make true-readonly set
		return [...dict.values()];
	}
}
