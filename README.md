# Serverless Product Catalog API

A scalable, serverless product catalog system built with AWS Lambda, API Gateway, and DynamoDB. This solution provides a robust API for managing product inventory with advanced querying capabilities.

## Features

- **RESTful API** for product management (CRUD operations)
- **Advanced Querying** with filtering, sorting, and pagination
- **Serverless Architecture** with automatic scaling
- **TypeScript** for type safety and better developer experience
- **Infrastructure as Code** using Serverless Framework
- **CI/CD** with GitHub Actions

## API Endpoints

### Create Product
- **Method**: POST
- **Endpoint**: `/products/create`
- **Request Body**:
  ```json
  {
    "sku": "PROD123",
    "productName": "Organic Apples",
    "category": "Fruits",
    "brand": "Organic Farms",
    "price": 4.99,
    "stock": 100,
    "description": "Fresh organic apples"
  }
  ```

### Get Product by SKU
- **Method**: GET
- **Endpoint**: `/products/get/{sku}`
- **Response**:
  ```json
  {
    "sku": "PROD123",
    "productName": "Organic Apples",
    "category": "Fruits",
    "brand": "Organic Farms",
    "price": 4.99,
    "stock": 100,
    "description": "Fresh organic apples"
  }
  ```

### List Products
- **Method**: GET
- **Endpoint**: `/products/get`
- **Query Parameters**:
  - `category` (string): Filter by category
  - `brand` (string): Filter by brand
  - `productName` (string): Search by product name (partial match)
  - `minPrice` (number): Minimum price filter
  - `maxPrice` (number): Maximum price filter
  - `orderBy` (string): Field to sort by (name, price, stock, category, brand)
  - `orderDirection` (string): Sort direction (ASC or DESC)
  - `page` (number): Page number (default: 1)
  - `pageSize` (number): Items per page (default: 20)

### Update Product
- **Method**: PUT
- **Endpoint**: `/products/update`
- **Request Body**:
  ```json
  {
    "sku": "PROD123",
    "price": 5.49,
    "stock": 85
  }
  ```
  > Note: Only include fields that need to be updated

### Delete Product
- **Method**: DELETE
- **Endpoint**: `/products/delete`
- **Request Body**:
  ```json
  {
    "sku": "PROD123"
  }
  ```

## Data Model

### Product
```typescript
{
  sku: string;            // Unique identifier (Primary Key)
  productName: string;    // Name of the product
  description: string;    // Product description
  price: number;         // Product price
  stock: number;         // Available quantity in stock
  category: string;      // Product category
  brand: string;         // Product brand
}
```

## DynamoDB Schema

The system uses a single-table design with the following access patterns:

### Primary Table
- **Partition Key (HASH)**: `pk` (string) - Stores the product SKU
- **Sort Key (RANGE)**: `sk` (string) - Used for data organization

### Global Secondary Indexes (GSI)
1. **brandPriceIndex**
   - PK: `brand`
   - SK: `price`
   - Enables querying products by brand with price filtering

2. **categoryBrandPriceIndex**
   - PK: `category`
   - SK: `brand#price`
   - Enables querying products by category and brand with price filtering

3. **productIndex**
   - PK: `productName`
   - Enables searching products by name

4. **categoryPriceIndex**
   - PK: `category`
   - SK: `price`
   - Enables querying products by category with price filtering

## Getting Started

### Prerequisites

- Node.js 20.x
- npm or yarn
- AWS CLI configured with your credentials
- Serverless Framework CLI installed globally (`npm install -g serverless`)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   yarn install
   # or
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_REGION=us-east-1  # or your preferred region
   STAGE=dev            # or 'prod' for production
   ```

### Local Development

To run the API locally with serverless-offline:

```bash
yarn dev
# or
npm run dev
```

### Deployment

Deploy to AWS:

```bash
yarn deploy
# or
npm run deploy
```

This will deploy the application to the specified stage (dev/prod).

## Project Structure

```
.
├── src/
│   ├── functions/          # Lambda function handlers
│   │   └── products/       # Product-related functions
│   │       ├── create/     # Create product handler
│   │       ├── delete/     # Delete product handler
│   │       ├── get/        # List products handler
│   │       ├── get-one/    # Get single product handler
│   │       └── update/     # Update product handler
│   ├── libs/               # Shared utilities and middleware
│   ├── repositories/       # Data access layer
│   └── types/              # TypeScript type definitions
├── tests/                  # Test files
├── serverless.yml          # Serverless configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Project dependencies
```

## Testing

Run unit tests:

```bash
yarn test
# or
npm test
```

Run integration tests (requires local DynamoDB):

```bash
yarn test:integration
# or
npm run test:integration
```

## CI/CD

The project includes GitHub Actions workflows for automated testing and deployment:

- Pushes to `feat/*` branches trigger deployment to the `dev` environment
- Pushes to `main` branch trigger deployment to the `prod` environment

### Required Secrets

The following secrets must be configured in your GitHub repository:

- `AWS_ACCESS_KEY_ID`: AWS access key with deployment permissions
- `AWS_SECRET_ACCESS_KEY`: Corresponding AWS secret key
- `AWS_REGION`: AWS region for deployment
- `SERVERLESS_ACCESS_KEY`: Serverless Framework access key

## License

MIT
