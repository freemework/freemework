import { FLauncherInitializeRuntimeException } from "./f_launcher_initialize_runtime_exception.js";

export class FLauncherRestartRequiredException extends FLauncherInitializeRuntimeException {
	public readonly exitCode: number;

	public constructor(opts?: { readonly exitCode?: number; readonly message?: string; }) {
		const message: string | null = opts?.message !== undefined ? opts.message : null;
		if (message) {
			super(message);
		} else {
			super();
		}
		this.exitCode = opts?.exitCode !== undefined ? opts.exitCode : 126;
	}
}
