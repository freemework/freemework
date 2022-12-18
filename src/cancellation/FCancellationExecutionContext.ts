import { FCancellationToken } from "../cancellation/FCancellationToken";
import { FCancellationTokenAggregated } from "../cancellation/FCancellationTokenAggregated";

import { FExecutionContext, FExecutionElement } from "../execution_context/FExecutionContext";
import { FExecutionContextBase } from "../execution_context/FExecutionContextBase";

export class FCancellationExecutionContext extends FExecutionContextBase {
	private readonly _cancellationToken: FCancellationToken;

	public get cancellationToken(): FCancellationToken { return this._cancellationToken; }

	public static of(context: FExecutionContext): FCancellationExecutionElement {
		const cancellationExecutionContext: FCancellationExecutionContext =
			FExecutionContext.getExecutionContext<FCancellationExecutionContext>(
				context, FCancellationExecutionContext);

		return new FCancellationExecutionElement(cancellationExecutionContext);
	}

	public constructor(
		prevContext: FExecutionContext,
		cancellationToken: FCancellationToken,
		isAggregateWithPrev: boolean = false
	) {
		super(prevContext);

		if (isAggregateWithPrev) {
			const prev: FCancellationExecutionContext | null = FExecutionContext
				.findExecutionContext(prevContext, FCancellationExecutionContext);
			if (prev !== null) {
				this._cancellationToken = new FCancellationTokenAggregated(cancellationToken, prev.cancellationToken);
				return;
			}
		}

		this._cancellationToken = cancellationToken;
	}
}
export class FCancellationExecutionElement<TFExecutionContextCancellation
	extends FCancellationExecutionContext = FCancellationExecutionContext>
	extends FExecutionElement<TFExecutionContextCancellation> {
	public get cancellationToken(): FCancellationToken { return this.owner.cancellationToken; }
}
