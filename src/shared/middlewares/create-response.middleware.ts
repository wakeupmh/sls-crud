import type { Pagination } from "../dto/response";
import { makeAPIGatewayProxyResult } from "../helpers/api-gateway-proxy-result";

export type ResponseToMiddleware = {
	statusCode: number;
	content?: any;
	meta?: Pagination;
	headers?: {
		[header: string]: string | number | boolean;
	};
};

export const createResponseMiddleware = () => {
	const after = async (request: { response: ResponseToMiddleware }) => {
		const { content, meta, headers, statusCode } = request.response;
		const body: any = { ...content };
		if (meta !== undefined) body.meta = meta;
		request.response = makeAPIGatewayProxyResult(body, statusCode, headers);
	};
	return {
		after,
	};
};
