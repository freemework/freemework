import { FExecutionContext } from "../execution_context/index.js";

/** Define some kind of Publish-Subscribe pattern. See https://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern */
export interface FChannelPublisher<TData> {
	send(executionContext: FExecutionContext, data: TData): Promise<void>;
}
