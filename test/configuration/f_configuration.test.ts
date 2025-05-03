import { assert } from "chai";

import { FConfiguration, FConfigurationException, FConfigurationValue } from "../../src/index.js";

describe("FConfiguration tests", function () {
	it("factoryJson should should contains proper sourceURI 'configuration:json?data=%7B%22a%22%3A%2242%22%7D'", function () {
		const data = {
			"a": "42"
		};

		const config = FConfiguration.factoryJson(data);

		assert.equal(config.sourceURI.toString(), `configuration:json?data=%7B%22a%22%3A%2242%22%7D`);
	});

	it("factoryJson should get value of 'a.a.a'", function () {
		const config = FConfiguration.factoryJson({
			"a.a.a": "env-own-a"
		});

		assert.equal(config.get("a.a.a").asString, "env-own-a");
	});

	it("Should resolve parent namespace from 'a' as null", function () {
		const config = FConfiguration.factoryJson({
			"a": "env-own-a"
		});

		assert.isNull(config.namespaceParent);
	});

	it("Should resolve parent namespace from 'a.b' as null", function () {
		const config = FConfiguration.factoryJson({
			"a.b": "env-own-a"
		});

		assert.isNull(config.namespaceParent);
	});

	it("Should resolve parent namespace from 'a.b.c' as null", function () {
		const config = FConfiguration.factoryJson({
			"a.b.c": "env-own-a"
		});

		assert.isNull(config.namespaceParent);
	});


	it("Should resolve parent namespace from 'a.b.c' with sub configuration 'a'", function () {
		const config = FConfiguration.factoryJson({
			"a.b.c": "env-own-a"
		});

		const subConfig = config.getNamespace("a");

		assert.equal(subConfig.namespaceParent, "a");
	});

	it("Should resolve parent namespace from 'a.b.c' with sub configuration 'a.b'", function () {
		const config = FConfiguration.factoryJson({
			"a.b.c": "env-own-a"
		});

		const subConfig = config.getNamespace("a.b");

		assert.equal(subConfig.namespaceParent, "b");
	});

	it('factoryJson should expand json of {"a":{"b":{"c":42}}} into {"a.b.c":42}', function () {
		const config = FConfiguration.factoryJson(
			{
				a: {
					b: {
						c: 42
					}
				}
			}
		);

		assert.equal(config.get("a.b.c").asInteger, 42);
	});

	it('factoryJson should expand json of {"a":{"b":[{"c":40},{"c":41},{"c":42}]}} into {"a.b.0.c":40,"a.b.1.c":41,"a.b.2.c":42}', function () {
		const config = FConfiguration.factoryJson(
			{
				a: {
					b: [
						{
							c: 40
						},
						{
							c: 41
						},
						{
							c: 42
						}
					],
					"b.indexes": "0 2"
				}
			}
		);

		assert.equal(config.get("a.b.0.c").asString, "40");
		assert.equal(config.get("a.b.1.c").asString, "41");
		assert.equal(config.get("a.b.2.c").asString, "42");

		const array: ReadonlyArray<FConfiguration> = config.getArray("a.b");
		assert.equal(array.length, 2);
		assert.equal(array[0]!.get("c").asInteger, 40);
		assert.equal(array[1]!.get("c").asInteger, 42);
	});

	it('factoryJson should expand json of {"a":{"b":[{"c":40,"index":"ix0"},{"c":41,"index":"ix1"},{"c":42,"index":"ix2"}]}} into {"a.b.ix0.c":40,"a.b.ix1.c":41,"a.b.ix2.c":42}', function () {
		const config = FConfiguration.factoryJson(
			{
				a: {
					b: [
						{
							c: 40,
							index: "ix0"
						},
						{
							c: 41,
							index: "ix1",
						},
						{
							c: 42,
							index: "ix2",
						}
					],
					"b.indexes": "ix0 ix2"
				}
			}
		);

		assert.equal(config.get("a.b.ix0.c").asString, "40");
		assert.equal(config.get("a.b.ix1.c").asString, "41");
		assert.equal(config.get("a.b.ix2.c").asString, "42");

		const array: ReadonlyArray<FConfiguration> = config.getArray("a.b");
		assert.equal(array.length, 2);
		assert.equal(array[0]!.get("c").asInteger, 40);
		assert.equal(array[1]!.get("c").asInteger, 42);
	});

	it('factoryJson should expand json of {"a":{"b":[{"c":40,"idx":"ix0"},{"c":41,"idx":"ix1"},{"c":42,"idx":"ix2"}]}} into {"a.b.ix0.c":40,"a.b.ix1.c":41,"a.b.ix2.c":42}', function () {
		const config = FConfiguration.factoryJson(
			{
				a: {
					b: [
						{
							c: 40,
							idx: "ix0"
						},
						{
							c: 41,
							idx: "ix1",
						},
						{
							c: 42,
							idx: "ix2",
						}
					],
					"b.indexes": "ix0 ix2"
				}
			},
			"idx"
		);

		assert.equal(config.get("a.b.ix0.c").asString, "40");
		assert.equal(config.get("a.b.ix1.c").asString, "41");
		assert.equal(config.get("a.b.ix2.c").asString, "42");

		const array: ReadonlyArray<FConfiguration> = config.getArray("a.b");
		assert.equal(array.length, 2);
		assert.equal(array[0]!.get("c").asInteger, 40);
		assert.equal(array[1]!.get("c").asInteger, 42);
	});

	it("Empty strings should be presented as null value", function () {
		const data = { "a": "" };

		const config = FConfiguration.factoryJson(data);

		const aValueNullable: FConfigurationValue = config.get("a");
		assert.throw(() => { aValueNullable.asString; }, FConfigurationException);
		assert.isNull(aValueNullable.asStringNullable);
	});

	it("Should be able to obtain empty string via default value", function () {
		const emptyString = "";

		const data = { "a": emptyString };

		const config = FConfiguration.factoryJson(data);

		const aValueDefault: FConfigurationValue = config.get("a", emptyString);
		assert.equal(aValueDefault.asString, emptyString);
		assert.equal(aValueDefault.asStringNullable, emptyString);
	});

	it("Should read positive integer", function () {
		const data = {
			"a": "42"
		};

		const config = FConfiguration.factoryJson(data);

		assert.equal(config.get("a").asIntegerPositive, 42);
	});

	it("Should read negative integer", function () {
		const data = {
			"a": "-42"
		};

		const config = FConfiguration.factoryJson(data);

		assert.equal(config.get("a").asIntegerNegative, -42);
	});
});

describe("FConfiguration#toDynamicView() tests", function () {
	it.skip("Should have $root", function () {
		const config = FConfiguration.factoryJson({
			"item.0": "example.org",
			"item.1": "example.org.devel",
			"proxy.haproxy.image": "haproxy:3.0.10",
		});

		const viewRoot = config.toDynamicView();
		assert.isDefined(viewRoot);

		const items = viewRoot["item"];
		assert.isDefined(items);

		const itemsRoot = items["$root"];
		assert.strictEqual(itemsRoot, viewRoot);
		assert.strictEqual(itemsRoot, viewRoot["$root"]);
	});

	it.skip("Should have $parent", function () {
		const config = FConfiguration.factoryJson({
			"item.0": "example.org",
			"item.1": "example.org.devel",
			"proxy.haproxy.image": "haproxy:3.0.10",
		});

		const viewRoot = config.toDynamicView();
		assert.isDefined(viewRoot);

		const items = viewRoot["item"];
		assert.isDefined(items);

		const itemsParent = items["$parent"];
		assert.strictEqual(itemsParent, viewRoot);
	});

	it("random tests (need to split)", function () {
		const config = FConfiguration.factoryJson({
			"item.0": "example.org",
			"item.1": "example.org.devel",
			"proxy.haproxy.image": "haproxy:3.0.10",
			"proxy.socat.image": "alpine/socat:1.8.0.1",
		});

		const viewRoot = config.toDynamicView();
		assert.isDefined(viewRoot);

		const viewKeys = Object.keys(viewRoot);
		assert.isDefined(viewKeys);

		const mandatoryItems = viewRoot["item"];
		assert.isDefined(mandatoryItems);
		const mandatoryItemsArray = mandatoryItems["$array"];
		assert.isArray(mandatoryItemsArray);

		const optionalItems = viewRoot["?item"];
		assert.isDefined(optionalItems);
		const optionalItemsArray = optionalItems["$array"];
		assert.isArray(optionalItemsArray);

		const optionalNonExistingItems = viewRoot["?non_existing_item"];
		assert.isNull(optionalNonExistingItems);

		const mandatoryProxy = viewRoot["proxy"];
		assert.isDefined(mandatoryProxy);
		const mandatoryProxyKeys = Object.keys(mandatoryProxy);
		assert.isDefined(mandatoryProxyKeys);

		const mandatorySocat = mandatoryProxy["socat"];
		assert.isDefined(mandatorySocat);
		const mandatorySocatImage = mandatorySocat["image"];
		assert.isString(mandatorySocatImage);
		assert.equal(mandatorySocatImage, "alpine/socat:1.8.0.1");

		const optionalSocat = mandatoryProxy["?socat"];
		assert.isDefined(optionalSocat);
		assert.equal(optionalSocat["image"], "alpine/socat:1.8.0.1");
	});
});

describe("FConfigurationValue Tests", function () {
	let config: FConfiguration;

	beforeEach(async () => {
		config = FConfiguration.factoryJson({
			"a.b.c.url": "http://127.0.0.1",
		});
	});

	it("Should contain full key name via namespace 'a'", function () {
		const innerConfiguration: FConfiguration = config.getNamespace("a");
		const urlConfigurationValue: FConfigurationValue = innerConfiguration.get("b.c.url");
		assert.equal(urlConfigurationValue.key, "a.b.c.url");
	});

	it("Should contain full key name via namespace 'a.b'", function () {
		const innerConfiguration: FConfiguration = config.getNamespace("a.b");
		const urlConfigurationValue: FConfigurationValue = innerConfiguration.get("c.url");
		assert.equal(urlConfigurationValue.key, "a.b.c.url");
	});

	it("Should contain full key name via namespace 'a.b.c'", function () {
		const innerConfiguration: FConfiguration = config.getNamespace("a.b.c");
		const urlConfigurationValue: FConfigurationValue = innerConfiguration.get("url");
		assert.equal(urlConfigurationValue.key, "a.b.c.url");
	});
});

describe("FConfiguration Negative test", function () {
	let config: FConfiguration;

	beforeEach(async () => {
		config = FConfiguration.factoryJson({
			"boolean": "123",
			"int": "fake",
			"float": "fake",
			"enable": "fake",
			"base64": "wrong_base64",
			"a.b.c.url": "wrong_url",
		});
	});

	it("Should be execution error Wrong argument on getConfiguration #2", function () {
		let ex;
		try {
			config.getNamespace("a.b").getNamespace("o.l.o.l.o");
		} catch (err) {
			ex = err;
		}

		assert.isDefined(ex);
		assert.instanceOf(ex, FConfigurationException);
		assert.equal((<FConfigurationException>ex).key, "a.b.o.l.o.l.o");
	});
	it("Should be execution error Wrong argument on getConfiguration #3", function () {
		assert.isTrue(config.getNamespace("a.b").hasNamespace("c"), "Should exist: a.b.c");
		assert.isFalse(config.getNamespace("a.b").hasNamespace("o.l.o.l.o"), "Should not exist: a.b.o.l.o.l.o");
	});
	it("Should be execution error not found key", function () {
		let ex;
		try {
			const fake = "fake";
			config.get(fake);
		} catch (err) {
			ex = err;
		}

		assert.isDefined(ex);
		assert.instanceOf(ex, FConfigurationException);
		assert.equal((<FConfigurationException>ex).key, "fake");

	});
	it("Should be execution error Bad type of key on getBoolean", function () {
		let ex;
		try {
			config.get("boolean").asBoolean;
		} catch (err) {
			ex = err;
		}

		assert.isDefined(ex);
		assert.instanceOf(ex, FConfigurationException);
		assert.equal((<FConfigurationException>ex).key, "boolean");

	});
	it("Should be execution error Bad type of key on getInteger", function () {
		let ex;
		try {
			config.get("int").asInteger;
		} catch (err) {
			ex = err;
		}

		assert.isDefined(ex);
		assert.instanceOf(ex, FConfigurationException);
		assert.equal((<FConfigurationException>ex).key, "int");

	});
	it("Should be execution error Bad type of key on getFloat", function () {
		let ex;
		try {
			config.get("float").asNumber;
		} catch (err) {
			ex = err;
		}

		assert.isDefined(ex);
		assert.instanceOf(ex, FConfigurationException);
		assert.equal((<FConfigurationException>ex).key, "float");

	});
	it("Should be execution error Bad type of key on getEnabled", function () {
		let ex;
		try {
			config.get("enable").asBoolean;
		} catch (err) {
			ex = err;
		}

		assert.isDefined(ex);
		assert.instanceOf(ex, FConfigurationException);
		assert.equal((<FConfigurationException>ex).key, "enable");

	});
	it("Should be execution error Bad type of key on getBase64", function () {
		let ex;
		try {
			config.get("base64").asBase64;
		} catch (err) {
			ex = err;
		}

		assert.isDefined(ex);
		assert.instanceOf(ex, FConfigurationException);
		assert.equal((<FConfigurationException>ex).key, "base64");
	});
	it("Should raise exception for key on get().asUrl", function () {
		let ex;
		try {
			config
				.getNamespace("a")
				.getNamespace("b")
				.getNamespace("c")
				.get("url")
				.asUrl;
		} catch (err) {
			ex = err;
		}

		assert.isDefined(ex);
		assert.instanceOf(ex, FConfigurationException);
		assert.equal((<FConfigurationException>ex).key, "a.b.c.url");
	});
	it(`getNamespace() should raise error about missing "a" namespace`, () => {
		const config: FConfiguration = FConfiguration.factoryJson({
			// Empty config data
		});

		let ex;
		try {
			config.getNamespace("a");
		} catch (err) {
			ex = err;
		}

		assert.isDefined(ex);
		assert.instanceOf(ex, FConfigurationException);
		assert.equal((<FConfigurationException>ex).message, "There are a problem with configuration key 'a'. Namespace 'a' was not found in the configuration.");
	});

	it(`getArray() should raise error about missing "a.b" namespace`, () => {
		const config: FConfiguration = FConfiguration.factoryJson({
			"a": {
				// Fake runtime data
				"fake": "42"
			}
		});

		const ns: FConfiguration = config.getNamespace("a");

		let ex;
		try {
			ns.getArray("b");
		} catch (err) {
			ex = err;
		}

		assert.isDefined(ex);
		assert.instanceOf(ex, FConfigurationException);
		assert.equal((<FConfigurationException>ex).message, "There are a problem with configuration key 'a.b'. Namespace 'a.b' was not found in the configuration.");
	});
});
