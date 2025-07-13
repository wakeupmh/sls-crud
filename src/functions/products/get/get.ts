import type LoggerProvider from "../../../providers/logging/logger";
import type ProductsRepository from "../../../repositories/products";
import type { GetProductsRequest } from "./get.request";

export default class GetProducts {
	constructor(
		private readonly logger: LoggerProvider,
		private readonly productsRepository: ProductsRepository,
	) {}
	async execute(request: GetProductsRequest) {
		try {
			this.logger.debug("Getting products", request);

			const products = await this.productsRepository.getByFilters(request);

			this.logger.info("Products retrieved");

			return products;
		} catch (error) {
			this.logger.error("Error getting products", error);
			throw error;
		}
	}
}
