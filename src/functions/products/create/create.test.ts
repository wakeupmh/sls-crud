import { beforeEach, describe, expect, it, vi } from "vitest";

import type LoggerProvider from "../../../providers/logging/logger";
import type ProductsRepository from "../../../repositories/products";
import CreateProduct from "./create";
import type { CreateProductRequest } from "./create.request";

describe("CreateProduct", () => {
  let createProduct: CreateProduct;
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

    createProduct = new CreateProduct(mockLogger, mockProductsRepository);
  });

  describe("execute", () => {
    const mockRequest: CreateProductRequest = {
      sku: "TEST-SKU-001",
      productName: "Test Product",
      category: "Electronics",
      brand: "TestBrand",
      price: 99.99,
      stock: 10,
      description: "A test product",
    };

    it("should create a product successfully", async () => {
      vi.mocked(mockProductsRepository.save).mockResolvedValue();

      const result = await createProduct.execute(mockRequest);

      expect(mockProductsRepository.save).toHaveBeenCalledWith({
        pk: "product#TEST-SKU-001",
        sk: "product#TEST-SKU-001",
        sku: "TEST-SKU-001",
        pkBrandPrice: "TestBrand",
        skBrandPrice: "99.99",
        pkCategoryBrandPrice: "Electronics",
        skCategoryBrandPrice: "TestBrand#99.99",
        pkProduct: "Test Product",
        stock: 10,
        price: 99.99,
        productName: "Test Product",
        category: "Electronics",
        brand: "TestBrand",
        description: "A test product",
      });

      expect(result).toEqual({
        pk: "product#TEST-SKU-001",
        sk: "product#TEST-SKU-001",
        sku: "TEST-SKU-001",
        pkBrandPrice: "TestBrand",
        skBrandPrice: "99.99",
        pkCategoryBrandPrice: "Electronics",
        skCategoryBrandPrice: "TestBrand#99.99",
        pkProduct: "Test Product",
        stock: 10,
        price: 99.99,
        productName: "Test Product",
        category: "Electronics",
        brand: "TestBrand",
        description: "A test product",
      });

      expect(mockLogger.debug).toHaveBeenCalledWith("Creating product");
      expect(mockLogger.info).toHaveBeenCalledWith("Product created");
    });

    it("should handle repository errors", async () => {
      const error = new Error("Repository error");
      vi.mocked(mockProductsRepository.save).mockRejectedValue(error);

      await expect(createProduct.execute(mockRequest)).rejects.toThrow(
        "Repository error",
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error creating product",
        error,
      );
    });

    it("should log product details before saving", async () => {
      vi.mocked(mockProductsRepository.save).mockResolvedValue();

      await createProduct.execute(mockRequest);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Product to be created",
        expect.objectContaining({
          sku: "TEST-SKU-001",
          productName: "Test Product",
          category: "Electronics",
          brand: "TestBrand",
          price: 99.99,
          stock: 10,
          description: "A test product",
        }),
      );
    });
  });
});
