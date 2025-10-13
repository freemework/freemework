import { FExecutionContext } from "../execution_context/index.js";

/**
 * FChannelEvent provides a channel to handle events asynchronously.
 *
 * This is very similar to FChannelSubscriber but callback signature
 * does not accept Exception.
 * In another words: FChannelEvent is unbreakable channel version of FChannelSubscriber.
 */
export interface FChannelEvent<TData, TEvent extends FChannelEvent.Event<TData> = FChannelEvent.Event<TData>> {
	addHandler(cb: FChannelEvent.Callback<TData, TEvent>): void;
	removeHandler(cb: FChannelEvent.Callback<TData, TEvent>): void;
}
export namespace FChannelEvent {
	export interface Event<TData> {
		readonly data: TData;
	}
	export interface Callback<TData, TEvent extends Event<TData> = Event<TData>> {
		(executionContext: FExecutionContext, event: TEvent): Promise<void>;
	}
}
