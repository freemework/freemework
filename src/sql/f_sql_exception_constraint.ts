import { FException } from "../exception/f_exception.js";
import { FSqlException } from "./f_sql_exception.js";

export class FSqlExceptionConstraint extends FSqlException {
	public readonly constraintName: string;

	public constructor(message: string, constraintName: string, innerEx: FException) {
		super(message, innerEx);
		this.constraintName = constraintName;
	}
}
