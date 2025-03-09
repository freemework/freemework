import { FException } from "../exception/f_exception.js";

import { FLogger, FLoggerBase } from "./f_logger.js";
import { FLoggerLabels } from "./f_logger_labels.js";
import { FLoggerLevel } from "./f_logger_level.js";

export class FLoggerDummy extends FLoggerBase {
	private static _instance: FLoggerDummy | null = null;

	/**
	 * Factory constructor
	 */
	public static override create(loggerName?: string): FLogger {
		// Lazy singleton

		if (FLoggerDummy._instance === null) {
			FLoggerDummy._instance = new FLoggerDummy(loggerName !== undefined ? loggerName : "Dummy");
		}

		return FLoggerDummy._instance;
	}

	protected isLevelEnabled(_: FLoggerLevel): boolean { return false; }
	protected writeToOutput(_: FLoggerLevel, __: FLoggerLabels, ___: string, ____?: FException): void { }

	private constructor(loggerName: string) { super(loggerName); }
}
