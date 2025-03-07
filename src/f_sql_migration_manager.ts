import { EOL } from "os";
import * as path from "path";
import * as vm from "vm";

import {
	FExecutionContext,
	FLogger,
	FSqlConnection,
	FSqlConnectionFactory,
	FException,
	FLoggerLabelsExecutionContext,
	FLoggerLevel,
	FLoggerBase,
	FLoggerLabels,
} from "@freemework/common";

import { FSqlMigrationSources } from "./f_sql_migration_sources.js";

export abstract class FSqlMigrationManager {
	private readonly _sqlConnectionFactory: FSqlConnectionFactory;
	private readonly _versionTableName: string;
	private readonly logger: FLogger;

	public constructor(opts: FSqlMigrationManager.Opts) {
		this._sqlConnectionFactory = opts.sqlConnectionFactory;
		this._versionTableName = opts.versionTableName !== undefined ? opts.versionTableName : "__migration";
		this.logger = FLogger.create(this.constructor.name);
	}

	/**
	 * Install versions (increment version)
	 * @param executionContext
	 * @param targetVersion Optional target version. Will use latest version if omitted.
	 */
	public async install(executionContext: FExecutionContext, migrationSources: FSqlMigrationSources, targetVersion?: string): Promise<void> {
		executionContext = new FLoggerLabelsExecutionContext(executionContext, {
			"direction": "install"
		});

		const currentVersion: string | null = await this.getCurrentVersion(executionContext);
		const availableVersions: Array<string> = [...migrationSources.versionNames].sort(); // from old version to new version
		let scheduleVersions: Array<string> = availableVersions;

		if (currentVersion !== null) {
			scheduleVersions = scheduleVersions.reduce<Array<string>>(
				(p, c) => { if (c > currentVersion) { p.push(c); } return p; },
				[]
			);
		}

		if (targetVersion !== undefined) {
			scheduleVersions = scheduleVersions.reduceRight<Array<string>>(function (p, c) {
				if (c <= targetVersion) { p.unshift(c); } return p;
			}, []);
		}

		await this.sqlConnectionFactory.usingConnection(
			executionContext,
			async (usingExecutionContext: FExecutionContext, sqlConnection: FSqlConnection) => {
				if (!(await this._isVersionTableExist(usingExecutionContext, sqlConnection))) {
					await this._createVersionTable(usingExecutionContext, sqlConnection);
				}
			}
		);

		for (const versionName of scheduleVersions) {
			await this.sqlConnectionFactory.usingConnectionWithTransaction(
				new FLoggerLabelsExecutionContext(executionContext, {
					"version": versionName
				}),
				async (usingExecutionContext: FExecutionContext, sqlConnection: FSqlConnection) => {
					const migrationLogger = new FSqlMigrationManager.MigrationLogger(this.logger);

					const versionBundle: FSqlMigrationSources.VersionBundle = migrationSources.getVersionBundle(versionName);
					const installScriptNames: Array<string> = [...versionBundle.installScriptNames].sort();
					for (const scriptName of installScriptNames) {
						const scriptExecutionContext = new FLoggerLabelsExecutionContext(usingExecutionContext, {
							"script": scriptName
						});

						const script: FSqlMigrationSources.Script = versionBundle.getInstallScript(scriptName);
						switch (script.kind) {
							case FSqlMigrationSources.Script.Kind.SQL: {
								migrationLogger.info(scriptExecutionContext, `Execute SQL script: ${script.name}`);
								migrationLogger.trace(scriptExecutionContext, EOL + script.content);
								await this._executeMigrationSql(scriptExecutionContext, sqlConnection, migrationLogger, script.content);
								break;
							}
							case FSqlMigrationSources.Script.Kind.JAVASCRIPT: {
								migrationLogger.info(scriptExecutionContext, `Execute JS script: ${script.name}`);
								migrationLogger.trace(scriptExecutionContext, EOL + script.content);
								await this._executeMigrationJavaScript(
									scriptExecutionContext, sqlConnection, migrationLogger,
									{
										content: script.content,
										file: script.file
									}
								);
								break;
							}
							default:
								migrationLogger.warn(scriptExecutionContext, `Skip script '${versionName}:${script.name}' due unknown kind of script`);
						}
					}

					const logText: string = migrationLogger.flush();
					await this._insertVersionLog(usingExecutionContext, sqlConnection, versionName, logText);

					const rollbackScripts: Array<FSqlMigrationSources.Script> = versionBundle.rollbackScriptNames.map(scriptName => versionBundle.getRollbackScript(scriptName));
					await this._insertRollbackScripts(usingExecutionContext, sqlConnection, versionName, rollbackScripts);
				}
			);
		}
	}

	/**
	 * Rollback versions (increment version)
	 * @param cancellationToken A cancellation token that can be used to cancel the action.
	 * @param targetVersion Optional target version. Will rollback all versions if omitted.
	 */
	public async rollback(executionContext: FExecutionContext, targetVersion?: string): Promise<void> {
		executionContext = new FLoggerLabelsExecutionContext(executionContext, {
			"direction": "rollback"
		});

		const currentVersion: string | null = await this.getCurrentVersion(executionContext);
		if (currentVersion === null) {
			this.logger.warn(executionContext, `Skip rollback due to no any installed versions`);
			return;
		}

		const versionNames: Array<string> = await this.sqlConnectionFactory.usingConnection(
			executionContext,
			(usingExecutionContext: FExecutionContext, sqlConnection: FSqlConnection) =>
				this._listVersions(usingExecutionContext, sqlConnection)
		);

		const availableVersions: Array<string> = [...versionNames].sort().reverse(); // from new version to old version
		let scheduleVersionNames: Array<string> = availableVersions;

		scheduleVersionNames = scheduleVersionNames.reduce<Array<string>>(
			(p, c) => { if (c <= currentVersion) { p.push(c); } return p; },
			[]
		);

		if (targetVersion !== undefined) {
			scheduleVersionNames = scheduleVersionNames.reduceRight<Array<string>>(
				(p, c) => { if (c > targetVersion) { p.unshift(c); } return p; },
				[]
			);
		}

		for (const versionName of scheduleVersionNames) {
			await this.sqlConnectionFactory.usingConnectionWithTransaction(
				new FLoggerLabelsExecutionContext(executionContext, {
					"version": versionName
				}),
				async (usingExecutionContext: FExecutionContext, sqlConnection: FSqlConnection) => {
					if (! await this._isVersionLogExist(usingExecutionContext, sqlConnection, versionName)) {
						this.logger.warn(executionContext, `Skip rollback for version '${versionName}' due this does not present inside database.`);
						return;
					}

					const scripts: Array<FSqlMigrationSources.Script> = await this._getRollbackScripts(usingExecutionContext, sqlConnection, versionName);
					//const versionBundle: FSqlMigrationSources.VersionBundle = this._migrationSources.getVersionBundle(versionName);
					const rollbackScriptNames: Array<string> = [...scripts.map(s => s.name)].sort().reverse();
					const scriptsMap: Map<string, FSqlMigrationSources.Script> = scripts.reduce((acc, curr) => { acc.set(curr.name, curr); return acc }, new Map<string, FSqlMigrationSources.Script>());
					for (const scriptName of rollbackScriptNames) {
						const scriptExecutionContext = new FLoggerLabelsExecutionContext(usingExecutionContext, {
							"script": scriptName
						});

						const script: FSqlMigrationSources.Script = scriptsMap.get(scriptName)!;
						switch (script.kind) {
							case FSqlMigrationSources.Script.Kind.SQL: {
								this.logger.info(scriptExecutionContext, `Execute SQL script: ${script.name}`);
								this.logger.trace(scriptExecutionContext, EOL + script.content);
								await this._executeMigrationSql(scriptExecutionContext, sqlConnection, this.logger, script.content);
								break;
							}
							case FSqlMigrationSources.Script.Kind.JAVASCRIPT: {
								this.logger.info(scriptExecutionContext, `Execute JS script: ${script.name}`);
								this.logger.trace(scriptExecutionContext, EOL + script.content);
								await this._executeMigrationJavaScript(
									scriptExecutionContext, sqlConnection, this.logger,
									{
										content: script.content,
										file: script.file
									}
								);
								break;
							}
							default:
								this.logger.warn(scriptExecutionContext, `Skip script '${versionName}:${script.name}' due unknown kind of script`);
						}
					}

					await this._removeVersionLog(usingExecutionContext, sqlConnection, versionName);
				}
			);
		}
	}

	/**
	 * Gets current version of the database or `null` if version table is not presented.
	 * @param cancellationToken Allows to request cancel of the operation.
	 */
	public abstract getCurrentVersion(executionContext: FExecutionContext): Promise<string | null>;


	/**
	 * Gets list of installed versions of the database.
	 * @param cancellationToken Allows to request cancel of the operation.
	 */
	public abstract listVersions(executionContext: FExecutionContext): Promise<Array<string>>;

	protected get sqlConnectionFactory(): FSqlConnectionFactory { return this._sqlConnectionFactory; }

	protected get versionTableName(): string { return this._versionTableName; }

	protected abstract _createVersionTable(
		executionContext: FExecutionContext, sqlConnection: FSqlConnection
	): Promise<void>;

	protected async _executeMigrationJavaScript(
		executionContext: FExecutionContext,
		sqlConnection: FSqlConnection,
		migrationLogger: FLogger,
		migrationJavaScript: {
			readonly content: string;
			readonly file: string;
		}
	): Promise<void> {
		await new Promise<void>((resolve, reject) => {
			const sandbox = {
				__private: { executionContext, log: migrationLogger, resolve, reject, sqlConnection: sqlConnection },
				__dirname: path.dirname(migrationJavaScript.file),
				__filename: migrationJavaScript.file
			};
			const script = new vm.Script(`${migrationJavaScript.content}
Promise.resolve().then(() => migration(__private.executionContext, __private.sqlConnection, __private.log)).then(__private.resolve).catch(__private.reject);`,
				{
					filename: migrationJavaScript.file
				}
			);
			script.runInNewContext(sandbox, { displayErrors: false });
		});
	}

	protected async _executeMigrationSql(
		executionContext: FExecutionContext,
		sqlConnection: FSqlConnection,
		migrationLogger: FLogger,
		sqlText: string
	): Promise<void> {
		migrationLogger.trace(executionContext, EOL + sqlText);
		await sqlConnection.statement(sqlText).execute(executionContext);
	}

	protected async _getRollbackScripts(
		executionContext: FExecutionContext,
		_sqlConnection: FSqlConnection,
		_version: string
	): Promise<Array<FSqlMigrationSources.Script>> {
		// TODO Make abstract method
		this.logger.fatal(executionContext, "_getRollbackScripts: Not implemented yet");
		return [];
	}


	protected async _insertRollbackScripts(
		executionContext: FExecutionContext,
		_sqlConnection: FSqlConnection,
		_version: string,
		_scripts: ReadonlyArray<FSqlMigrationSources.Script>
	): Promise<void> {
		// TODO Make abstract method
		this.logger.fatal(executionContext, "_insertRollbackScripts: Not implemented yet");
	}

	protected abstract _insertVersionLog(
		executionContext: FExecutionContext, sqlConnection: FSqlConnection, version: string, logText: string
	): Promise<void>;

	protected abstract _isVersionLogExist(
		executionContext: FExecutionContext, sqlConnection: FSqlConnection, version: string
	): Promise<boolean>;

	protected abstract _isVersionTableExist(
		executionContext: FExecutionContext, sqlConnection: FSqlConnection
	): Promise<boolean>;

	protected async _listVersions(
		executionContext: FExecutionContext,
		_sqlConnection: FSqlConnection
	): Promise<Array<string>> {
		// TODO Make abstract method
		this.logger.fatal(executionContext, "_listVersions: Not implemented yet");
		return [];
	}

	protected abstract _removeVersionLog(
		executionContext: FExecutionContext, sqlConnection: FSqlConnection, version: string
	): Promise<void>;

	protected abstract _verifyVersionTableStructure(
		executionContext: FExecutionContext, sqlConnection: FSqlConnection
	): Promise<void>;
}

export namespace FSqlMigrationManager {
	export interface Opts {
		readonly sqlConnectionFactory: FSqlConnectionFactory;

		/**
		 * Name of version table. Default `__migration`.
		 */
		readonly versionTableName?: string;
	}

	export class MigrationException extends FException { }
	export class WrongMigrationDataException extends MigrationException { }

	export class MigrationLogger extends FLoggerBase {
		private readonly _wrap: FLogger;
		private readonly _lines: Array<string>;

		public constructor(wrap: FLogger) {
			super(wrap.name!);

			this._lines = [];
			this._wrap = wrap;
		}

		public flush(): string {
			// Join and empty _lines
			return this._lines.splice(0).join(EOL);
		}

		public override writeLog(
			level: FLoggerLevel,
			labels: FLoggerLabels,
			message: string,
			ex?: FException,
		): void {
			let levelTxt: string;
			switch (level) {
				case FLoggerLevel.DEBUG: levelTxt = "[DEBUG]"; break;
				case FLoggerLevel.INFO: levelTxt = "[INFO]"; break;
				case FLoggerLevel.WARN: levelTxt = "[WARN]"; break;
				case FLoggerLevel.ERROR: levelTxt = "[ERROR]"; break;
				case FLoggerLevel.FATAL: levelTxt = "[FATAL]"; break;
				default: levelTxt = "[TRACE]"; break;
			}
			this._wrap.log(labels, level, message, ex);
			this._lines.push(`${levelTxt} ${message}`);
		}

		protected override isLevelEnabled(_level: FLoggerLevel): boolean {
			return true;
		}
	}
}
