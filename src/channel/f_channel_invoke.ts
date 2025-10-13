import { FExecutionContext } from "../execution_context/index.js";

/** Define some kind of a transport for RPC implementations */
export interface FChannelInvoke<TIn, TOut> {
	invoke(executionContext: FExecutionContext, args: TIn): Promise<TOut>;
}
