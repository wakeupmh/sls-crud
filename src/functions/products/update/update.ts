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
      const updateData: Partial<typeof product> & { pk: string } = {
        pk: `product#${productRequest.sku}`,
      };

      if (productRequest.productName) {
        updateData.productName = productRequest.productName;
        updateData.pkProduct = productRequest.productName;
      }

      if (productRequest.category) {
        updateData.category = productRequest.category;
      }

      if (productRequest.brand) {
        updateData.brand = productRequest.brand;
      }

      if (productRequest.price) {
        updateData.price = productRequest.price;
      }

      if (productRequest.stock) {
        updateData.stock = productRequest.stock;
      }

      if (productRequest.description) {
        updateData.description = productRequest.description;
      }

      if (productRequest.brand || productRequest.price) {
        const newBrand = productRequest.brand ?? product.brand;
        const newPrice = productRequest.price ?? product.price;
        updateData.pkBrandPrice = newBrand;
        updateData.skBrandPrice = newPrice.toString();
      }

      if (
        productRequest.category ||
        productRequest.brand ||
        productRequest.price
      ) {
        const newCategory = productRequest.category ?? product.category;
        const newBrand = productRequest.brand ?? product.brand;
        const newPrice = productRequest.price ?? product.price;
        updateData.pkCategoryBrandPrice = newCategory;
        updateData.skCategoryBrandPrice = `${newBrand}#${newPrice}`;
      }

      this.logger.debug("Product update data", updateData);

      await this.productsRepository.update(updateData);

      const updatedProduct = await this.productsRepository.getBySku(
        `product#${productRequest.sku}`,
      );

      this.logger.info("Product updated");
      return updatedProduct;
    } catch (error) {
      this.logger.error("Error updating product", error);
      throw error;
    }
  }
}
