import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PresentationProduct } from "../../../domain/products";
import type LoggerProvider from "../../../providers/logging/logger";
import type ProductsRepository from "../../../repositories/products";
import GetProducts from "./get";
import type { GetProductsRequest } from "./get.request";

describe("GetProducts", () => {
  let getProducts: GetProducts;
  let mockLogger: LoggerProvider;
  let mockProductsRepository: ProductsRepository;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    } as unknown as LoggerProvider;

    mockProductsRepository = {
      save: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      getBySku: vi.fn(),
      getByFilters: vi.fn(),
    } as unknown as ProductsRepository;

    getProducts = new GetProducts(mockLogger, mockProductsRepository);
  });

  describe("execute", () => {
    const mockProducts: PresentationProduct[] = [
      {
        sku: "TEST-SKU-001",
        productName: "Test Product 1",
        category: "Electronics",
        brand: "TestBrand",
        price: 99.99,
        stock: 10,
        description: "A test product",
      },
      {
        sku: "TEST-SKU-002",
        productName: "Test Product 2",
        category: "Electronics",
        brand: "TestBrand",
        price: 149.99,
        stock: 5,
        description: "Another test product",
      },
    ];

    const mockRepositoryResponse = {
      products: mockProducts,
      lastEvaluatedKey: { pk: "TEST-SKU-002" },
    };

    it("should get products successfully with basic filters", async () => {
      const request: GetProductsRequest = {
        category: "Electronics",
        page: 1,
        pageSize: 10,
        minPrice: undefined,
        maxPrice: undefined,
        minStock: undefined,
        maxStock: undefined,
      };
      vi.mocked(mockProductsRepository.getByFilters).mockResolvedValue(
        mockRepositoryResponse,
      );

      const result = await getProducts.execute(request);

      expect(mockProductsRepository.getByFilters).toHaveBeenCalledWith(request);
      expect(result).toEqual(mockRepositoryResponse);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Getting products",
        request,
      );
      expect(mockLogger.info).toHaveBeenCalledWith("Products retrieved");
    });

    it("should get products with price range filters", async () => {
      const request: GetProductsRequest = {
        category: "Electronics",
        minPrice: 50,
        maxPrice: 200,
        minStock: undefined,
        maxStock: undefined,
        orderBy: "price",
        orderDirection: "ASC",
        page: 1,
        pageSize: 20,
      };
      vi.mocked(mockProductsRepository.getByFilters).mockResolvedValue(
        mockRepositoryResponse,
      );

      const result = await getProducts.execute(request);

      expect(mockProductsRepository.getByFilters).toHaveBeenCalledWith(request);
      expect(result).toEqual(mockRepositoryResponse);
    });

    it("should get products with brand filter", async () => {
      const request: GetProductsRequest = {
        brand: "TestBrand",
        minPrice: undefined,
        maxPrice: undefined,
        minStock: undefined,
        maxStock: undefined,
        orderBy: "name",
        orderDirection: "DESC",
        page: 2,
        pageSize: 5,
      };
      vi.mocked(mockProductsRepository.getByFilters).mockResolvedValue(
        mockRepositoryResponse,
      );

      const result = await getProducts.execute(request);

      expect(mockProductsRepository.getByFilters).toHaveBeenCalledWith(request);
      expect(result).toEqual(mockRepositoryResponse);
    });

    it("should get products with product name filter", async () => {
      const request: GetProductsRequest = {
        productName: "Test Product",
        minPrice: undefined,
        maxPrice: undefined,
        minStock: undefined,
        maxStock: undefined,
        page: 1,
        pageSize: 10,
      };
      vi.mocked(mockProductsRepository.getByFilters).mockResolvedValue(
        mockRepositoryResponse,
      );

      const result = await getProducts.execute(request);

      expect(mockProductsRepository.getByFilters).toHaveBeenCalledWith(request);
      expect(result).toEqual(mockRepositoryResponse);
    });

    it("should handle empty results", async () => {
      const request: GetProductsRequest = {
        category: "NonExistent",
        minPrice: undefined,
        maxPrice: undefined,
        minStock: undefined,
        maxStock: undefined,
        page: 1,
        pageSize: 10,
      };
      const emptyResponse = { products: [] };
      vi.mocked(mockProductsRepository.getByFilters).mockResolvedValue(
        emptyResponse,
      );

      const result = await getProducts.execute(request);

      expect(result).toEqual(emptyResponse);
      expect(mockLogger.info).toHaveBeenCalledWith("Products retrieved");
    });

    it("should handle repository errors", async () => {
      const request: GetProductsRequest = {
        category: "Electronics",
        minPrice: undefined,
        maxPrice: undefined,
        minStock: undefined,
        maxStock: undefined,
        page: 1,
        pageSize: 10,
      };
      const error = new Error("Repository error");
      vi.mocked(mockProductsRepository.getByFilters).mockRejectedValue(error);

      await expect(getProducts.execute(request)).rejects.toThrow(
        "Repository error",
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error getting products",
        error,
      );
    });

    it("should handle complex filter combinations", async () => {
      const request: GetProductsRequest = {
        category: "Electronics",
        brand: "TestBrand",
        minPrice: 50,
        maxPrice: 200,
        minStock: undefined,
        maxStock: undefined,
        orderBy: "stock",
        orderDirection: "DESC",
        page: 1,
        pageSize: 15,
      };
      vi.mocked(mockProductsRepository.getByFilters).mockResolvedValue(
        mockRepositoryResponse,
      );

      const result = await getProducts.execute(request);

      expect(mockProductsRepository.getByFilters).toHaveBeenCalledWith(request);
      expect(result).toEqual(mockRepositoryResponse);
    });
  });
});
