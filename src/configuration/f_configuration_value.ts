import { FException } from "../exception/index.js";
import { FDecimal } from "../primitive/index.js";

export abstract class FConfigurationValue {
	/**
	 * Factory constructor
	 */
	public static factory(key: string, value: string | null, sourceURI: URL | null, overridden: FConfigurationValue | null): FConfigurationValue {
		return new _FConfigurationValue(key, value, sourceURI, overridden);
	}

	/**
	 * Configuration source URI.
	 *
	 * See `sourceURI` in `FConfiguration` for details.
	 */
	public abstract get sourceURI(): URL | null;

	/**
	 * Reference to an overridden value in chain configuration.
	 */
	public abstract get overridden(): FConfigurationValue | null;

	/**
	 * Get `true` if value is `null` (configuration key presents but no value)
	 */
	public abstract get isNull(): boolean;

	/**
	 * Key of current value (from root namespace)
	 */
	public abstract get key(): string;

	public abstract get asBase64(): Uint8Array;
	public abstract get asBase64Nullable(): Uint8Array | null;

	public abstract get asBoolean(): boolean;
	public abstract get asBooleanNullable(): boolean | null;

	public abstract get asDateIso8601(): Date;
	public abstract get asDateIso8601Nullable(): Date | null;

	public abstract get asDateTimestamp(): Date;
	public abstract get asDateTimestampNullable(): Date | null;

	public abstract get asDecimal(): FDecimal;
	public abstract get asDecimalNullable(): FDecimal | null;

	public abstract get asInteger(): number;
	public abstract get asIntegerNullable(): number | null;

	public abstract get asIntegerNegative(): number;
	public abstract get asIntegerNegativeNullable(): number | null;

	public abstract get asIntegerPositive(): number;
	public abstract get asIntegerPositiveNullable(): number | null;

	public abstract get asNumber(): number;
	public abstract get asNumberNullable(): number | null;

	/**
	 * Gets value representations as TCP port
	 */
	public abstract get asPortNumber(): number;
	/**
	 * Gets value representations as TCP port or `null` if value empty
	 */
	public abstract get asPortNumberNullable(): number | null;

	public abstract get asString(): string;
	public abstract get asStringNullable(): string | null;

	public abstract get asUrl(): URL;
	public abstract get asUrlNullable(): URL | null;
}

import { FConfigurationValueException } from "./f_configuration_value_exception.js";

class _FConfigurationValue extends FConfigurationValue {
	public get sourceURI(): URL | null { return this._sourceURI; }
	public get overridden(): FConfigurationValue | null { return this._overridden; }
	public get key(): string { return this._key; }

	public get isNull(): boolean { return this._value === null; }

	public get asBase64(): Uint8Array {
		this.assertNotNullValue(this._value, "asBase64");
		return this.fromBase64(this._value);
	}
	public get asBase64Nullable(): Uint8Array | null {
		if (this._value === null) { return null; }
		return this.fromBase64(this._value);
	}
	public get asBoolean(): boolean {
		this.assertNotNullValue(this._value, "asBoolean");
		return this.fromBoolean(this._value);
	}
	public get asBooleanNullable(): boolean | null {
		if (this._value === null) { return null; }
		return this.fromBoolean(this._value);
	}
	public get asDateIso8601(): Date {
		this.assertNotNullValue(this._value, "asDateIso8601");
		return this.fromDateIso8601(this._value);
	}
	public get asDateIso8601Nullable(): Date | null {
		if (this._value === null) { return null; }
		return this.fromDateIso8601(this._value);
	}
	public get asDateTimestamp(): Date {
		this.assertNotNullValue(this._value, "asDateTimestamp");
		return this.fromDateTimestamp(this._value);
	}
	public get asDateTimestampNullable(): Date | null {
		if (this._value === null) { return null; }
		return this.fromDateTimestamp(this._value);
	}
	public get asDecimal(): FDecimal {
		this.assertNotNullValue(this._value, "asDecimal");
		return this.fromDecimal(this._value);
	}
	public get asDecimalNullable(): FDecimal | null {
		if (this._value === null) { return null; }
		return this.fromDecimal(this._value);
	}
	public get asInteger(): number {
		this.assertNotNullValue(this._value, "asInteger");
		return this.fromInteger(this._value);
	}
	public get asIntegerNullable(): number | null {
		if (this._value === null) { return null; }
		return this.fromInteger(this._value);
	}
	public get asIntegerNegative(): number {
		this.assertNotNullValue(this._value, "asIntegerNegative");
		return this.fromIntegerNegative(this._value);
	}
	public get asIntegerNegativeNullable(): number | null {
		if (this._value === null) { return null; }
		return this.fromIntegerNegative(this._value);
	}
	public get asIntegerPositive(): number {
		this.assertNotNullValue(this._value, "asIntegerPositive");
		return this.fromIntegerPositive(this._value);
	}
	public get asIntegerPositiveNullable(): number | null {
		if (this._value === null) { return null; }
		return this.fromIntegerPositive(this._value);
	}
	public get asNumber(): number {
		this.assertNotNullValue(this._value, "asNumber");
		return this.fromNumber(this._value);
	}
	public get asNumberNullable(): number | null {
		if (this._value === null) { return null; }
		return this.fromNumber(this._value);
	}
	public get asPortNumber(): number {
		this.assertNotNullValue(this._value, "asPortNumber");
		return this.fromPortNumber(this._value);
	}
	public get asPortNumberNullable(): number | null {
		if (this._value === null) { return null; }
		return this.fromPortNumber(this._value);
	}
	public get asString(): string {
		this.assertNotNullValue(this._value, "asString");
		return this.fromString(this._value);
	}
	public get asStringNullable(): string | null {
		if (this._value === null) { return null; }
		return this.fromString(this._value);
	}
	public get asUrl(): URL {
		this.assertNotNullValue(this._value, "asUrl");
		return this.fromUrl(this._value);
	}
	public get asUrlNullable(): URL | null {
		if (this._value === null) { return null; }
		return this.fromUrl(this._value);
	}

	public constructor(
		private readonly _key: string,
		private readonly _value: string | null,
		private readonly _sourceURI: URL | null,
		private readonly _overridden: FConfigurationValue | null
	) {
		super();
	}

	public toJSON() {
		return this._value;
	}

	private assertNotNullValue(
		value: string | null, callerProperty: Exclude<keyof FConfigurationValue, "sourceURI" | "overridden" | "key">
	): asserts value is string {
		if (value === null) {
			throw new FConfigurationValueException(
				this,
				`Cannot represent null value ${callerProperty}`,
				this.key
			);
		}
	}

	private fromBase64(value: string): Uint8Array {
		const parsedData = Buffer.from(value, "base64");
		const restoredValue = parsedData.toString("base64");
		if (restoredValue !== value) {
			const partOfValue = value.slice(0, 4);
			const maskValue = `${partOfValue}...`;
			throw new FConfigurationValueException(
				this,
				`Cannot parse value '${maskValue}' as base64.`,
				this.key,
			);
		}
		return parsedData;
	}

	private fromBoolean(value: string): boolean {
		const lowerCaseValue: string = value.toLowerCase();
		switch (lowerCaseValue) {
			case "true":
			case "enabled":
			case "yes":
				return true;
			case "false":
			case "disabled":
			case "no":
				return false;
			default:
				throw new FConfigurationValueException(
					this,
					`Cannot convert the value '${value}' to boolean type.`,
					this.key,
				);
		}
	}

	private fromDateIso8601(value: string): Date {
		const date = new Date(value);
		if (date.toString() === "Invalid Date") {
			throw new FConfigurationValueException(
				this,
				`Cannot parse value '${value}' as Date ISO8601. Invalid Date.`,
				this.key
			);
		}
		return date;
	}

	private fromDateTimestamp(value: string): Date {
		const friendlyValue: number = Number.parseInt(value, 10);
		if (friendlyValue.toString() !== value) {
			throw new FConfigurationValueException(
				this,
				`Cannot parse value '${value}' as Date timestamp. Unparsable timestamp.`,
				this.key,
			);
		}
		const date = new Date(friendlyValue);
		if (date.toString() === "Invalid Date") {
			throw new FConfigurationValueException(
				this,
				`Cannot parse value '${value}' as Date timestamp. Invalid Date.`,
				this.key
			);
		}
		return date;
	}

	private fromDecimal(value: string): FDecimal {
		try {
			return FDecimal.parse(value);
		} catch (e) {
			throw new FConfigurationValueException(
				this,
				`Cannot parse value '${value}' as FDecimal.`,
				this.key,
				FException.wrapIfNeeded(e)
			);
		}
	}

	private fromInteger(value: string): number {
		const friendlyValue = Number.parseInt(value, 10);
		if (friendlyValue.toString() === value) { return friendlyValue; }
		throw new FConfigurationValueException(
			this,
			`Cannot convert the value '${value}' to integer type.`,
			this.key,
		);
	}

	private fromIntegerNegative(value: string): number {
		const friendlyValue = this.fromInteger(value);
		if (friendlyValue < 0) { return friendlyValue; }
		throw new FConfigurationValueException(
			this,
			`Cannot convert the value '${value}' to integer negative type.`,
			this.key,
		);
	}

	private fromIntegerPositive(value: string): number {
		const friendlyValue = this.fromInteger(value);
		if (friendlyValue > 0) { return friendlyValue; }
		throw new FConfigurationValueException(
			this,
			`Cannot convert the value '${value}' to integer positive type.`,
			this.key,
		);
	}

	private fromNumber(value: string): number {
		const friendlyValue = Number.parseFloat(value);
		if (friendlyValue.toString() === value) { return friendlyValue; }
		throw new FConfigurationValueException(
			this,
			`Cannot convert the value '${value}' to float type.`,
			this.key
		);
	}

	private fromPortNumber(value: string): number {
		const friendlyValue = Number.parseInt(value);
		if (friendlyValue.toString() !== value) {
			throw new FConfigurationValueException(
				this,
				`Cannot convert the value '${value}' to TCP port number.`,
				this.key
			);
		}
		if (friendlyValue < 0 || friendlyValue > 65535) {
			throw new FConfigurationValueException(
				this,
				`Cannot convert the value '${value}' to TCP port number. Value out of range 0 - 65535.`,
				this.key
			);
		}
		return friendlyValue;
	}

	private fromString(value: string): string {
		return value;
	}

	private fromUrl(value: string): URL {
		try {
			return new URL(value);
		} catch (e) {
			const partOfValue = value.slice(0, 4);
			const maskValue = `${partOfValue}...`;
			throw new FConfigurationValueException(
				this,
				`Cannot parse value '${maskValue}' as URL.`,
				this.key,
				FException.wrapIfNeeded(e)
			);
		}
	}
}
