export class AppError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly context?: Record<string, unknown>
	) {
		super(message);
		this.name = 'AppError';
	}
}

export class SerialError extends AppError {
	constructor(message: string, context?: Record<string, unknown>) {
		super(message, 'SERIAL_ERROR', context);
		this.name = 'SerialError';
	}
}

export class ProtocolError extends AppError {
	constructor(message: string, context?: Record<string, unknown>) {
		super(message, 'PROTOCOL_ERROR', context);
		this.name = 'ProtocolError';
	}
}

export class URDFError extends AppError {
	constructor(message: string, context?: Record<string, unknown>) {
		super(message, 'URDF_ERROR', context);
		this.name = 'URDFError';
	}
}

export class IKError extends AppError {
	constructor(message: string, context?: Record<string, unknown>) {
		super(message, 'IK_ERROR', context);
		this.name = 'IKError';
	}
}
