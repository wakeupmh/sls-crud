import type { ErrorType } from "./error.type";
import { ReportException } from "./report.exception";

export class BadRequestException extends ReportException {
	public httpCode = 400;
	public code = "bad_request";

	constructor(message?: string, errors?: ErrorType[]) {
		super(message, errors);
		this.errors = errors || [
			{ code: this.code, message: message || this.code },
		];
	}
}
