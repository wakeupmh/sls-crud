import { beforeEach, describe, expect, it, vi } from "vitest";

import type LoggerProvider from "../../../providers/logging/logger";
import type ProductsRepository from "../../../repositories/products";
import DeleteProduct from "./delete";
import type { DeleteProductRequest } from "./delete.request";

describe("DeleteProduct", () => {
  let deleteProduct: DeleteProduct;
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

    deleteProduct = new DeleteProduct(mockLogger, mockProductsRepository);
  });

  describe("execute", () => {
    const mockRequest: DeleteProductRequest = {
      sku: "TEST-SKU-001",
    };

    it("should delete a product successfully", async () => {
      vi.mocked(mockProductsRepository.delete).mockResolvedValue();

      const result = await deleteProduct.execute(mockRequest);

      expect(mockProductsRepository.delete).toHaveBeenCalledWith(
        "product#TEST-SKU-001",
      );
      expect(result).toBeUndefined();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Deleting product",
        mockRequest,
      );
      expect(mockLogger.info).toHaveBeenCalledWith("Product deleted");
    });

    it("should handle repository errors", async () => {
      const error = new Error("Repository error");
      vi.mocked(mockProductsRepository.delete).mockRejectedValue(error);

      await expect(deleteProduct.execute(mockRequest)).rejects.toThrow(
        "Repository error",
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error deleting product",
        error,
      );
    });

    it("should call repository delete with correct SKU", async () => {
      vi.mocked(mockProductsRepository.delete).mockResolvedValue();
      const request = { sku: "ANOTHER-SKU-123" };

      await deleteProduct.execute(request);

      expect(mockProductsRepository.delete).toHaveBeenCalledWith(
        "product#ANOTHER-SKU-123",
      );
    });
  });
});
