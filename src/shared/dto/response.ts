import type { ErrorType } from "../errors";

export type Pagination = {
	totalPages?: number;
	totalAmount?: number;
	filters?: { [key: string]: any };
};
export class Response<T> {
	message: string | undefined;
	errors: ErrorType[] | undefined;
	content: T | undefined;
	meta?: Pagination;
}
