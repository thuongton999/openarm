export function calculateChecksum(data: Uint8Array): number {
	let checksum = 0;
	for (let i = 0; i < data.length; i++) {
		checksum ^= data[i];
	}
	return checksum & 0xff;
}

export function verifyChecksum(data: Uint8Array, checksum: number): boolean {
	return calculateChecksum(data) === checksum;
}
