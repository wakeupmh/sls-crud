import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Product } from "../../../domain/products";
import type LoggerProvider from "../../../providers/logging/logger";
import type ProductsRepository from "../../../repositories/products";
import { BadRequestException } from "../../../shared/errors";
import UpdateProduct from "./update";
import type { UpdateProductRequest } from "./update.request";

describe("UpdateProduct", () => {
  let updateProduct: UpdateProduct;
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

    updateProduct = new UpdateProduct(mockLogger, mockProductsRepository);
  });

  describe("execute", () => {
    const existingProduct: Product = {
      pk: "product#TEST-SKU-001",
      sk: "product#TEST-SKU-001",
      sku: "TEST-SKU-001",
      pkBrandPrice: "OldBrand",
      skBrandPrice: "50",
      pkCategoryBrandPrice: "OldCategory",
      skCategoryBrandPrice: "OldBrand#50",
      pkProduct: "Old Product",
      stock: 5,
      price: 50,
      productName: "Old Product",
      category: "OldCategory",
      brand: "OldBrand",
      description: "Old description",
    };

    const updateRequest: UpdateProductRequest = {
      sku: "TEST-SKU-001",
      productName: "Updated Product",
      category: "Electronics",
      brand: "NewBrand",
      price: 99.99,
      stock: 15,
      description: "Updated description",
    };

    it("should update a product successfully", async () => {
      const updatedProduct: Product = {
        pk: "product#TEST-SKU-001",
        sk: "product#TEST-SKU-001",
        sku: "TEST-SKU-001",
        pkBrandPrice: "NewBrand",
        skBrandPrice: "99.99",
        pkCategoryBrandPrice: "Electronics",
        skCategoryBrandPrice: "NewBrand#99.99",
        pkProduct: "Updated Product",
        stock: 15,
        price: 99.99,
        productName: "Updated Product",
        category: "Electronics",
        brand: "NewBrand",
        description: "Updated description",
      };

      vi.mocked(mockProductsRepository.getBySku)
        .mockResolvedValueOnce(existingProduct)
        .mockResolvedValueOnce(updatedProduct);
      vi.mocked(mockProductsRepository.update).mockResolvedValue();

      const result = await updateProduct.execute(updateRequest);

      expect(mockProductsRepository.getBySku).toHaveBeenCalledWith(
        "product#TEST-SKU-001",
      );
      expect(mockProductsRepository.update).toHaveBeenCalledWith({
        pk: "product#TEST-SKU-001",
        productName: "Updated Product",
        category: "Electronics",
        brand: "NewBrand",
        price: 99.99,
        stock: 15,
        description: "Updated description",
        pkProduct: "Updated Product",
        pkBrandPrice: "NewBrand",
        skBrandPrice: "99.99",
        pkCategoryBrandPrice: "Electronics",
        skCategoryBrandPrice: "NewBrand#99.99",
      });

      expect(result).toEqual(updatedProduct);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Updating product",
        updateRequest,
      );
      expect(mockLogger.info).toHaveBeenCalledWith("Product updated");
    });

    it("should throw BadRequestException when product is not found", async () => {
      vi.mocked(mockProductsRepository.getBySku).mockResolvedValue(null);

      await expect(updateProduct.execute(updateRequest)).rejects.toThrow(
        BadRequestException,
      );
      await expect(updateProduct.execute(updateRequest)).rejects.toThrow(
        "Product not found",
      );
      expect(mockProductsRepository.update).not.toHaveBeenCalled();
    });

    it("should handle repository errors during getBySku", async () => {
      const error = new Error("Repository error");
      vi.mocked(mockProductsRepository.getBySku).mockRejectedValue(error);

      await expect(updateProduct.execute(updateRequest)).rejects.toThrow(
        "Repository error",
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error updating product",
        error,
      );
    });

    it("should handle repository errors during update", async () => {
      vi.mocked(mockProductsRepository.getBySku).mockResolvedValue(
        existingProduct,
      );
      const error = new Error("Update error");
      vi.mocked(mockProductsRepository.update).mockRejectedValue(error);

      await expect(updateProduct.execute(updateRequest)).rejects.toThrow(
        "Update error",
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error updating product",
        error,
      );
    });

    it("should log product details before updating", async () => {
      const updatedProduct: Product = {
        pk: "product#TEST-SKU-001",
        sk: "product#TEST-SKU-001",
        sku: "TEST-SKU-001",
        pkBrandPrice: "NewBrand",
        skBrandPrice: "99.99",
        pkCategoryBrandPrice: "Electronics",
        skCategoryBrandPrice: "NewBrand#99.99",
        pkProduct: "Updated Product",
        stock: 15,
        price: 99.99,
        productName: "Updated Product",
        category: "Electronics",
        brand: "NewBrand",
        description: "Updated description",
      };

      vi.mocked(mockProductsRepository.getBySku)
        .mockResolvedValueOnce(existingProduct)
        .mockResolvedValueOnce(updatedProduct);
      vi.mocked(mockProductsRepository.update).mockResolvedValue();

      await updateProduct.execute(updateRequest);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Updating product",
        updateRequest,
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Product update data",
        expect.objectContaining({
          pk: "product#TEST-SKU-001",
          productName: "Updated Product",
          category: "Electronics",
          brand: "NewBrand",
          price: 99.99,
          stock: 15,
          description: "Updated description",
        }),
      );
    });

    it("should preserve existing values when update fields are not provided", async () => {
      const partialUpdateRequest: Partial<UpdateProductRequest> = {
        sku: "TEST-SKU-001",
        productName: "Updated Product",
      };
      const updatedProduct: Product = {
        ...existingProduct,
        productName: "Updated Product",
        pkProduct: "Updated Product",
      };

      vi.mocked(mockProductsRepository.getBySku)
        .mockResolvedValueOnce(existingProduct)
        .mockResolvedValueOnce(updatedProduct);
      vi.mocked(mockProductsRepository.update).mockResolvedValue();

      await updateProduct.execute(partialUpdateRequest as any);

      expect(mockProductsRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          pk: "product#TEST-SKU-001",
          productName: "Updated Product",
          pkProduct: "Updated Product",
        }),
      );
    });

    it("should format SKU correctly for repository call", async () => {
      const requestWithDifferentSku = {
        ...updateRequest,
        sku: "ANOTHER-SKU-123",
      };
      const updatedProduct: Product = {
        ...existingProduct,
        sku: "ANOTHER-SKU-123",
        pk: "product#ANOTHER-SKU-123",
        sk: "product#ANOTHER-SKU-123",
      };

      vi.mocked(mockProductsRepository.getBySku)
        .mockResolvedValueOnce(existingProduct)
        .mockResolvedValueOnce(updatedProduct);
      vi.mocked(mockProductsRepository.update).mockResolvedValue();

      await updateProduct.execute(requestWithDifferentSku);

      expect(mockProductsRepository.getBySku).toHaveBeenCalledWith(
        "product#ANOTHER-SKU-123",
      );
    });
  });
});
