import {
  type BatchGetItemCommandOutput,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  type DeleteCommandOutput,
  DynamoDBDocumentClient,
  GetCommand,
  type GetCommandOutput,
  PutCommand,
  type PutCommandOutput,
  type QueryCommandOutput,
  UpdateCommand,
  type UpdateCommandOutput,
} from "@aws-sdk/lib-dynamodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Product } from "../domain/products";
import type LoggerProvider from "../providers/logging/logger";
import { SystemException } from "../shared/errors";
import ProductsRepository from "./products";

vi.mock("@aws-sdk/client-dynamodb");
vi.mock("@aws-sdk/lib-dynamodb");

const mockEnv = {
  AWS_REGION: "us-east-1",
  TABLE_NAME: "test-products-table",
};

vi.stubEnv("AWS_REGION", mockEnv.AWS_REGION);
vi.stubEnv("TABLE_NAME", mockEnv.TABLE_NAME);

let repository: ProductsRepository;
let mockLogger: LoggerProvider;
let mockDocClient: any;
let mockDynamoDBClient: any;

const createMockProduct = (overrides: Partial<Product> = {}): Product => ({
  pk: "product#TEST-001",
  sk: "product#TEST-001",
  pkBrandPrice: "TestBrand",
  skBrandPrice: "99.99",
  pkCategoryBrandPrice: "Electronics",
  skCategoryBrandPrice: "TestBrand#99.99",
  pkProduct: "Test Product",
  sku: "TEST-001",
  stock: 10,
  price: 99.99,
  productName: "Test Product",
  category: "Electronics",
  brand: "TestBrand",
  description: "A test product",
  ...overrides,
});

const createMultipleMockProducts = (count: number): Product[] => {
  return Array.from({ length: count }, (_, index) =>
    createMockProduct({
      pk: `product#TEST-${String(index + 1).padStart(3, "0")}`,
      sk: `product#TEST-${String(index + 1).padStart(3, "0")}`,
      sku: `TEST-${String(index + 1).padStart(3, "0")}`,
      productName: `Test Product ${index + 1}`,
      price: 50 + index * 10,
      stock: 5 + index,
    }),
  );
};

const createSuccessfulGetResponse = (item?: Product): GetCommandOutput => ({
  Item: item,
  $metadata: {},
});

const createSuccessfulPutResponse = (): PutCommandOutput => ({
  $metadata: {},
});

const createSuccessfulUpdateResponse = (): UpdateCommandOutput => ({
  $metadata: {},
});

const createSuccessfulDeleteResponse = (): DeleteCommandOutput => ({
  $metadata: {},
});

const createSuccessfulQueryResponse = (
  items: any[] = [],
): QueryCommandOutput => ({
  Items: items,
  Count: items.length,
  ScannedCount: items.length,
  $metadata: {},
});

const createSuccessfulBatchGetResponse = (
  items: any[] = [],
): BatchGetItemCommandOutput => ({
  Responses: {
    [mockEnv.TABLE_NAME]: items,
  },
  $metadata: {},
});

const createConditionalCheckFailedError = () => {
  const error = new Error("The conditional request failed");
  (error as any).name = "ConditionalCheckFailedException";
  return error;
};

describe("ProductsRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.stubEnv("AWS_REGION", mockEnv.AWS_REGION);
    vi.stubEnv("TABLE_NAME", mockEnv.TABLE_NAME);

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as LoggerProvider;

    mockDynamoDBClient = {
      send: vi.fn(),
    };

    mockDocClient = {
      send: vi.fn(),
    };

    vi.mocked(DynamoDBClient).mockImplementation(() => mockDynamoDBClient);
    vi.mocked(DynamoDBDocumentClient.from).mockReturnValue(mockDocClient);

    repository = new ProductsRepository(mockLogger);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Constructor", () => {
    it("should create repository with correct configuration", () => {
      expect(DynamoDBClient).toHaveBeenCalledWith({
        region: "us-east-1",
        maxAttempts: 3,
      });
      expect(DynamoDBDocumentClient.from).toHaveBeenCalledWith(
        mockDynamoDBClient,
        {
          marshallOptions: {
            removeUndefinedValues: true,
            convertEmptyValues: false,
            convertClassInstanceToMap: true,
          },
        },
      );
    });

    it("should throw SystemException when TABLE_NAME is not defined", () => {
      vi.stubEnv("TABLE_NAME", "");

      expect(() => new ProductsRepository(mockLogger)).toThrow(SystemException);
      expect(() => new ProductsRepository(mockLogger)).toThrow(
        "table_name environment variable must be defined",
      );
    });

    it("should use default region when AWS_REGION is not defined", () => {
      vi.stubEnv("AWS_REGION", "");
      vi.clearAllMocks();

      new ProductsRepository(mockLogger);

      expect(DynamoDBClient).toHaveBeenCalledWith({
        region: "us-east-1",
        maxAttempts: 3,
      });
    });
  });

  describe("CRUD Operations", () => {
    describe("save()", () => {
      it("should save a product successfully", async () => {
        const product = createMockProduct();
        mockDocClient.send.mockResolvedValueOnce(createSuccessfulPutResponse());

        await repository.save(product);

        expect(mockDocClient.send).toHaveBeenCalledWith(expect.any(PutCommand));
        expect(mockLogger.debug).toHaveBeenCalledWith(
          "Saving product: ",
          expect.any(Object),
        );
      });

      it("should throw error when product already exists", async () => {
        const product = createMockProduct();
        const conditionalError = createConditionalCheckFailedError();
        mockDocClient.send.mockRejectedValueOnce(conditionalError);

        await expect(repository.save(product)).rejects.toThrow(
          conditionalError,
        );
        expect(mockDocClient.send).toHaveBeenCalledWith(expect.any(PutCommand));
      });
    });

    describe("update()", () => {
      it("should update a product successfully", async () => {
        const updateData = {
          pk: "product#TEST-001",
          productName: "Updated Product",
          price: 149.99,
        };
        mockDocClient.send.mockResolvedValueOnce(
          createSuccessfulUpdateResponse(),
        );

        await repository.update(updateData);

        expect(mockDocClient.send).toHaveBeenCalledWith(
          expect.any(UpdateCommand),
        );
        expect(mockLogger.debug).toHaveBeenCalledWith(
          "Updating product: ",
          expect.any(Object),
        );
      });

      it("should handle update with no valid attributes", async () => {
        const updateData = { pk: "product#TEST-001" };

        await repository.update(updateData);

        expect(mockDocClient.send).not.toHaveBeenCalled();
        expect(mockLogger.warn).toHaveBeenCalledWith(
          "No attributes to update for product",
        );
      });
    });

    describe("delete()", () => {
      it("should delete a product successfully", async () => {
        const pk = "product#TEST-001";
        mockDocClient.send.mockResolvedValueOnce(
          createSuccessfulDeleteResponse(),
        );

        await repository.delete(pk);

        expect(mockDocClient.send).toHaveBeenCalledWith(
          expect.any(DeleteCommand),
        );
        expect(mockLogger.debug).toHaveBeenCalledWith(
          "Deleting product: ",
          expect.any(Object),
        );
      });
    });

    describe("getBySku()", () => {
      it("should return product when found", async () => {
        const product = createMockProduct();
        mockDocClient.send.mockResolvedValueOnce(
          createSuccessfulGetResponse(product),
        );

        const result = await repository.getBySku("product#TEST-001");

        expect(result).toEqual(product);
        expect(mockDocClient.send).toHaveBeenCalledWith(expect.any(GetCommand));
      });

      it("should return null when product not found", async () => {
        mockDocClient.send.mockResolvedValueOnce(createSuccessfulGetResponse());

        const result = await repository.getBySku("product#NONEXISTENT");

        expect(result).toBeUndefined();
        expect(mockDocClient.send).toHaveBeenCalledWith(expect.any(GetCommand));
      });
    });
  });

  describe("Query Methods", () => {
    describe("getByFilters()", () => {
      it("should query by product name successfully", async () => {
        const products = createMultipleMockProducts(2);

        mockDocClient.send
          .mockResolvedValueOnce(
            createSuccessfulQueryResponse([
              { pk: products[0].pk },
              { pk: products[1].pk },
            ]),
          )
          .mockResolvedValueOnce(createSuccessfulBatchGetResponse(products));

        const result = await repository.getByFilters({
          productName: "Test Product",
        });

        expect(result.products).toHaveLength(2);
        expect(mockDocClient.send).toHaveBeenCalledTimes(2);
      });

      it("should throw error when no filter criteria provided", async () => {
        await expect(repository.getByFilters({})).rejects.toThrow(
          SystemException,
        );
        await expect(repository.getByFilters({})).rejects.toThrow(
          "At least one filter criterion (category, brand, or productName) must be provided for efficient queries.",
        );
      });
    });
  });
});
