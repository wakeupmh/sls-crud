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

      const repositoryFilters = {
        brand: request.brand,
        category: request.category,
        productName: request.productName,
        minPrice: request.minPrice,
        maxPrice: request.maxPrice,
        orderBy: request.orderBy,
        orderDirection: request.orderDirection,
        page: request.page,
        pageSize: request.pageSize,
      };

      const products =
        await this.productsRepository.getByFilters(repositoryFilters);

      if (request.minStock || request.maxStock) {
        const filteredProducts = products.products.filter((product) => {
          if (request.minStock && product.stock < request.minStock) {
            return false;
          }
          if (request.maxStock && product.stock > request.maxStock) {
            return false;
          }
          return true;
        });

        this.logger.debug(
          `Applied stock filtering: ${products.products.length} -> ${filteredProducts.length} products`,
        );

        return {
          products: filteredProducts,
          lastEvaluatedKey: products.lastEvaluatedKey,
        };
      }

      this.logger.info("Products retrieved");

      return products;
    } catch (error) {
      this.logger.error("Error getting products", error);
      throw error;
    }
  }
}
