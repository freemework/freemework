import { FCancellationToken } from "../cancellation/FCancellationToken";
import { FCancellationTokenAggregated } from "../cancellation/FCancellationTokenAggregated";
import { FExecutionContext, FExecutionContextBase, FExecutionElement } from "./FExecutionContext";

export class FExecutionContextCancellation extends FExecutionContextBase {
	private readonly _cancellationToken: FCancellationToken;

	public static of(context: FExecutionContext): FExecutionElementCancellation {
		const cancellationExecutionContext: FExecutionContextCancellation
			= FExecutionContextBase.getChainExecutionContext(context, FExecutionContextCancellation);

		return new FExecutionElementCancellation(cancellationExecutionContext);
	}

	public constructor(
		prevContext: FExecutionContext,
		cancellationToken: FCancellationToken,
		isAggregateWithPrev: boolean = false
	) {
		super(prevContext);

		if (isAggregateWithPrev) {
			const prev: FExecutionContextCancellation | null = FExecutionContext
				.findChainExecutionContext(prevContext, FExecutionContextCancellation);
			if (prev !== null) {
				this._cancellationToken = new FCancellationTokenAggregated(cancellationToken, prev.cancellationToken);
				return;
			}
		}

		this._cancellationToken = cancellationToken;
	}

	public get cancellationToken(): FCancellationToken { return this._cancellationToken; }
}

export class FExecutionElementCancellation<TFExecutionContextCancellation
	extends FExecutionContextCancellation = FExecutionContextCancellation>
	extends FExecutionElement<TFExecutionContextCancellation> {
	public get cancellationToken(): FCancellationToken { return this.owner.cancellationToken; }
}
