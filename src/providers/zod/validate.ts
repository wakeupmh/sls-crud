import type { ZodType, z } from 'zod';
import { ZodError } from 'zod';
import { BadRequestException, SystemException } from '../../shared/errors';

export async function validate<T extends ZodType>(
	schema: T,
	objectToValidate: any,
): Promise<z.infer<T>> {
	try {
		return await schema.parseAsync(objectToValidate);
	} catch (error: any) {
		if (error instanceof ZodError) {
			throw new BadRequestException('bad request', error.issues);
		}
		throw new BadRequestException(error);
	}
}
export async function validateCSV<T extends ZodType>(
	schema: T,
	objectToValidate: any,
): Promise<z.infer<T>> {
	try {
		return await schema.parseAsync(objectToValidate);
	} catch (error) {
		if (error instanceof ZodError) {
			throw new Error(
				error.issues
					.map((issue) => `${issue.path} - ${issue.message}`)
					.join(','),
			);
		}
		const errorMessage = (error as Error).message;
		throw new Error(errorMessage);
	}
}
export async function validateQueueRequest<T extends ZodType>(
	schema: T,
	objectToValidate: any,
): Promise<z.infer<T>> {
	try {
		return await schema.parseAsync(objectToValidate);
	} catch (error) {
		if (error instanceof ZodError) {
			throw new SystemException(
				error.issues
					.map((issue) => `${issue.path} - ${issue.message}`)
					.join(','),
			);
		}
		const errorMessage = (error as SystemException).message;
		throw new SystemException(errorMessage);
	}
}
