declare global {
	interface Set<T> {
		toReadonly(): ReadonlySet<T>;
	}
}

export class RuntimeReadonlySet<T> implements ReadonlySet<T> {
	public constructor(
		private readonly _wrap: Set<T>,
	) { }

	public forEach(callbackfn: (value: T, value2: T, set: ReadonlySet<T>) => void, thisArg?: any): void {
		return this._wrap.forEach(callbackfn, thisArg);
	}
	public has(value: T): boolean { return this._wrap.has(value); }
	public get size(): number { return this._wrap.size; }
	public entries(): SetIterator<[T, T]> { return this._wrap.entries(); }
	public keys(): SetIterator<T> { return this._wrap.keys(); }
	public values(): SetIterator<T> { return this._wrap.values(); }
	public [Symbol.iterator](): SetIterator<T> { return this._wrap[Symbol.iterator](); }
}

Set.prototype.toReadonly = function <T>(): ReadonlySet<T> {
	return new RuntimeReadonlySet(this);
}
