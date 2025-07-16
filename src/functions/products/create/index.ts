import { MiddlewareFactory } from "../../../factories";
import LoggerProvider from "../../../providers/logging/logger";
import { validate } from "../../../providers/zod/validate";
import ProductsRepository from "../../../repositories/products";
import CreateProduct from "./create";
import { createProductRequestSchema } from "./create.request";

const middlewareFactory = new MiddlewareFactory();
const loggerProvider = new LoggerProvider();
const productsRepository = new ProductsRepository(loggerProvider);

const createProduct = new CreateProduct(loggerProvider, productsRepository);

async function lambdaHandler(event: any, _: any) {
  const request = await validate(createProductRequestSchema, event.body);
  const product = await createProduct.execute(request);
  return {
    statusCode: 201,
    content: product,
  };
}

export const handler = middlewareFactory.create(lambdaHandler);
