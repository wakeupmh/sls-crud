import type { Product } from "../../../domain/products";
import type LoggerProvider from "../../../providers/logging/logger";
import type ProductsRepository from "../../../repositories/products";
import type { CreateProductRequest } from "./create.request";

export default class CreateProduct {
	constructor(
		private readonly logger: LoggerProvider,
		private readonly productsRepository: ProductsRepository,
	) {}

	async execute(productRequest: CreateProductRequest) {
		try {
			this.logger.debug("Creating product");

			const priceBucket = Math.floor(productRequest.price / 10);

			const product: Product = {
				pk: `product#${productRequest.sku}`,
				sk: productRequest.productName,
				gsi1pk: `product#${productRequest.category}`,
				gsi1sk: productRequest.productName,
				gsi2pk: `product#${productRequest.brand}`,
				gsi2sk: productRequest.productName,
				gsi3pk: `product#${priceBucket}`,
				gsi3sk: productRequest.productName,
				productName: productRequest.productName,
				category: productRequest.category,
				brand: productRequest.brand,
				price: productRequest.price,
				stock: productRequest.stock,
				description: productRequest.description,
			};
			this.logger.debug("Product to be created", product);

			await this.productsRepository.save(product);

			this.logger.info("Product created");

			return product;
		} catch (error) {
			this.logger.error("Error creating product", error);
			throw error;
		}
	}
}
