import type LoggerProvider from "../../../providers/logging/logger";
import type ProductsRepository from "../../../repositories/products";
import { BadRequestException } from "../../../shared/errors";
import type { UpdateProductRequest } from "./update.request";

export default class UpdateProduct {
  constructor(
    private readonly logger: LoggerProvider,
    private readonly productsRepository: ProductsRepository,
  ) {}

  async execute(productRequest: UpdateProductRequest) {
    try {
      this.logger.debug("Updating product", productRequest);
      const product = await this.productsRepository.getBySku(
        `product#${productRequest.sku}`,
      );

      if (!product) {
        throw new BadRequestException("Product not found");
      }

      const updatedProduct = {
        pk: `product#${productRequest.sku}` || product.pk,
        sk: `product#${productRequest.sku}` || product.sk,
        sku: productRequest.sku || product.sku,
        pkBrandPrice:
          `brand#${productRequest.brand}#price#${productRequest.price}` ||
          product.pkBrandPrice,
        skBrandPrice: `price#${productRequest.price}` || product.skBrandPrice,
        pkCategoryBrandPrice:
          `category#${productRequest.category}#brand#${productRequest.brand}#price#${productRequest.price}` ||
          product.pkCategoryBrandPrice,
        skCategoryBrandPrice:
          `brand#${productRequest.brand}#price#${productRequest.price}` ||
          product.skCategoryBrandPrice,
        pkProduct: `type#${productRequest.productName}` || product.pkProduct,
        skProduct:
          `productName#${productRequest.productName}` || product.skProduct,
        stock: productRequest.stock || product.stock,
        price: productRequest.price || product.price,
        productName: productRequest.productName || product.productName,
        category: productRequest.category || product.category,
        brand: productRequest.brand || product.brand,
        description: productRequest.description || product.description,
      };
      this.logger.debug("Product to be updated", updatedProduct);

      await this.productsRepository.save(updatedProduct);

      this.logger.info("Product updated");
      return updatedProduct;
    } catch (error) {
      this.logger.error("Error updating product", error);
      throw error;
    }
  }
}
