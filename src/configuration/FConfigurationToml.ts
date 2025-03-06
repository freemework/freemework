import { readFile } from "fs";
import { promisify } from "util";
import { pathToFileURL } from "url";

// @ts-ignore
import type IarnaToml from "@iarna/toml";

import {
	FConfiguration,
	FConfigurationDictionary,
	FException,
	FExceptionInvalidOperation,
	FUtilUnReadonly,
} from "@freemework/common";

const readFileAsync = promisify(readFile);

let parse: ((toml: string) => IarnaToml.JsonMap) | null = null;

const parseLoadPromise: Promise<void> = import("@iarna/toml")
	.then((module) => {
		parse = module.parse;
	})
	.catch((e) => {
		const ex = FException.wrapIfNeeded(e);
		function raiseModuleNotFound(): never {
			throw new FExceptionInvalidOperation(
				"Unable to use FConfigurationToml. Please install module '@iarna/toml' before.",
				ex
			);
		}
		parse = raiseModuleNotFound;
	});

export class FConfigurationToml extends FConfigurationDictionary {
	public static async fromFile(
		tomlConfigFile: string,
		arrayIndexKey: string = FConfiguration.DEFAULT_INDEX_KEY,
		arrayIndexesKey: string = FConfiguration.DEFAULT_INDEXES_KEY
	): Promise<FConfigurationToml> {
		await parseLoadPromise;

		const tomlConfigFileURL: URL = pathToFileURL(tomlConfigFile);
		const sourceURI: URL = new URL(
			`configuration+file+toml://${tomlConfigFileURL.pathname}`
		);

		const fileContent: Buffer = await readFileAsync(tomlConfigFile);

		return new FConfigurationToml(
			sourceURI,
			fileContent.toString("utf-8"),
			arrayIndexKey,
			arrayIndexesKey
		);
	}

	public static async factory(
		tomlDocument: string,
		arrayIndexKey: string = FConfiguration.DEFAULT_INDEX_KEY,
		arrayIndexesKey: string = FConfiguration.DEFAULT_INDEXES_KEY
	): Promise<FConfigurationToml> {
		await parseLoadPromise;

		const encodedTomlDocument: string = encodeURIComponent(tomlDocument);
		const sourceURI: URL = new URL(
			`configuration:toml?data=${encodedTomlDocument}`
		);

		return new FConfigurationToml(
			sourceURI,
			tomlDocument,
			arrayIndexKey,
			arrayIndexesKey
		);
	}

	protected constructor(
		sourceURI: URL,
		tomlDocument: string,
		arrayIndexKey: string,
		arrayIndexesKey: string
	) {
		if (parse === null) {
			throw new FExceptionInvalidOperation(
				"Unable to use FConfigurationToml. Please install module '@iarna/toml' before."
			);
		}

		const dict: FUtilUnReadonly<FConfigurationDictionary.Data> = {};
		const tomlData: IarnaToml.JsonMap = parse(tomlDocument);
		function recursiveWalker(sourceData: any, ns: string = ""): void {
			if (typeof sourceData === "string") {
				dict[ns] = sourceData;
			} else if (typeof sourceData === "number") {
				dict[ns] = sourceData.toString();
			} else if (typeof sourceData === "boolean") {
				dict[ns] = sourceData ? "true" : "false";
			} else if (Array.isArray(sourceData)) {
				const indexes: Array<string> = [];
				const indexerKey: string = `${ns}.${arrayIndexesKey}`;

				for (let index = 0; index < sourceData.length; ++index) {
					const innerSourceData = sourceData[index];
					let indexName: string;
					if (
						typeof innerSourceData === "object" &&
						arrayIndexKey in innerSourceData
					) {
						indexName = innerSourceData[arrayIndexKey];
						delete innerSourceData[arrayIndexKey];
					} else {
						indexName = index.toString();
					}
					const subKey = `${ns}.${indexName}`;
					recursiveWalker(innerSourceData, subKey);
					indexes.push(indexName);
				}

				if (!(indexerKey in dict)) {
					dict[indexerKey] = indexes.join(" ");
				}
			} else {
				for (const [key, value] of Object.entries(sourceData)) {
					const fullKey = ns !== "" ? `${ns}.${key}` : key;
					recursiveWalker(value, fullKey);
				}
			}
		}
		recursiveWalker(tomlData);

		super(sourceURI, dict);
	}
}
