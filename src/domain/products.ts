export interface Product {
	pk: string;
	sk: string;
	gsi1pk: string;
	gsi1sk: string;
	gsi2pk: string;
	gsi2sk: string;
	gsi3pk: string;
	gsi3sk: string;
	productName: string;
	price: number;
	stock: number;
	category: string;
	brand: string;
	description?: string;
}
