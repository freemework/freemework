/**
 * Base class to define a logger label
 * 
 * @example
 * export class MyLoggerLabel extends FLoggerLabel {
 * 	public static readonly APP_VERSION = new MyLoggerLabel("app.version", "Describes a version of the current application");
 * 	public static readonly APP_NAME = new MyLoggerLabel("app.name", "Describes a name of the current application");
 * 	public static readonly INPUT_HTTP_METHOD = new MyLoggerLabel("in.http.method", "Describes HTTP method of input request (like a GET, POST, etc.)");
 * 	public static readonly INPUT_HTTP_PATH = new MyLoggerLabel("in.http.path", "Describes HTTP URL path of input request (like a /api/v1/user)");
 * 	public static readonly INPUT_HTTP_STATUS = new MyLoggerLabel("in.http.status", "Describes HTTP status of input request (like 200, 400, etc.)");
 * 	// ...
 * }
 * 
 * for(const {name, description} of FLoggerLabel.all) {
 * 	console.log(`${name}: ${description}`);
 * 		// == stdout ==
 * 		// app.version: Describes a version of the current application
 * 		// app.name: Describes a name of the current application
 * 		// ...
 * }
 * 
 * executionContext = new FLoggerLabelsExecutionContext(executionContext,
 * 	MyLoggerLabel.APP_VERSION.value("1.0.42"),
 * )
 * 
 * logger.info(executionContext, "Some log message");
 * 	// == logger output ==
 * 	// ... INFO (app.version:1.0.42) Some log message
 */
export abstract class FLoggerLabel extends Object {
	private static readonly _all: Set<FLoggerLabel> = new Set<FLoggerLabel>();

	public static get all(): ReadonlySet<FLoggerLabel> { return FLoggerLabel._all; }

	public value(labelValue: string): FLoggerLabelValue {
		return new FLoggerLabelValue(this, labelValue);
	}

	public override toString(): string {
		return this.name;
	}

	protected constructor(
		public readonly name: string,
		public readonly description: string,
	) {
		super();
		FLoggerLabel._all.add(this);
	}
}

export class FLoggerLabelValue {
	public constructor(
		public readonly label: FLoggerLabel,
		public readonly value: string,
	) { }

	public get name(): string { return this.label.name; }
}
