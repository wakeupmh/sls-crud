import { ApplicationException } from './application.exception';
import type { ErrorType } from './error.type';

export class SystemException extends ApplicationException {
	public code = 'system_exception';

	constructor(message?: string, errors: ErrorType[] = [], provider = '') {
		super(message, errors, provider);
	}
}
