export const env = {
	isDev: import.meta.env.DEV,
	isProd: import.meta.env.PROD,
	mode: import.meta.env.MODE
};

export const features = {
	hasWebSerial: typeof navigator !== 'undefined' && 'serial' in navigator
};
