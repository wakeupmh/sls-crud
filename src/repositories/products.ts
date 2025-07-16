import { BatchGetItemCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { PresentationProduct, Product } from "../domain/products";
import type LoggerProvider from "../providers/logging/logger";
import { SystemException } from "../shared/errors";

export default class ProductsRepository {
  private readonly tableName: string;
  private readonly docClient: DynamoDBDocumentClient;

  constructor(private readonly logger: LoggerProvider) {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || "us-east-1",
      maxAttempts: 3,
    });

    this.docClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        removeUndefinedValues: true,
        convertEmptyValues: false,
        convertClassInstanceToMap: true,
      },
    });

    this.tableName = process.env.TABLE_NAME || "";
    if (!this.tableName) {
      throw new SystemException(
        "table_name environment variable must be defined",
      );
    }
  }

  async save(product: Product): Promise<void> {
    const params = {
      TableName: this.tableName,
      Item: product,
      ConditionExpression: "attribute_not_exists(pk)",
    };
    this.logger.debug("Saving product: ", params);

    await this.docClient.send(new PutCommand(params));
  }

  async update(product: Partial<Product> & { pk: string }): Promise<void> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(product).forEach(([key, value]) => {
      if (key !== "pk" && value) {
        updateExpressions.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    });

    if (updateExpressions.length === 0) {
      this.logger.warn("No attributes to update for product");
      return;
    }

    const params = {
      TableName: this.tableName,
      Key: {
        pk: product.pk,
        sk: product.pk,
      },
      UpdateExpression: `SET ${updateExpressions.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ConditionExpression: "attribute_exists(pk)",
    };

    this.logger.debug("Updating product: ", params);
    await this.docClient.send(new UpdateCommand(params));
  }

  async delete(pk: string): Promise<void> {
    const params = {
      TableName: this.tableName,
      Key: {
        pk,
        sk: pk,
      },
    };
    this.logger.debug("Deleting product: ", params);

    await this.docClient.send(new DeleteCommand(params));
  }

  async getBySku(pk: string): Promise<Product | null> {
    const params = {
      TableName: this.tableName,
      Key: {
        pk,
        sk: pk,
      },
    };
    this.logger.debug("Getting product by sku: ", params);

    const result = await this.docClient.send(new GetCommand(params));
    return result.Item as Product | null;
  }

  async getByFilters(filters: {
    brand?: string;
    category?: string;
    productName?: string;
    minPrice?: number;
    maxPrice?: number;
    orderBy?: "name" | "price" | "stock" | "category" | "brand";
    orderDirection?: "ASC" | "DESC";
    page?: number;
    pageSize?: number;
    lastEvaluatedKey?: Record<string, any>;
  }): Promise<{
    products: PresentationProduct[];
    lastEvaluatedKey?: Record<string, any>;
  }> {
    let productKeys: string[] = [];
    const queryPromises: Array<{
      promise: Promise<string[]>;
      queryType: string;
      params: any;
    }> = [];

    if (filters.productName) {
      queryPromises.push({
        promise: this.productNameIndexQuery({
          productName: filters.productName,
        }),
        queryType: "productNameIndex",
        params: { productName: filters.productName },
      });
    }

    if (
      filters.category &&
      filters.brand &&
      (filters.minPrice || filters.maxPrice)
    ) {
      queryPromises.push({
        promise: this.categoryBrandPriceIndexQuery({
          category: filters.category,
          brand: filters.brand,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
        }),
        queryType: "categoryBrandPriceIndex",
        params: {
          category: filters.category,
          brand: filters.brand,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
        },
      });
    } else if (filters.category && (filters.minPrice || filters.maxPrice)) {
      queryPromises.push({
        promise: this.categoryPriceIndexQuery({
          category: filters.category,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
        }),
        queryType: "categoryPriceIndex",
        params: {
          category: filters.category,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
        },
      });
    } else if (filters.brand && (filters.minPrice || filters.maxPrice)) {
      queryPromises.push({
        promise: this.brandPriceIndexQuery({
          brand: filters.brand,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
        }),
        queryType: "brandPriceIndex",
        params: {
          brand: filters.brand,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
        },
      });
    } else if (filters.category) {
      queryPromises.push({
        promise: this.categoryPriceIndexQuery({
          category: filters.category,
        }),
        queryType: "categoryPriceIndex",
        params: { category: filters.category },
      });
    } else if (filters.brand) {
      queryPromises.push({
        promise: this.brandPriceIndexQuery({
          brand: filters.brand,
        }),
        queryType: "brandPriceIndex",
        params: { brand: filters.brand },
      });
    }

    if (queryPromises.length === 0) {
      throw new SystemException(
        "At least one filter criterion (category, brand, or productName) must be provided for efficient queries.",
      );
    }

    const results = await Promise.allSettled(
      queryPromises.map((q) => q.promise),
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const queryInfo = queryPromises[i];

      if (result.status === "fulfilled") {
        productKeys = [...productKeys, ...result.value];
        this.logger.debug(`GSI query ${queryInfo.queryType} succeeded`, {
          queryType: queryInfo.queryType,
          params: queryInfo.params,
          resultCount: result.value.length,
        });
      } else {
        this.logger.error(`GSI query ${queryInfo.queryType} failed`, {
          queryType: queryInfo.queryType,
          params: queryInfo.params,
          error: result.reason?.message || result.reason,
          errorType: result.reason?.constructor?.name || "Unknown",
        });
      }
    }

    const uniqueKeys = Array.from(new Set(productKeys));

    if (uniqueKeys.length === 0) {
      this.logger.warn("No products found after GSI queries", { filters });
      return { products: [] };
    }

    const products = await this.batchGetProducts(uniqueKeys);

    if (filters.orderBy) {
      products.sort((a: PresentationProduct, b: PresentationProduct) => {
        const aValue = a[filters.orderBy as keyof PresentationProduct];
        const bValue = b[filters.orderBy as keyof PresentationProduct];

        if (typeof aValue === "string" && typeof bValue === "string") {
          return filters.orderDirection === "DESC"
            ? bValue.localeCompare(aValue)
            : aValue.localeCompare(bValue);
        }
        if (typeof aValue === "number" && typeof bValue === "number") {
          return filters.orderDirection === "DESC"
            ? bValue - aValue
            : aValue - bValue;
        }
        return 0;
      });
    }

    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const pageSize =
      filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 20;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    const paginatedProducts = products.slice(startIndex, endIndex);

    let lastEvaluatedKey: any;
    if (endIndex < products.length) {
      const lastProduct = paginatedProducts[paginatedProducts.length - 1];
      lastEvaluatedKey = { pk: lastProduct.sku };
    }

    return {
      products: paginatedProducts,
      lastEvaluatedKey,
    };
  }

  private async batchGetProducts(
    keys: string[],
  ): Promise<PresentationProduct[]> {
    if (keys.length === 0) {
      return [];
    }

    const batchSize = 100;
    const batches: string[][] = [];

    for (let i = 0; i < keys.length; i += batchSize) {
      batches.push(keys.slice(i, i + batchSize));
    }

    const batchPromises = batches.map(async (batchKeys) => {
      const requestItems: Record<string, any> = {
        [this.tableName]: {
          Keys: batchKeys.map((key) => ({
            pk: {
              S: key,
            },
            sk: {
              S: key,
            },
          })),
        },
      };

      try {
        const command = new BatchGetItemCommand({ RequestItems: requestItems });
        const response = await this.docClient.send(command);

        if (!response.Responses || !response.Responses[this.tableName]) {
          return [];
        }

        return response.Responses[this.tableName].map((item) =>
          this.convertToPresentation(item, "batchGet"),
        );
      } catch (error: any) {
        this.logger.error("Error in batch get products:", error);
        throw new SystemException(
          `Failed to batch get products: ${error.message}`,
        );
      }
    });

    const batchResults = await Promise.all(batchPromises);
    return batchResults.flat();
  }

  private async categoryPriceIndexQuery({
    category,
    minPrice,
    maxPrice,
  }: {
    category: string;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<string[]> {
    try {
      let condition = "pkCategoryBrandPrice = :categoryValue";
      const expressionAttributeValues: Record<string, any> = {
        ":categoryValue": category,
      };

      if (minPrice && maxPrice) {
        condition +=
          " AND skCategoryBrandPrice BETWEEN :minPrice AND :maxPrice";
        expressionAttributeValues[":minPrice"] = `#${minPrice}`;
        expressionAttributeValues[":maxPrice"] = `#${maxPrice}`;
      } else if (minPrice && maxPrice === undefined) {
        condition += " AND skCategoryBrandPrice >= :minPrice";
        expressionAttributeValues[":minPrice"] = `#${minPrice}`;
      } else if (minPrice === undefined && maxPrice) {
        condition += " AND skCategoryBrandPrice <= :maxPrice";
        expressionAttributeValues[":maxPrice"] = `#${maxPrice}`;
      }

      const categoryCommand = new QueryCommand({
        TableName: this.tableName,
        IndexName: "categoryBrandPriceIndex",
        KeyConditionExpression: condition,
        ExpressionAttributeValues: expressionAttributeValues,
        ProjectionExpression: "pk",
      });

      this.logger.debug(
        "Querying CategoryBrandPriceIndex for category filter",
        {
          condition,
          category,
          minPrice,
          maxPrice,
        },
      );

      const result = await this.docClient.send(categoryCommand);
      return (result.Items || []).map((item) => item.pk || "");
    } catch (error: any) {
      this.logger.error(
        "Error querying CategoryBrandPriceIndex for category filter",
        {
          category,
          minPrice,
          maxPrice,
          error: error.message,
          errorType: error.constructor?.name || "Unknown",
        },
      );
      throw new SystemException(
        `Failed to query CategoryBrandPriceIndex for category filter: ${error.message}`,
      );
    }
  }

  private async brandPriceIndexQuery({
    brand,
    minPrice,
    maxPrice,
  }: {
    brand: string;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<string[]> {
    try {
      let condition = "pkBrandPrice = :brandValue";
      const expressionAttributeValues: Record<string, any> = {
        ":brandValue": brand,
      };

      if (minPrice && maxPrice) {
        condition += " AND skBrandPrice BETWEEN :minPrice AND :maxPrice";
        expressionAttributeValues[":minPrice"] = minPrice.toString();
        expressionAttributeValues[":maxPrice"] = maxPrice.toString();
      } else if (minPrice && maxPrice === undefined) {
        condition += " AND skBrandPrice >= :minPrice";
        expressionAttributeValues[":minPrice"] = minPrice.toString();
      } else if (minPrice === undefined && maxPrice) {
        condition += " AND skBrandPrice <= :maxPrice";
        expressionAttributeValues[":maxPrice"] = maxPrice.toString();
      }

      const brandCommand = new QueryCommand({
        TableName: this.tableName,
        IndexName: "brandPriceIndex",
        KeyConditionExpression: condition,
        ExpressionAttributeValues: expressionAttributeValues,
        ProjectionExpression: "pk",
      });

      this.logger.debug("Querying BrandPriceIndex", {
        condition,
        brand,
        minPrice,
        maxPrice,
      });

      const result = await this.docClient.send(brandCommand);
      return (result.Items || []).map((item) => item.pk || "");
    } catch (error: any) {
      this.logger.error("Error querying BrandPriceIndex", {
        brand,
        minPrice,
        maxPrice,
        error: error.message,
        errorType: error.constructor?.name || "Unknown",
      });
      throw new SystemException(
        `Failed to query BrandPriceIndex: ${error.message}`,
      );
    }
  }

  private async productNameIndexQuery({
    productName,
  }: {
    productName: string;
  }): Promise<string[]> {
    try {
      const condition = "pkProduct = :productNameValue";
      const expressionAttributeValues: Record<string, any> = {
        ":productNameValue": productName,
      };

      const productNameCommand = new QueryCommand({
        TableName: this.tableName,
        IndexName: "productIndex",
        KeyConditionExpression: condition,
        ExpressionAttributeValues: expressionAttributeValues,
        ProjectionExpression: "pk",
      });

      this.logger.debug("Querying ProductIndex", {
        condition,
        productName,
      });

      const result = await this.docClient.send(productNameCommand);
      return (result.Items || []).map((item) => item.pk || "");
    } catch (error: any) {
      this.logger.error("Error querying ProductIndex", {
        productName,
        error: error.message,
        errorType: error.constructor?.name || "Unknown",
      });
      throw new SystemException(
        `Failed to query ProductIndex: ${error.message}`,
      );
    }
  }

  private async categoryBrandPriceIndexQuery({
    category,
    brand,
    minPrice,
    maxPrice,
  }: {
    category: string;
    brand: string;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<string[]> {
    try {
      let condition = "pkCategoryBrandPrice = :categoryValue";
      const expressionAttributeValues: Record<string, any> = {
        ":categoryValue": category,
      };

      if (minPrice && maxPrice) {
        condition +=
          " AND skCategoryBrandPrice BETWEEN :brandMinPrice AND :brandMaxPrice";
        expressionAttributeValues[":brandMinPrice"] = `${brand}#${minPrice}`;
        expressionAttributeValues[":brandMaxPrice"] = `${brand}#${maxPrice}`;
      } else if (minPrice && maxPrice === undefined) {
        condition += " AND skCategoryBrandPrice >= :brandMinPrice";
        expressionAttributeValues[":brandMinPrice"] = `${brand}#${minPrice}`;
      } else if (minPrice === undefined && maxPrice) {
        condition += " AND skCategoryBrandPrice <= :brandMaxPrice";
        expressionAttributeValues[":brandMaxPrice"] = `${brand}#${maxPrice}`;
      } else {
        condition += " AND begins_with(skCategoryBrandPrice, :brandPrefix)";
        expressionAttributeValues[":brandPrefix"] = `${brand}#`;
      }

      this.logger.debug("Querying CategoryBrandPriceIndex", {
        condition,
        category,
        brand,
        minPrice,
        maxPrice,
      });

      const categoryBrandPriceCommand = new QueryCommand({
        TableName: this.tableName,
        IndexName: "categoryBrandPriceIndex",
        KeyConditionExpression: condition,
        ExpressionAttributeValues: expressionAttributeValues,
        ProjectionExpression: "pk",
      });

      const result = await this.docClient.send(categoryBrandPriceCommand);
      return (result.Items || []).map((item) => item.pk || "");
    } catch (error: any) {
      this.logger.error("Error querying CategoryBrandPriceIndex", {
        category,
        brand,
        minPrice,
        maxPrice,
        error: error.message,
        errorType: error.constructor?.name || "Unknown",
      });
      throw new SystemException(
        `Failed to query CategoryBrandPriceIndex: ${error.message}`,
      );
    }
  }

  private convertToPresentation(
    item: any,
    commandType?: string,
  ): PresentationProduct {
    if (commandType === "batchGet") {
      return {
        sku: item.pk.S || "",
        stock: Number(item.stock.N || 0),
        price: Number(item.price.N || 0),
        productName: item.productName.S || "",
        category: item.category.S || "",
        brand: item.brand.S || "",
        description: item.description.S || "",
      };
    }
    return {
      sku: item.pk || "",
      stock: Number(item.stock || 0),
      price: Number(item.price || 0),
      productName: item.productName || "",
      category: item.category || "",
      brand: item.brand || "",
      description: item.description || "",
    };
  }
}
