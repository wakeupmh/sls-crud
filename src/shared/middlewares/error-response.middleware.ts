import { Response } from '../dto/response';
import { ReportException, SystemException } from '../errors';
import {
	HTTP_STATUS,
	makeAPIGatewayProxyResult,
} from '../helpers/api-gateway-proxy-result';

export const errorResponseMiddleware = () => {
	const onError = async (request: any) => {
		const err = request.error;

		const response = new Response<void>();
		if (err instanceof ReportException) {
			const language = request.event.headers?.language || 'mx';
			err.setError(language);
			response.message = err.translateError(language);
			response.errors = err.errors;
			console.warn(
				`Warn: ${err.translateError('en') || 'Not Message seted'}`,
				err,
			);
			return makeAPIGatewayProxyResult<Response<void>>(response, err.httpCode);
		}

		if (err instanceof SystemException) {
			console.error(
				`Error: ${err.translateError('en') || 'Not Message seted'}`,
				err,
			);
			return makeAPIGatewayProxyResult(
				{ message: 'Internal Server error' },
				err.httpCode,
			);
		}

		console.error(`Error: ${err?.message || 'Not Message seted'}`, err);
		return makeAPIGatewayProxyResult(
			{ message: 'Internal Server error' },
			HTTP_STATUS.SERVER_ERROR_INTERNAL,
		);
	};

	return {
		onError,
	};
};
