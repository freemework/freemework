import { assert } from "chai";

import { FDecimal, FDecimalBackendNumber } from "../../../src";


type TestCases = Array<[/*left: */string, /*right: */string, /*expectedResult: */boolean, /*backends: */Array<FDecimal.Backend>]>;

const fractionalDigits = 10;
const roundMode = FDecimal.RoundMode.Round;
const operation: FDecimal.Backend = new FDecimalBackendNumber(fractionalDigits, roundMode);

const testCases: TestCases = [
	["6", "5", true, [operation]],
	["5", "5", true, [operation]],
	["-5", "5", false, [operation]],
	["0.1", "0.2", false, [operation]],
	["0.00000000002", "0.00000000001", true, [operation]], // should be round to zero according fractionalDigits === 10
	["0.00000000001", "0.00000000002", true, [operation]], // should be round to zero according fractionalDigits === 10
	["0", "0.2", false, [operation]],
	["354793854793875498379548374958", "3485739854", true, [operation]],
	["35479385479387549837954837.495835", "13.485739", true, [operation]]
];

testCases.forEach(function (testCase) {
	// Unwrap test case data
	const [left, right, expectedResult, backends] = testCase;

	backends.forEach(function (financial: FDecimal.Backend) {

		describe.skip(`gte should be ${left} >= ${right} = ${expectedResult}`, function () {

			it("financial.gte(left: FDecimal, right: FDecimal): boolean", function () {
				const friendlyLeft: FDecimal = financial.parse(left);
				const friendlyRight: FDecimal = financial.parse(right);
				const result: boolean = financial.gte(friendlyLeft, friendlyRight);
				assert.equal(result, expectedResult);
			});
		});
	});
});