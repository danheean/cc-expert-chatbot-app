export function executeWithTimeout<T>(
	fn: () => Promise<T>,
	ms: number,
): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const timer = setTimeout(() => {
			reject(new Error("Tool execution timeout"));
		}, ms);

		fn().then(
			(value) => {
				clearTimeout(timer);
				resolve(value);
			},
			(err: unknown) => {
				clearTimeout(timer);
				reject(err);
			},
		);
	});
}
