import { MiddlewareFactory } from "../../../factories";
import LoggerProvider from "../../../providers/logging/logger";
import { validate } from "../../../providers/zod/validate";
import ProductsRepository from "../../../repositories/products";
import GetProducts from "./get";
import { getProductsRequestSchema } from "./get.request";

const middlewareFactory = new MiddlewareFactory();
const loggerProvider = new LoggerProvider();
const productsRepository = new ProductsRepository(loggerProvider);

async function lambdaHandler(event: any, _: any) {
  const request = await validate(getProductsRequestSchema, {
    ...event.queryStringParameters,
  });

  const getProducts = new GetProducts(loggerProvider, productsRepository);

  const products = await getProducts.execute(request);

  return {
    statusCode: 200,
    body: products,
    meta: {
      page: request.page || 1,
      pageSize: request.pageSize || 10,
      total: products.length,
    },
  };
}

export const handler = middlewareFactory.create(lambdaHandler);
