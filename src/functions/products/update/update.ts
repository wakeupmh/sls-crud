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
			const priceBucket = Math.floor(productRequest.price / 10);

			const updatedProduct = {
				pk: `product#${productRequest.sku}` || product.pk,
				sk: productRequest.productName || product.sk,
				gsi1pk: `product#${productRequest.category}` || product.gsi1pk,
				gsi1sk: productRequest.productName || product.gsi1sk,
				gsi2pk: `product#${productRequest.brand}` || product.gsi2pk,
				gsi2sk: productRequest.productName || product.gsi2sk,
				gsi3pk: `product#${priceBucket}` || product.gsi3pk,
				gsi3sk: productRequest.productName || product.gsi3sk,
				productName: productRequest.productName || product.productName,
				category: productRequest.category || product.category,
				brand: productRequest.brand || product.brand,
				price: productRequest.price || product.price,
				stock: productRequest.stock || product.stock,
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
