import type { Product } from "../../../domain/products";
import type LoggerProvider from "../../../providers/logging/logger";
import type ProductsRepository from "../../../repositories/products";
import { BadRequestException } from "../../../shared/errors";
import type { CreateProductRequest } from "./create.request";

export default class CreateProduct {
  constructor(
    private readonly logger: LoggerProvider,
    private readonly productsRepository: ProductsRepository,
  ) {}

  async execute(productRequest: CreateProductRequest) {
    try {
      this.logger.debug("Creating product");

      const product: Product = {
        pk: `product#${productRequest.sku}`,
        sk: `product#${productRequest.sku}`,
        sku: productRequest.sku,
        pkBrandPrice: productRequest.brand,
        skBrandPrice: productRequest.price.toString(),
        pkCategoryBrandPrice: productRequest.category,
        skCategoryBrandPrice: `${productRequest.brand}#${productRequest.price}`,
        pkProduct: productRequest.productName,
        stock: productRequest.stock,
        price: productRequest.price,
        productName: productRequest.productName,
        category: productRequest.category,
        brand: productRequest.brand,
        description: productRequest.description,
      };
      this.logger.debug("Product to be created", product);

      await this.productsRepository.save(product);

      this.logger.info("Product created");

      return product;
    } catch (error) {
      if (
        error instanceof Error &&
        error.name.includes("ConditionalCheckFailedException")
      ) {
        this.logger.error("Product already exists", error);
        throw new BadRequestException("Product already exists");
      }

      this.logger.error("Error creating product", error);
      throw error;
    }
  }
}
