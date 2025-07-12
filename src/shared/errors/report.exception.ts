import { ApplicationException } from './application.exception';
import type { ErrorType } from './error.type';

export class ReportException extends ApplicationException {
	public code = 'report_exception';

	constructor(message?: string, errors: ErrorType[] = []) {
		super(message, errors);
	}
}
