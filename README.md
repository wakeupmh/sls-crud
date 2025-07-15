# Serverless Grocery Store Catalog API

In a quiet street in São José dos Campos, where the aroma of fresh bread mingles with the scent of brewed coffee, sits "Videira's Mini-Market." It's not a giant supermarket; it's that familiar corner store everyone knows, with Mr. Zé Videira at the cash register, always ready for a chat.
There, you'll find everything from everyday dog's food, thread seal tape, eletric shower to homemade "Pão de Queijo" from Dona Joana, Mr. Zé's neighbor.

Mr. Zé always jotted everything down in notebooks, in tiny handwriting. However over time, the clientele grew, and he started feeling the need to modernize things. "If I could organize my products better, know what's selling more, what's missing..." he'd think, scratching his graying head.

That's when the idea for a digital and user-friendly product catalog came about. Something that didn't require a bunch of expensive computers or constant technical support.

So, I created a serverless system for him. this means Mr. Zé doesn't have to worry about servers, maintenance, or sky-high electricity bills. It's like having an invisible IT team working for him 24/7, without absurd fixed costs, so this is the api for his grocery store.

### Requirements Fulfilled

- **CRUD Operations**: Complete Create, Read, Update, Delete functionality
- **Advanced Querying**: Multi-dimensional filtering, sorting, and pagination
- **Serverless Architecture**: AWS Lambda + API Gateway + DynamoDB
- **Type Safety**: Full TypeScript implementation
- **Testing**: Comprehensive test suite with 75% function coverage
- **Production Ready**: Error handling, logging, and monitoring

### Key Design Decisions

**Single-Table DynamoDB Design**: Optimized for performance and cost-effectiveness
- Primary Key: `pk` (product#SKU) / `sk` (product#SKU)
- Strategic GSIs for complex query patterns
- Consistent sub-10ms response times

**Function-per-Endpoint Pattern**: Dedicated Lambda functions for each operation
- Independent scaling and deployment
- Isolated error handling
- Granular monitoring capabilities

## API Implementation

### Product Data Model
```typescript
interface Product {
  sku: string;            // Unique identifier
  productName: string;    // Product display name
  description?: string;   // Optional description
  price: number;         // Price in currency units
  stock: number;         // Available inventory
  category: string;      // Product category
  brand: string;         // Brand/manufacturer
}
```

### Endpoints

#### 1. Create Product
```http
POST /products/create
Content-Type: application/json

{
  "sku": "LAPTOP-001",
  "productName": "MacBook Pro 16",
  "category": "Electronics",
  "brand": "Apple",
  "price": 2499.99,
  "stock": 25,
  "description": "16-inch MacBook Pro with M2 Pro chip"
}
```

**Response**: `201 Created` with product object

#### 2. Get Product by SKU
```http
GET /products/get/{sku}
```

**Response**: `200 OK` with product details or `404 Not Found`

#### 3. List Products with Advanced Filtering
```http
GET /products/get?category=Electronics&brand=Apple&minPrice=1000&maxPrice=3000&orderBy=price&orderDirection=ASC&page=1&pageSize=10
```

**Query Parameters**:
- `category`: Filter by product category
- `brand`: Filter by brand name
- `productName`: Search by exact product name
- `minPrice`/`maxPrice`: Price range filtering
- `orderBy`: Sort by `name`, `price`, `stock`, `category`, `brand`
- `orderDirection`: `ASC` or `DESC`
- `page`: Page number (default: 1)
- `pageSize`: Items per page (default: 20, max: 100)

#### 4. Update Product
```http
PUT /products/update
Content-Type: application/json

{
  "sku": "LAPTOP-001",
  "price": 2299.99,
  "stock": 20
}
```

#### 5. Delete Product
```http
DELETE /products/delete
Content-Type: application/json

{
  "sku": "LAPTOP-001"
}
```

## DynamoDB Schema Design

### Primary Table
- **Partition Key**: `pk` (product#SKU)
- **Sort Key**: `sk` (product#SKU) an ephemeral sk, as the main query won't be so used
- **Attributes**:
  - `productName`
  - `description`
  - `price`
  - `stock`
  - `category`
  - `brand`

### Global Secondary Indexes
Following you can see a table with the access patterns and the corresponding GSI.

| GSI Name | Partition Key | Sort Key | Use Case |
|----------|---------------|----------|----------|
| `brandPriceIndex` | `brand` | `price` | Filter by brand with price sorting |
| `categoryBrandPriceIndex` | `category` | `brand#price` | Category + brand + price filtering |
| `productIndex` | `productName` | - | Product name search |
| `categoryPriceIndex`|  `category` | `price` | Category + price filtering |

## Implementation Highlights

### Repository Pattern
```typescript
class ProductsRepository {
  async save(product: Product): Promise<void>
  async update(product: Partial<Product> & { pk: string }): Promise<void>
  async delete(pk: string): Promise<void>
  async getBySku(pk: string): Promise<Product | null>
  async getByFilters(filters: FilterOptions): Promise<QueryResult>
}
```

### Error Handling Strategy
- **Input Validation**: Zod schema validation for all requests
- **Custom Exceptions**: Typed error classes with appropriate HTTP status codes
- **AWS SDK Integration**: Proper error handling for DynamoDB operations
- **Structured Logging**: AWS PowerTools for observability buffering debug-level logs when an error occurs

## Getting Started

### Prerequisites
- Node.js 20.x+
- AWS CLI configured
- Serverless Framework (`npm install -g serverless`)

### Quick Setup
```bash
# Clone and install
cd serverless-product-catalog
npm install

# Configure environment
cp .env.example .env
# Edit .env with AWS credentials

# run locally
npm run dev
```

### Environment Variables
```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
TABLE_NAME=grocery-store-dev
```

## Testing

### Running Tests
```bash
# Execute all tests
npm test

# Run with coverage report
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Test Structure
```
src/repositories/products.test.ts
├── Constructor tests
├── CRUD operation tests
├── Query method tests
```

## Deployment

### Local Development
```bash
npm run dev
# API available at http://localhost:3000
```
### Deployment Workflow (GitHub Actions) CI/CD pipeline is established using GitHub Actions to automate the deployment of the serverless application.

#### Branching Strategy
- `dev` branch: when a PR is opened it triggers a deployment to the dev stage.
- `main` branch: Pushes to the main branch trigger a deployment to the prod stage, so, this ensures that only stable, reviewed code reaches the production environment due to branch rule set

#### Workflow Steps
The `deploy.yml` workflow orchestrates the following sequence:

- Checkout code: Retrieves the repository content.
- Setup Node.js: Configures the Node.js runtime (v20) and caches npm dependencies for accelerated build times.
- Install dependencies: Executes npm ci to install project dependencies, ensuring a clean and reproducible installation.
- Configure AWS Credentials: Utilizes aws-actions/configure-aws-credentials to authenticate with AWS using repository secrets (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`).
- Deploy with Serverless to `${{ needs.set-env-name.outputs.current_env }}`: Invokes the Serverless Framework's deploy command, passing the determined stage `(--stage ${{ needs.set-env-name.outputs.current_env }})`. The `SERVERLESS_ACCESS_KEY` is provided via repository secrets for Serverless Dashboard integration.

#### Required Secrets
The following secrets must be configured in your GitHub repository settings:

- `AWS_ACCESS_KEY_ID`: AWS Access Key ID with sufficient permissions for DynamoDB and Lambda deployments.
- `AWS_SECRET_ACCESS_KEY`: Corresponding AWS Secret Access Key.
- `AWS_REGION`: The AWS region for deployment (e.g., sa-east-1).
- `SERVERLESS_ACCESS_KEY`: Your Serverless Framework access key for dashboard integration.

#### Code Quality and Pre-commit Hooks
This project enforces code quality standards through automated tooling integrated into the development workflow:

- `Biome`: Utilized for code formatting (npm run format) and linting (npm run lint), ensuring code style and identifying potential issues.
- `Lefthook`: Configured as a Git pre-commit hook manager.
  - It automatically executes biome's formatting and linting checks prior to commit, preventing non-compliant code from entering the version control system
  - Run the coverage report with `npm run test:coverage` to ensure the codebase adheres to the project's standards and maintainability goals.


### CI/CD Pipeline
GitHub Actions workflows included for:
- Development deployment for feature branches
- Production deployment from main branch


## Project Structure
```
src/
├── functions/              # Lambda function handlers
│   └── products/
│       ├── create/         # POST /products/create
│       ├── delete/         # DELETE /products/delete
│       ├── get/           # GET /products/get
│       ├── get-one/       # GET /products/get/{sku}
│       └── update/        # PUT /products/update
├── repositories/          # Data access layer
│   ├── products.ts        # Repository implementation
│   └── products.test.ts   # Comprehensive test suite
├── domain/               # Domain models and interfaces
├── shared/              # Shared utilities and middleware
│   ├── dto/             # Data transfer objects
│   ├── errors/          # Custom exception classes
│   ├── helpers/         # Utility functions
│   └── middlewares/     # Request/response middleware
└── providers/           # External service integrations
```