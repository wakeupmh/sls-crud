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
			this.logger.debug("Creating product", productRequest);

			const product: Product = {
				pk: productRequest.sku,
				sk: "DETAILS",
				productName: productRequest.productName,
				category: productRequest.category,
				brand: productRequest.brand,
				price: productRequest.price,
				stock: productRequest.stock,
				description: productRequest.description,
			};

			await this.productsRepository.save(product);

			this.logger.info("Product created");

			return product;
		} catch (error) {
			this.logger.error("Error creating product", error);
			throw error;
		}
	}
}
