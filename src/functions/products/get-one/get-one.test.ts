import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Product } from "../../../domain/products";
import type LoggerProvider from "../../../providers/logging/logger";
import type ProductsRepository from "../../../repositories/products";
import GetOneProduct from "./get-one";
import type { GetOneProductRequest } from "./get-one.request";

describe("GetOneProduct", () => {
  let getOneProduct: GetOneProduct;
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

    getOneProduct = new GetOneProduct(mockLogger, mockProductsRepository);
  });

  describe("execute", () => {
    const mockProduct: Product = {
      pk: "product#TEST-SKU-001",
      sk: "product#TEST-SKU-001",
      sku: "TEST-SKU-001",
      pkBrandPrice: "brand#TestBrand#price#99.99",
      skBrandPrice: "price#99.99",
      pkCategoryBrandPrice: "category#Electronics#brand#TestBrand#price#99.99",
      skCategoryBrandPrice: "brand#TestBrand#price#99.99",
      pkProduct: "type#Test Product",
      stock: 10,
      price: 99.99,
      productName: "Test Product",
      category: "Electronics",
      brand: "TestBrand",
      description: "A test product",
    };

    it("should get a product successfully", async () => {
      const request: GetOneProductRequest = {
        sku: "TEST-SKU-001",
      };
      vi.mocked(mockProductsRepository.getBySku).mockResolvedValue(mockProduct);

      const result = await getOneProduct.execute(request);

      expect(mockProductsRepository.getBySku).toHaveBeenCalledWith(
        "product#TEST-SKU-001",
      );
      expect(result).toEqual(mockProduct);
      expect(mockLogger.debug).toHaveBeenCalledWith("Getting product", request);
      expect(mockLogger.info).toHaveBeenCalledWith("Product retrieved");
    });

    it("should return null when product is not found", async () => {
      const request: GetOneProductRequest = {
        sku: "NON-EXISTENT-SKU",
      };
      vi.mocked(mockProductsRepository.getBySku).mockResolvedValue(null);

      const result = await getOneProduct.execute(request);

      expect(mockProductsRepository.getBySku).toHaveBeenCalledWith(
        "product#NON-EXISTENT-SKU",
      );
      expect(result).toBeNull();
      expect(mockLogger.info).toHaveBeenCalledWith("Product retrieved");
    });

    it("should handle repository errors", async () => {
      const request: GetOneProductRequest = {
        sku: "TEST-SKU-001",
      };
      const error = new Error("Repository error");
      vi.mocked(mockProductsRepository.getBySku).mockRejectedValue(error);

      await expect(getOneProduct.execute(request)).rejects.toThrow(
        "Repository error",
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error getting product",
        error,
      );
    });

    it("should format SKU correctly for repository call", async () => {
      const request: GetOneProductRequest = {
        sku: "ANOTHER-SKU-123",
      };
      vi.mocked(mockProductsRepository.getBySku).mockResolvedValue(mockProduct);

      await getOneProduct.execute(request);

      expect(mockProductsRepository.getBySku).toHaveBeenCalledWith(
        "product#ANOTHER-SKU-123",
      );
    });

    it("should log request details", async () => {
      const request: GetOneProductRequest = {
        sku: "TEST-SKU-001",
      };
      vi.mocked(mockProductsRepository.getBySku).mockResolvedValue(mockProduct);

      await getOneProduct.execute(request);

      expect(mockLogger.debug).toHaveBeenCalledWith("Getting product", request);
    });
  });
});
