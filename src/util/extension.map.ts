declare global {
	interface Map<K, V> {
		toReadonly(): ReadonlyMap<K, V>;
	}
}

export class RuntimeReadonlyMap<K, V> implements ReadonlyMap<K, V> {
	public constructor(private readonly _wrap: Map<K, V>) { }
	public forEach(callbackfn: (
		value: V, key: K, map: ReadonlyMap<K, V>) => void,
		thisArg?: any,
	): void {
		return this._wrap.forEach(callbackfn, thisArg);
	}
	public get(key: K): V | undefined { return this._wrap.get(key); }
	public has(key: K): boolean { return this._wrap.has(key); }
	public get size(): number { return this._wrap.size; }
	public entries(): MapIterator<[K, V]> { return this._wrap.entries(); }
	public keys(): MapIterator<K> { return this._wrap.keys(); }
	public values(): MapIterator<V> { return this._wrap.values(); }
	public [Symbol.iterator](): MapIterator<[K, V]> { return this._wrap[Symbol.iterator](); }
}

Map.prototype.toReadonly = function <K, V>(): ReadonlyMap<K, V> {
	return new RuntimeReadonlyMap(this);
}
