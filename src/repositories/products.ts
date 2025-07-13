import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
	DeleteCommand,
	DynamoDBDocumentClient,
	GetCommand,
	PutCommand,
} from "@aws-sdk/lib-dynamodb";
import type { Product } from "../domain/products";
import { SystemException } from "../shared/errors";

export default class ProductsRepository {
	private readonly tableName: string;
	private readonly docClient: DynamoDBDocumentClient;

	constructor() {
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
		const priceBucket = Math.floor(product.price / 10);
		const stockBucket = Math.floor(product.stock / 10);

		product.priceBucket = priceBucket.toString();
		product.stockBucket = stockBucket.toString();

		const params = {
			TableName: this.tableName,
			Item: product,
			ConditionExpression: "attribute_not_exists(sk)",
		};
		await this.docClient.send(new PutCommand(params));
	}

	async delete(sku: string): Promise<void> {
		const params = {
			TableName: this.tableName,
			Key: {
				pk: sku,
			},
		};
		await this.docClient.send(new DeleteCommand(params));
	}

	async getByPkAndSk(key: { pk: string; sk: string }): Promise<Product | null> {
		const params = {
			TableName: this.tableName,
			Key: key,
		};
		const result = await this.docClient.send(new GetCommand(params));
		return result.Item as Product | null;
	}
}
