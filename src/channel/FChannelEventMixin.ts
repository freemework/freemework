import { FChannelEvent } from "./FChannelEvent.js";
import { FChannelEventBase } from "./FChannelEventBase.js";

/**
 * @example
 * //
 * // Following example shown how to use the Mixin class.
 * // SomeEventSource is a general class that extends from another class, so it 
 * // is impossible to inherit FChannelEventImpl (due to not supported class
 * // multiple inheritance). By the way we may use Mixin approach...
 * //
 * class SomeEventSource extends Something {
 *    protected onAddFirstHandler(): void {  } // define in needed
 *    protected onRemoveLastHandler(): void { } // define in needed
 * 
 *    public async someActivity(executionContext: FExecutionContext): Promise<void> {
 *      const eventData: BroadcastMessage = {};
 *      await this.notify(executionContext, { data: eventData }); // Call all registered callbacks.
 *      // Here we guaranteed all consumers processed the message without exceptions.
 *    }
 * }
 * interface SomeEventSource extends FChannelEventMixin<ApplicationPageContext> { }
 * FChannelEventMixin.applyMixin(SomeEventSource);
 */
export class FChannelEventMixin<
	TData = Uint8Array,
	TEvent extends FChannelEvent.Event<TData> = FChannelEvent.Event<TData>
>
	extends FChannelEventBase<TData, TEvent> {
	public static applyMixin(targetClass: any): void {
		Object.getOwnPropertyNames(FChannelEventBase.prototype).forEach(name => {
			const propertyDescriptor = Object.getOwnPropertyDescriptor(FChannelEventBase.prototype, name);

			if (name === "constructor") {
				// Skip constructor
				return;
			}
			if (name === "onAddFirstHandler" || name === "onRemoveLastHandler") {
				// Add NOP methods into mixed only if targetClass does not implement its
				if (propertyDescriptor !== undefined) {
					const existingPropertyDescriptor = Object.getOwnPropertyDescriptor(targetClass.prototype, name);
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

	private constructor() {
		// Never called, due mixin
		// Private constructor has two kinds of responsibility
		// 1) Restrict to extends the mixin
		// 2) Restrict to make instances of the mixin
		super();
	}
}
