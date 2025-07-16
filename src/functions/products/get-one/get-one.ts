import type LoggerProvider from "../../../providers/logging/logger";
import type ProductsRepository from "../../../repositories/products";
import { NotFoundException } from "../../../shared/errors";
import type { GetOneProductRequest } from "./get-one.request";

export default class GetOneProduct {
  constructor(
    private readonly logger: LoggerProvider,
    private readonly productsRepository: ProductsRepository,
  ) {}

  async execute(request: GetOneProductRequest) {
    try {
      this.logger.debug("Getting product", request);

      const product = await this.productsRepository.getBySku(
        `product#${request.sku}`,
      );

      if (!product) {
        throw new NotFoundException(`Product not found for sku ${request.sku}`);
      }

      this.logger.info("Product retrieved");

      return {
        sku: product.sku,
        stock: product.stock,
        price: product.price,
        productName: product.productName,
        category: product.category,
        brand: product.brand,
        description: product.description,
      };
    } catch (error) {
      this.logger.error("Error getting product", error);
      throw error;
    }
  }
}
