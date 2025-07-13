import {
	DynamoDBClient,
	QueryCommand,
	QueryCommandInput,
} from "@aws-sdk/client-dynamodb";
import {
	BatchGetCommand,
	DeleteCommand,
	DynamoDBDocumentClient,
	GetCommand,
	PutCommand,
} from "@aws-sdk/lib-dynamodb";
import type { Product } from "../domain/products";
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
		await this.docClient.send(new PutCommand(params));
	}

	async delete(pk: string): Promise<void> {
		const params = {
			TableName: this.tableName,
			Key: {
				pk,
			},
		};
		await this.docClient.send(new DeleteCommand(params));
	}

	async getBySku(pk: string): Promise<Product | null> {
		const params = {
			TableName: this.tableName,
			Key: {
				pk,
			},
		};
		const result = await this.docClient.send(new GetCommand(params));
		return result.Item as Product | null;
	}
}
