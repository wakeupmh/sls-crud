import type LoggerProvider from "../../../providers/logging/logger";
import type ProductsRepository from "../../../repositories/products";
import type { GetOneProductRequest } from "./get-one.request";

export default class GetOneProduct {
	constructor(
		private readonly logger: LoggerProvider,
		private readonly productsRepository: ProductsRepository,
	) {}

	async execute(request: GetOneProductRequest) {
		try {
			this.logger.debug("Getting product", request);

			const product = await this.productsRepository.getByPkAndSk({
				pk: request.sku,
				sk: "DETAILS",
			});

			this.logger.info("Product retrieved");

			return product;
		} catch (error) {
			this.logger.error("Error getting product", error);
			throw error;
		}
	}
}
