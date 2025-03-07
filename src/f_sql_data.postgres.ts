import "@freemework/common";

declare module "@freemework/common" {
	interface FSqlData {
		readonly asStringArray: Array<string>;
		readonly asStringArrayNullable: Array<string> | null;
	}
}
