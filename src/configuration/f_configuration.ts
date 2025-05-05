import { FExceptionArgument, FExceptionInvalidOperation } from "../exception/index.js";
import { FUtilUnReadonly } from "../util/index.js";
import { FConfigurationException } from "./f_configuration_exception.js";

import { FConfigurationValue } from "./f_configuration_value.js";


/**
 * The `FConfiguration` provides contract to access key-value configuration sources
 */
export abstract class FConfiguration {
	/**
	 * Construct configuration from json object
	 *
	 * Complex json object expands into plain dictionary of key-values.
	 *
	 * @example
	 * ```js
	 * const config: FConfiguration = FConfiguration.factoryJson({ a: { b: { c: 42 } } });
	 * assert.equal(config.get("a.b.c").asInteger, 42);
	 * ```
	 *
	 * @example
	 * ```js
	 * const config: FConfiguration = FConfiguration.factoryJson({ a: { b: [ { c: 40 }, { c: 41 }, { c: 42 } ] } });
	 *
	 * assert.equal(config.get("a.b.0.c").asString, "40");
	 * assert.equal(config.get("a.b.1.c").asString, "41");
	 * assert.equal(config.get("a.b.2.c").asString, "42");
	 *
	 * const array: ReadonlyArray<FConfiguration> = config.getArray("a.b");
	 * assert.equal(array.length, 3);
	 * assert.equal(array[0].get("c").asInteger, 40);
	 * assert.equal(array[1].get("c").asInteger, 41);
	 * assert.equal(array[2].get("c").asInteger, 42);
	 * ```
	 */
	public static factoryJson(jsonObject: any, indexFieldName: string = FConfiguration.DEFAULT_INDEX_KEY): FConfiguration {

		/**
		 * Expand json to key-value dict
		 *
		 * @example
		 * ```js
		 * const jsonObject = {"a":{"b":{"c":"42"}}};
		 * const targetDict: { [key: string]: boolean | number | string; } = {};
		 * expandJson(jsonObject, targetDict);
		 * console.log(JSON.stringify(targetDict)); // {"a.b.c":"42"}
		 * ```
		 */
		function expandJson(jsonObject: any, targetDict: { [key: string]: boolean | number | string; }, parentName?: string): void {
			for (let [name, value] of Object.entries(jsonObject)) {

				if (Array.isArray(jsonObject)) {
					if (typeof value === "object" && value !== null && indexFieldName in value) {
						const { [indexFieldName]: index, ...rest } = value as any;
						if (typeof index !== "string") {
							const itemKeyName: string = parentName !== undefined ? `${parentName}.${name}` : name;
							throw new FExceptionArgument(`Unreadable data. Unsupported index '${index}' for value of key '${itemKeyName}'. Expected index type of string.`, "jsonObject");
						} else {
							name = index;
							value = rest;
						}
					}
				}

				const fullKeyName: string = parentName !== undefined ? `${parentName}.${name}` : name;

				switch (typeof value) {
					case "boolean":
					case "number":
					case "string":
						targetDict[fullKeyName] = value;
						break;
					case "object":
						// it is applicable for arrays too, due to Array.prototype.keys() returns indexes.
						expandJson(value, targetDict, fullKeyName);
						break;
					default:
						throw new FExceptionArgument(`Unreadable data. Unsupported type for value of key '${fullKeyName}'`, "jsonObject");
				}
			}
		}

		const jsonDict: { [key: string]: boolean | number | string; } = {};
		expandJson(jsonObject, jsonDict);

		const dict: FUtilUnReadonly<FConfigurationDictionary.Data> = {};
		for (const [name, value] of Object.entries(jsonDict)) {
			if (typeof value === "string") {
				dict[name] = value === "" ? null : value;
			} else if (value === null) {
				dict[name] = null;
			} else {
				dict[name] = value.toString();
			}
		}

		const encodedJson: string = encodeURIComponent(JSON.stringify(jsonObject));
		const sourceURI: string = `configuration:json?data=${encodedJson}`;

		return new FConfigurationDictionary(
			new URL(sourceURI),
			Object.freeze(dict)
		);
	}

	protected static readonly DEFAULT_INDEXES_KEY: string = "indexes";
	protected static readonly DEFAULT_INDEX_KEY: string = "index";

	/**
	 * Gets configuration source URI.
	 *
	 * @remarks This value mostly need to debug purposes to understand source of a value.
	 *
	 * @see https://docs.freemework.org/configuration/FConfiguration#sourceURI?lang=typescript
	 *
	 * Each configuration source should represents an URI.
	 * For example:
	 * - configuration+file+properies:///path/to/file.properies
	 * - configuration+file+ini:///path/to/file.ini
	 * - configuration+file+json:///path/to/file.json
	 * - configuration+file+toml:///path/to/file.toml
	 * - configuration+file+yaml:///path/to/file.yml
	 * - configuration+consul://my.consul.host:????
	 * - configuration+redis://my.redis.host:6379/1
	 * - configuration+directory+keyperfile:///run/secrets
	 * - configuration:json?data=%7B%22a%22%3A42%7D
	 * - configuration:properies?data=...
	 * - configuration:toml?data=...
	 * - configuration:chain?sources=configuration:env,configuration%3Ajson%3Fdata%3D...,...
	 * - configuration:env
	 * - etc.
	 */
	public abstract get sourceURI(): URL;

	/**
	 * Gets fully qualified configuration namespace name
	 *
	 * @example
	 * ```js
	 * const appCfg = FConfiguration.factoryJson({
	 * 	"runtime.server.ONE.listenAddress": "localhost",
	 * 	"runtime.server.ONE.listenPort": "8081",
	 * 	"runtime.server.TWO.listenAddress": "localhost",
	 * 	"runtime.server.TWO.listenPort": "8082",
	 * });
	 *
	 * console.log(appCfg.namespaceFull); // null
	 *
	 * const runtimeCfg = appCfg.getNamespace("runtime");
	 * console.log(runtimeCfg.namespaceFull); // "runtime"
	 *
	 * const serverTwoCfg = runtimeCfg.getNamespace("server.TWO");
	 * console.log(serverTwoCfg.namespaceFull); // "runtime.server.TWO"
	 * ```
	 */
	public abstract get namespaceFull(): string | null;

	/**
	 * Gets parent configuration namespace name
	 *
	 * @example
	 * ```js
	 * const appCfg = FConfiguration.factoryJson({
	 * 	"runtime.server.ONE.listenAddress": "localhost",
	 * 	"runtime.server.ONE.listenPort": "8081",
	 * 	"runtime.server.TWO.listenAddress": "localhost",
	 * 	"runtime.server.TWO.listenPort": "8082",
	 * });
	 *
	 * console.log(appCfg.namespaceParent); // null
	 *
	 * const runtimeCfg = appCfg.getNamespace("runtime");
	 * console.log(runtimeCfg.namespaceParent); // "runtime"
	 *
	 * const serverTwoCfg = runtimeCfg.getNamespace("server.TWO");
	 * console.log(serverTwoCfg.namespaceParent); // "TWO"
	 * ```
	 */
	public abstract get namespaceParent(): string | null;

	/**
	 * Gets list of keys available in current configuration
	 *
	 * @example
	 * ```js
	 * const appCfg = FConfiguration.factoryJson({
	 * 	"runtime.server.ONE.listenAddress": "localhost",
	 * 	"runtime.server.ONE.listenPort": "8081",
	 * 	"runtime.server.TWO.listenAddress": "localhost",
	 * 	"runtime.server.TWO.listenPort": "8082",
	 * });
	 *
	 * console.log(appCfg.keys); // ["runtime.server.ONE.listenAddress", "runtime.server.ONE.listenPort", "runtime.server.TWO.listenAddress", "runtime.server.TWO.listenPort"]
	 *
	 * const runtimeCfg = appCfg.getNamespace("runtime");
	 * console.log(runtimeCfg.keys); // ["server.ONE.listenAddress", "server.ONE.listenPort", "server.TWO.listenAddress", "server.TWO.listenPort"]
	 *
	 * const serverTwoCfg = appCfg.getNamespace("runtime.server.TWO");
	 * console.log(serverTwoCfg.keys); // ["listenAddress","listenPort"]
	 * ```
	 */
	public abstract get keys(): ReadonlyArray<string>;


	/**
	 * Obtain array of sub-configurations
	 *
	 * @param key Name of array key
	 * @param indexesName Name of indexes key. Default: "indexes".
	 *
	 * @example
	 * ```js
	 * const appCfg = FConfiguration.factoryJson({
	 * 	"runtime.server.ONE.listenAddress": "localhost",
	 * 	"runtime.server.ONE.listenPort": "8081",
	 * 	"runtime.server.TWO.listenAddress": "localhost",
	 * 	"runtime.server.TWO.listenPort": "8082",
	 * 	"runtime.server.THREE.listenAddress": "localhost",
	 * 	"runtime.server.THREE.listenPort": "8083",
	 * 	"runtime.server.indexes": "ONE THREE",
	 * });
	 *
	 * const runtimeCfg = appCfg.getNamespace("runtime");
	 * const serverCfgs = runtimeCfg.getArray("server", "indexes");
	 *
	 * console.log(serverCfgs.length); // 2
	 *
	 * console.log(serverCfgs[0].keys); // ["listenAddress","listenPort"]
	 * console.log(serverCfgs[1].keys); // ["listenAddress","listenPort"]
	 *
	 * console.log(serverCfgs[0].namespaceFull); // runtime.server.ONE
	 * console.log(serverCfgs[0].get("listenAddress").asString); // localhost
	 * console.log(serverCfgs[0].get("listenPort").asInteger); // 8081
	 *
	 * console.log(serverCfgs[1].namespaceFull); // runtime.server.THREE
	 * console.log(serverCfgs[1].get("listenAddress").asString); // localhost
	 * console.log(serverCfgs[1].get("listenPort").asInteger); // 8083
	 * ```
	 */
	public abstract getArray(key: string, indexesName?: string): Array<FConfiguration>;

	/**
	 * Get inner configuration for specific namespace.
	 *
	 * @throw `FConfigurationException` if no specific namespace found
	 * @returns Inner configuration
	 *
	 * @example
	 * ```js
	 * const appCfg = FConfiguration.factoryJson({
	 * 	"runtime.server.ONE.listenAddress": "localhost",
	 * 	"runtime.server.ONE.listenPort": "8081",
	 * 	"runtime.server.TWO.listenAddress": "localhost",
	 * 	"runtime.server.TWO.listenPort": "8082",
	 * });
	 *
	 * console.log(appCfg.namespaceFull); // ""
	 *
	 * const runtimeCfg = appCfg.getNamespace("runtime");
	 * console.log(runtimeCfg.namespaceFull); // "runtime"
	 *
	 * const serverTwoCfg = runtimeCfg.getNamespace("server.TWO");
	 * console.log(serverTwoCfg.namespaceFull); // "runtime.server.TWO"
	 * ```
	 */
	public abstract getNamespace(namespaceFull: string): FConfiguration;

	/**
	 * @throws `FConfigurationException` if the `key` not found and no `defaultData` provided
	 */
	public abstract get(key: string, defaultData?: string | null): FConfigurationValue;

	/**
	 * Find inner configuration for specific namespace.
	 *
	 * @returns Inner configuration or `null` if no specific namespace found
	 *
	 * @example
	 * ```js
	 * const appCfg = FConfiguration.factoryJson({
	 * 	"runtime.server.ONE.listenAddress": "localhost",
	 * 	"runtime.server.ONE.listenPort": "8081",
	 * 	"runtime.server.TWO.listenAddress": "localhost",
	 * 	"runtime.server.TWO.listenPort": "8082",
	 * });
	 *
	 * const setupCfg = appCfg.findNamespace("setup");
	 * console.log(setupCfg === null); // true
	 *
	 * const runtimeCfg = appCfg.findNamespace("runtime");
	 * console.log(runtimeCfg !== null); // true
	 * ```
	 */
	public abstract findNamespace(namespaceFull: string): FConfiguration | null;

	public abstract find(key: string): FConfigurationValue | null;

	public abstract hasNamespace(namespaceFull: string): boolean;

	/**
	 * Checks whether key is presented in current configuration
	 *
	 * @param key Name of key
	 * @returns `true` is the key is presented, otherwise `false`
	 *
	 * @example
	 * ```js
	 * const appCfg = FConfiguration.factoryJson({
	 * 	"runtime.port": "8080",
	 * 	"runtime.loglevel": "DEBUG",
	 * });
	 *
	 * const runtimeCfg = appCfg.getNamespace("runtime");
	 * const isLogLevelPresented = runtimeCfg.has("loglevel")
	 *
	 * console.log(isLogLevelPresented); // true
	 * ```
	 */
	public abstract has(key: string): boolean;

	public toDynamicView(
		opts: {
			readonly strict: boolean;
		} = {
				strict: true,
			}
	): any {
		function keyWalker(rootObj: any, keys: ReadonlyArray<string>, sourceConfig: FConfiguration, parentObject: any) {
			const target: any = {};
			if (rootObj === null) {
				rootObj = target;
			}
			target["$root"] = rootObj;

			const dottedKeys = new Map();
			for (const key of keys) {
				const dotIndex = key.indexOf(".");
				if (dotIndex === -1) {
					target[key] = sourceConfig.get(key).asString;
				} else {
					const parentKey = key.substring(0, dotIndex);
					const subKey = key.substring(dotIndex + 1);
					if (dottedKeys.has(parentKey)) {
						dottedKeys.get(parentKey).push(subKey);
					} else {
						dottedKeys.set(parentKey, [subKey]);
					}
				}
			}

			for (const [parentKey, subKeys] of dottedKeys.entries()) {
				const configNamespaceParent = sourceConfig.namespaceParent
				const isSingle = configNamespaceParent !== null && sourceConfig.keys.length === 1;

				const inner = keyWalker(rootObj, subKeys, sourceConfig.getNamespace(parentKey), target);

				target[parentKey] = inner;
				target[`?${parentKey}`] = inner;

				const array = Object.keys(inner).filter(key => !key.startsWith("?") && key !== "$parent" && key !== "$root").map(key => {
					const innerObj = inner[key];
					if (typeof innerObj === "string" || typeof innerObj === "number" || typeof innerObj === "boolean") {
						return innerObj;
					}
					const wrap = { ...innerObj };
					Object.defineProperty(wrap, "$parent", {
						get: function () {
							return innerObj["$parent"]["$parent"];
						}
					});
					return wrap;
				});
				inner["$array"] = array;

				inner["$single"] = function () {
					if (!isSingle) {
						throw new Error(`Single constraint violation for property '${parentKey}' in namespace '${configNamespaceParent}'`);
					}
					const { "$single": _, ...rest } = inner;
					return rest;
				}
			}

			if (parentObject !== null) {
				target["$parent"] = parentObject;
			}

			return target;
		}

		const objectConfig = keyWalker(null, this.keys, this, null);

		function makeProxyAdapter(ns: ReadonlyArray<string>, obj: any) {
			return new Proxy(obj, {
				get(_, property) {
					if (typeof property === "string") {
						let objProperty = property;
						if (property.startsWith("?")) {
							objProperty = property.substring(1);
						}
						if (objProperty in obj) {
							const value = obj[objProperty];
							if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
								return value;
							} else {
								return makeProxyAdapter([
									...ns,
									property, // yep, we need original property name (with ? prefix for optional) to make Mustache work correctly
								], value);
							}
						}

						const fullProperty = [...ns, property].join(".");
						const isOptionalProperty = fullProperty.includes("?");
						if (!isOptionalProperty) {
							if (opts.strict) {
								throw new FExceptionInvalidOperation(`Non-existing property request '${fullProperty}'.`);
							} else {
								return null;
							}
						}
					}

					return null;
				},
			});
		}

		const proxyConfig = makeProxyAdapter([], objectConfig);

		return proxyConfig;
	}
}

// import { FConfigurationDictionary } from "./f_configuration_dictionary.js"; // Import here due to cyclic dependencies


export class FConfigurationDictionary extends FConfiguration {
	private static readonly NAMESPACE_DELIMITER_SYMBOL = ".";
	private readonly _dict: FConfigurationDictionary.Data;
	private readonly _sourceURI: URL;
	private readonly _configurationNamespace: string | null;
	private _keys: ReadonlyArray<string> | null;

	public constructor(sourceURI: URL, dict: FConfigurationDictionary.Data, namespaceFull?: string) {
		super();
		this._dict = Object.freeze({ ...dict });
		this._sourceURI = sourceURI;
		this._configurationNamespace = namespaceFull !== undefined ? namespaceFull : null;
		this._keys = null;
	}

	public get namespaceFull(): string | null {
		return this._configurationNamespace;
	}

	public get namespaceParent(): string | null {
		const configurationNamespace = this._configurationNamespace;
		if (configurationNamespace === null) { return null; }

		const indexOfLastDelimiter: number = configurationNamespace.lastIndexOf(FConfigurationDictionary.NAMESPACE_DELIMITER_SYMBOL);
		if (indexOfLastDelimiter === -1) {
			return configurationNamespace;
		}

		return configurationNamespace.substring(indexOfLastDelimiter + 1);
	}

	public get keys(): ReadonlyArray<string> {
		return this._keys !== null ? this._keys : (this._keys = Object.freeze(Object.keys(this._dict)));
	}

	public get sourceURI(): URL {
		return this._sourceURI;
	}

	public findNamespace(_: string): FConfiguration | null {
		throw new Error("Method not implemented.");
	}

	public find(key: string): FConfigurationValue | null {
		if (key in this._dict) {
			const valueData = this._dict[key]!;

			const namespaceFull = this.namespaceFull;
			const fullKey = namespaceFull !== null ? `${namespaceFull}.${key}` : key;

			const value: FConfigurationValue = FConfigurationValue.factory(
				fullKey,
				valueData,
				this.sourceURI,
				null
			);
			return value;
		} else {
			return null;
		}
	}

	public getNamespace(namespaceFull: string): FConfiguration {
		const innerDict: FUtilUnReadonly<FConfigurationDictionary.Data> = {};
		const criteria = namespaceFull + FConfigurationDictionary.NAMESPACE_DELIMITER_SYMBOL;
		const criteriaLen = criteria.length;
		Object.keys(this._dict).forEach((key) => {
			if (key.length > criteriaLen && key.startsWith(criteria)) {
				const value = this._dict[key]!;
				innerDict[key.substring(criteriaLen)] = value;
			}
		});

		const innerConfigurationNamespace = this._configurationNamespace !== null ?
			`${this._configurationNamespace}.${namespaceFull}` : namespaceFull;

		if (Object.keys(innerDict).length === 0) {
			throw new FConfigurationException(
				`Namespace '${innerConfigurationNamespace}' was not found in the configuration.`,
				innerConfigurationNamespace
			);
		}
		return new FConfigurationDictionary(this.sourceURI, innerDict, innerConfigurationNamespace);
	}

	public get(key: string, defaultData?: string | null): FConfigurationValue {
		const namespaceFull = this.namespaceFull;
		const fullKey = namespaceFull !== null ? `${namespaceFull}.${key}` : key;

		if (key in this._dict) {
			let valueData = this._dict[key];

			if (valueData === null && defaultData !== undefined) {
				valueData = defaultData;
			}

			const value: FConfigurationValue = FConfigurationValue.factory(
				fullKey, valueData!, this.sourceURI, null
			);
			return value;
		} else if (defaultData !== undefined) {
			const value: FConfigurationValue = FConfigurationValue.factory(
				fullKey, defaultData, this.sourceURI, null
			);
			return value;
		} else {
			throw new FConfigurationException("Current configuration does not have such key. Check your configuration.", key);
		}
	}

	public getArray(key: string, indexesName: string = FConfiguration.DEFAULT_INDEXES_KEY): Array<FConfiguration> {
		const arrayNS = this.getNamespace(key);
		const arrayIndexes: Array<string> = arrayNS.get(indexesName).asString
			.split(" ")
			.filter(s => s !== "");

		const arrayNamespaces: Array<FConfiguration> = arrayIndexes.map(s => {
			return arrayNS.getNamespace(s);
		});

		return arrayNamespaces;
	}

	public hasNamespace(namespaceFull: string): boolean {
		const criteria = namespaceFull + FConfigurationDictionary.NAMESPACE_DELIMITER_SYMBOL;
		const criteriaLen = criteria.length;
		for (const key of Object.keys(this._dict)) {
			if (key.length > criteriaLen && key.startsWith(criteria)) {
				return true;
			}
		}
		return false;
	}

	public has(key: string): boolean {
		return key in this._dict;
	}
}

export namespace FConfigurationDictionary {
	export type Data = { readonly [key: string]: string | null };
}
