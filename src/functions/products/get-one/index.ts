import { MiddlewareFactory } from "../../../factories";
import LoggerProvider from "../../../providers/logging/logger";
import { validate } from "../../../providers/zod/validate";
import ProductsRepository from "../../../repositories/products";
import GetOneProduct from "./get-one";
import { getOneProductRequestSchema } from "./get-one.request";

const middlewareFactory = new MiddlewareFactory();
const loggerProvider = new LoggerProvider();
const productsRepository = new ProductsRepository(loggerProvider);

async function lambdaHandler(event: any, _: any) {
	const request = await validate(getOneProductRequestSchema, {
		sku: event.pathParameters.sku,
	});

	const getOneProduct = new GetOneProduct(loggerProvider, productsRepository);

	const product = await getOneProduct.execute(request);

	return {
		statusCode: 200,
		body: product,
	};
}

export const handler = middlewareFactory.create(lambdaHandler);
