import { MiddlewareFactory } from "../../../factories";
import LoggerProvider from "../../../providers/logging/logger";
import { validate } from "../../../providers/zod/validate";
import ProductsRepository from "../../../repositories/products";
import DeleteProduct from "./delete";
import { deleteProductRequestSchema } from "./delete.request";

const middlewareFactory = new MiddlewareFactory();
const loggerProvider = new LoggerProvider();
const productsRepository = new ProductsRepository();
const deleteProduct = new DeleteProduct(loggerProvider, productsRepository);

const lambdaHandler = async (event: any, _: any) => {
	const request = await validate(
		deleteProductRequestSchema,
		event.pathParameters,
	);
	await deleteProduct.execute(request);

	return {
		statusCode: 204,
	};
};

export const handler = middlewareFactory.create(lambdaHandler);
