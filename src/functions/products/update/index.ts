import { MiddlewareFactory } from "../../../factories";
import LoggerProvider from "../../../providers/logging/logger";
import { validate } from "../../../providers/zod/validate";
import ProductsRepository from "../../../repositories/products";
import UpdateProduct from "./update";
import { updateProductRequestSchema } from "./update.request";

const middlewareFactory = new MiddlewareFactory();
const loggerProvider = new LoggerProvider();
const productsRepository = new ProductsRepository();

async function lambdaHandler(event: any, _: any) {
	const request = await validate(updateProductRequestSchema, {
		sku: event.pathParameters.sku,
		...event.body,
	});

	const updateProduct = new UpdateProduct(loggerProvider, productsRepository);
	const product = await updateProduct.execute(request);

	return {
		statusCode: 200,
		body: product,
	};
}

export const handler = middlewareFactory.create(lambdaHandler);
