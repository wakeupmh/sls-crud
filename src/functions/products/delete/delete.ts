import type LoggerProvider from "../../../providers/logging/logger";
import type ProductsRepository from "../../../repositories/products";
import type { DeleteProductRequest } from "./delete.request";

export default class DeleteProduct {
	private readonly logger: LoggerProvider;
	private readonly productsRepository: ProductsRepository;

	constructor(logger: LoggerProvider, productsRepository: ProductsRepository) {
		this.logger = logger;
		this.productsRepository = productsRepository;
	}

	async execute(request: DeleteProductRequest) {
		try {
			this.logger.debug("Deleting product", request);

			await this.productsRepository.delete(request.sku);

			this.logger.info("Product deleted");

			return;
		} catch (error) {
			this.logger.error("Error deleting product", error);
			throw error;
		}
	}
}
