import type LoggerProvider from "../../../providers/logging/logger";
import type ProductsRepository from "../../../repositories/products";
import { BadRequestException } from "../../../shared/errors";
import type { UpdateProductRequest } from "./update.request";

export default class UpdateProduct {
	private logger: LoggerProvider;
	private productsRepository: ProductsRepository;

	constructor(logger: LoggerProvider, productsRepository: ProductsRepository) {
		this.logger = logger;
		this.productsRepository = productsRepository;
	}

	async execute(request: UpdateProductRequest) {
		try {
			this.logger.debug("Updating product", request);
			const product = await this.productsRepository.getByPkAndSk({
				pk: request.sku,
				sk: "DETAILS",
			});

			if (!product) {
				throw new BadRequestException("Product not found");
			}

			const updatedProduct = {
				...product,
				...request,
			};

			await this.productsRepository.save(updatedProduct);

			this.logger.info("Product updated");
			return updatedProduct;
		} catch (error) {
			this.logger.error("Error updating product", error);
			throw error;
		}
	}
}
