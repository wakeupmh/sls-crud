export enum HTTP_STATUS {
	OK = 200,
	OK_CREATED = 201,
	OK_ACCEPTED = 202,
	OK_NO_CONTENT = 204,
	CLIENT_ERROR_UNAUTHORIZED = 401,
	CLIENT_ERROR_FORBIDDEN = 403,
	CLIENT_ERROR_BAD_REQUEST = 400,
	CLIENT_ERROR_NOT_FOUND = 404,
	UNPROCESSABLE_ENTITY = 422,
	SERVER_ERROR_INTERNAL = 500,
	MULTI_STATUS = 207,
	NOT_FOUND = 404,
	INTERNAL_SERVER_ERROR = 500,
}
export const makeAPIGatewayProxyResult = <T>(
	body: T,
	status?: HTTP_STATUS,
	headers?: {
		[header: string]: string | number | boolean;
	},
): any => {
	return {
		body: JSON.stringify(body),
		statusCode: status ?? HTTP_STATUS.OK,
		headers: {
			'Access-Control-Allow-Origin': '*',
			...headers,
		},
		isBase64Encoded: false,
	};
};

export const makeAPIGatewayProxyCSVResult = (body: string): any => {
	return {
		body,
		statusCode: HTTP_STATUS.OK,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Content-Type': 'text/csv',
			'Content-disposition': 'attachment; filename=employees.csv',
		},
	};
};
export const makeAPIGatewayBadRequestResult = (errors: {
	[key: string]: string[];
}): any => {
	return makeAPIGatewayProxyResult(
		{ errors },
		HTTP_STATUS.CLIENT_ERROR_BAD_REQUEST,
	);
};
