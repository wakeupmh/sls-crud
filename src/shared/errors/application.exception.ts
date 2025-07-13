import type { ErrorType } from "./error.type";

interface MappedErrorContent {
	en: string;
	code: string;
}

export class ApplicationException extends Error {
	public httpCode = 500;
	public code = "application_exception";
	public errors: ErrorType[] = [];
	public currentError = {} as MappedErrorContent;
	public provider?: string;

	constructor(
		message = "No message provided!",
		errors: ErrorType[] = [],
		provider = "",
	) {
		super(message);
		this.errors = errors;

		if (provider) {
			this.provider = provider;
		}
	}

	public setError(lng: keyof MappedErrorContent) {
		if (this.currentError[lng]) {
			this.errors = [
				{
					message: this.currentError[lng],
					code: this.currentError.code,
				},
			];
		}
	}

	public translateError(lng: keyof MappedErrorContent): string {
		if (this.currentError[lng]) {
			return this.currentError[lng];
		}
		return this.message;
	}
}
