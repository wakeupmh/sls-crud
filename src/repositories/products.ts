import type { AttributeValue } from "@aws-sdk/client-dynamodb";
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
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

  async delete(pk: string): Promise<void> {
    const params = {
      TableName: this.tableName,
      Key: {
        pk,
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
  }): Promise<PresentationProduct[]> {
    let products: PresentationProduct[] = [];
    const queryPromises: Promise<PresentationProduct[]>[] = [];

    if (filters.productName) {
      queryPromises.push(
        this.productNameIndexQuery({
          productName: filters.productName,
        }),
      );
    }
    if (
      filters.category &&
      filters.brand &&
      (filters.minPrice || filters.maxPrice)
    ) {
      queryPromises.push(
        this.categoryBrandPriceIndexQuery({
          category: filters.category,
          brand: filters.brand,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
        }),
      );
    } else if (filters.category && (filters.minPrice || filters.maxPrice)) {
      queryPromises.push(
        this.categoryPriceIndexQuery({
          category: filters.category,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
        }),
      );
    } else if (filters.brand && (filters.minPrice || filters.maxPrice)) {
      queryPromises.push(
        this.brandPriceIndexQuery({
          brand: filters.brand,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
        }),
      );
    } else {
      throw new SystemException(
        "At least one specific filter criterion (category, brand, productName, or category/brand with price) must be provided for efficient queries.",
      );
    }

    const results = await Promise.allSettled(queryPromises);

    const allProducts: PresentationProduct[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        allProducts.push(...result.value);
      } else {
        this.logger.error("A GSI query failed:", result.reason);
      }
    }

    const uniqueProductsMap = new Map<string, PresentationProduct>();
    allProducts.forEach((product) => {
      uniqueProductsMap.set(product.sku || "", product);
    });
    products = Array.from(uniqueProductsMap.values());

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

    return products.slice(startIndex, endIndex);
  }

  private async categoryPriceIndexQuery({
    category,
    minPrice,
    maxPrice,
  }: {
    category: string;
    minPrice?: number;
    maxPrice?: number;
  }) {
    let condition = "pkCategoryPrice = :categoryValue";
    const expressionAttributeValues: Record<string, AttributeValue> = {
      ":categoryValue": {
        S: category,
      },
    };

    if (minPrice && maxPrice) {
      condition += " AND price BETWEEN :minPrice AND :maxPrice";
      expressionAttributeValues[":minPrice"] = {
        N: minPrice.toString(),
      };
      expressionAttributeValues[":maxPrice"] = {
        N: maxPrice.toString(),
      };
    }

    if (minPrice && !maxPrice) {
      condition += " AND price >= :minPrice";
      expressionAttributeValues[":minPrice"] = {
        N: minPrice.toString(),
      };
    }

    if (!minPrice && maxPrice) {
      condition += " AND price <= :maxPrice";
      expressionAttributeValues[":maxPrice"] = {
        N: maxPrice.toString(),
      };
    }

    const categoryCommand = new QueryCommand({
      TableName: this.tableName,
      IndexName: "categoryPriceIndex",
      KeyConditionExpression: condition,
      ExpressionAttributeValues: expressionAttributeValues,
      ProjectionExpression: "pk",
    });

    this.logger.debug("Querying CategoryPriceIndex", categoryCommand);

    try {
      const result = await this.docClient.send(categoryCommand);
      return (result.Items || []).map(this.mountProduct);
    } catch (error: any) {
      this.logger.error("Error querying CategoryPriceIndex:", error);
      throw new SystemException(
        `Failed to query CategoryPriceIndex: ${error.message}`,
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
  }) {
    let condition = "brand = :brandValue";
    const expressionAttributeValues: Record<string, AttributeValue> = {
      ":brandValue": {
        S: brand,
      },
    };

    if (minPrice && maxPrice) {
      condition += " AND price BETWEEN :minPrice AND :maxPrice";
      expressionAttributeValues[":minPrice"] = {
        N: minPrice.toString(),
      };
      expressionAttributeValues[":maxPrice"] = {
        N: maxPrice.toString(),
      };
    }

    if (minPrice && !maxPrice) {
      condition += " AND price >= :minPrice";
      expressionAttributeValues[":minPrice"] = {
        N: minPrice.toString(),
      };
    }

    if (!minPrice && maxPrice) {
      condition += " AND price <= :maxPrice";
      expressionAttributeValues[":maxPrice"] = {
        N: maxPrice.toString(),
      };
    }

    const brandCommand = new QueryCommand({
      TableName: this.tableName,
      IndexName: "brandIndex",
      KeyConditionExpression: condition,
      ExpressionAttributeValues: expressionAttributeValues,
      ProjectionExpression: "pk",
    });

    this.logger.debug("Querying BrandIndex", brandCommand);

    try {
      const result = await this.docClient.send(brandCommand);
      return (result.Items || []).map(this.mountProduct);
    } catch (error: any) {
      this.logger.error("Error querying BrandIndex:", error);
      throw new SystemException(`Failed to query BrandIndex: ${error.message}`);
    }
  }

  private async productNameIndexQuery({
    productName,
  }: {
    productName: string;
  }) {
    const condition = "productName = :productNameValue";
    const expressionAttributeValues: Record<string, AttributeValue> = {
      ":productNameValue": {
        S: productName,
      },
    };

    const productNameCommand = new QueryCommand({
      TableName: this.tableName,
      IndexName: "productNameIndex",
      KeyConditionExpression: condition,
      ExpressionAttributeValues: expressionAttributeValues,
      ProjectionExpression: "pk",
    });

    this.logger.debug("Querying ProductNameIndex", productNameCommand);

    try {
      const result = await this.docClient.send(productNameCommand);
      const products = (result.Items || []).map(this.mountProduct);
      return products;
    } catch (error: any) {
      this.logger.error("Error querying ProductNameIndex:", error);
      throw new SystemException(
        `Failed to query ProductNameIndex: ${error.message}`,
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
  }) {
    let condition = "pkCategoryBrandPrice = :categoryValue";
    const expressionAttributeValues: Record<string, AttributeValue> = {
      ":categoryValue": {
        S: category,
      },
    };

    if (minPrice && maxPrice && brand) {
      condition +=
        " AND skCategoryBrandPrice BETWEEN :brandMinPrice AND :brandMaxPrice";
      expressionAttributeValues[":brandMinPrice"] = {
        S: brand,
      };
      expressionAttributeValues[":brandMaxPrice"] = {
        S: brand,
      };
    }

    if (!minPrice && maxPrice && brand) {
      condition += " AND skCategoryBrandPrice <= :brandMaxPrice";
      expressionAttributeValues[":brandMaxPrice"] = {
        S: brand,
      };
    }

    if (minPrice && !maxPrice && brand) {
      condition += " AND skCategoryBrandPrice >= :brandMinPrice";
      expressionAttributeValues[":brandMinPrice"] = {
        S: brand,
      };
    }

    if (!minPrice && !maxPrice && brand) {
      condition += " AND skCategoryBrandPrice = :brandValue";
      expressionAttributeValues[":brandValue"] = {
        S: brand,
      };
    }

    this.logger.debug("Querying CategoryBrandPriceIndex", condition);

    const categoryBrandPriceCommand = new QueryCommand({
      TableName: this.tableName,
      IndexName: "categoryBrandPriceIndex",
      KeyConditionExpression: condition,
      ExpressionAttributeValues: expressionAttributeValues,
      ProjectionExpression: "pk",
    });

    try {
      const result = await this.docClient.send(categoryBrandPriceCommand);
      return (result.Items || []).map(this.mountProduct);
    } catch (error: any) {
      this.logger.error("Error querying CategoryBrandPriceIndex:", error);
      throw new SystemException(
        `Failed to query CategoryBrandPriceIndex: ${error.message}`,
      );
    }
  }

  private mountProduct(item: any): PresentationProduct {
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
}
