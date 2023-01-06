import { FException } from "../exception/FException";

import { FExecutionContext } from "../execution_context/FExecutionContext";

import { FLogger } from "./FLogger";
import { FLoggerLevel } from "./FLoggerLevel";
import { FLoggerLabels } from "./FLoggerLabels";
import { FLoggerLabelsExecutionContext } from "./FLoggerLabelsExecutionContext";

export abstract class FLoggerBase extends FLogger {
	public get isTraceEnabled(): boolean { return this.isLevelEnabled(FLoggerLevel.TRACE); }
	public get isDebugEnabled(): boolean { return this.isLevelEnabled(FLoggerLevel.DEBUG); }
	public get isInfoEnabled(): boolean { return this.isLevelEnabled(FLoggerLevel.INFO); }
	public get isWarnEnabled(): boolean { return this.isLevelEnabled(FLoggerLevel.WARN); }
	public get isErrorEnabled(): boolean { return this.isLevelEnabled(FLoggerLevel.ERROR); }
	public get isFatalEnabled(): boolean { return this.isLevelEnabled(FLoggerLevel.FATAL); }

	public get name(): string | null { return this._name; }

	public trace(
		variant: FExecutionContext | FLoggerLabels,
		message: string,
		ex?: FException,
	): void {
		if (!this.isTraceEnabled) {
			return;
		}

		const loggerLabels: FLoggerLabels = this._resolveLoggerProperties(variant);

		this.log(FLoggerLevel.TRACE, loggerLabels, message, ex);
	}

	public debug(
		variant: FExecutionContext | FLoggerLabels,
		message: string,
		ex?: FException,
	): void {
		if (!this.isDebugEnabled) {
			return;
		}

		const loggerLabels: FLoggerLabels =
			this._resolveLoggerProperties(variant);
		this.log(FLoggerLevel.DEBUG, loggerLabels, message, ex);
	}

	public info(
		variant: FExecutionContext | FLoggerLabels,
		message: string,
	): void {
		if (!this.isInfoEnabled) {
			return;
		}

		const loggerLabels: FLoggerLabels =
			this._resolveLoggerProperties(variant);
		this.log(FLoggerLevel.INFO, loggerLabels, message);
	}

	public warn(
		variant: FExecutionContext | FLoggerLabels,
		message: string,
	): void {
		if (!this.isWarnEnabled) {
			return;
		}

		const loggerLabels: FLoggerLabels =
			this._resolveLoggerProperties(variant);
		this.log(FLoggerLevel.WARN, loggerLabels, message);
	}

	public error(
		variant: FExecutionContext | FLoggerLabels,
		message: string,
	): void {
		if (!this.isErrorEnabled) {
			return;
		}

		const loggerLabels: FLoggerLabels =
			this._resolveLoggerProperties(variant);
		this.log(FLoggerLevel.ERROR, loggerLabels, message);
	}

	public fatal(
		variant: FExecutionContext | FLoggerLabels,
		message: string,
	): void {
		if (!this.isFatalEnabled) {
			return;
		}

		const loggerLabels: FLoggerLabels =
			this._resolveLoggerProperties(variant);
		this.log(FLoggerLevel.FATAL, loggerLabels, message);
	}

	protected constructor(loggerName?: string) {
		super();

		this._name = loggerName !== undefined ? loggerName : null;
	}

	protected abstract isLevelEnabled(level: FLoggerLevel): boolean;

	///
	/// Override this method to implement custom logger
	///
	protected abstract log(
		level: FLoggerLevel,
		labels: FLoggerLabels,
		message: string,
		exception?: FException,
	): void;

	private readonly _name: string | null;

	private _resolveLoggerProperties(
		variant: FExecutionContext | FLoggerLabels,
	): FLoggerLabels {
		let loggerLabels: FLoggerLabels;

		if (variant instanceof FExecutionContext) {
			const executionElement = FLoggerLabelsExecutionContext
				.of(variant);
			if (executionElement !== null) {
				loggerLabels = Object.freeze({ ...executionElement.loggerLabels });
			} else {
				loggerLabels = Object.freeze({}); // No any logger properties on excecution context chain
			}
		} else {
			loggerLabels = variant;
		}

		return loggerLabels;
	}
}
