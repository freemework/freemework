import { FException } from "./FException";

export class FExceptionArgument extends FException {
	public constructor();
	public constructor(message: string);
	public constructor(message: string, paramName: string);
	public constructor(message: string, paramName: string, innerException: FException);

	constructor(message?: string, paramName?: string, innerException?: any) {
		if (paramName !== undefined) {
			if (message !== undefined) {
				super(`Wrong argument '${paramName}'. ${message}`, innerException);
			} else {
				super(`Wrong argument '${paramName}'`);
			}
		} else {
			super("Wrong argument");
		}
	}
}