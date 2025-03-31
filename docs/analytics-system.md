# Analytics System Documentation

## Overview
The analytics system provides comprehensive insights into your business operations through various metrics and KPIs. This system is designed to help administrators make data-driven decisions by analyzing sales, customer behavior, product performance, payment efficiency, and inventory management.

## Endpoints

### 1. Sales Performance Metrics
**Endpoint:** `GET /api/v1/analytics/sales-performance`

**Query Parameters:**
- `startDate`: Start date for analysis (YYYY-MM-DD)
- `endDate`: End date for analysis (YYYY-MM-DD)

**Response:**
```javascript
{
  "status": "success",
  "data": {
    "totalSales": 50000,
    "averageOrderValue": 500,
    "totalOrders": 100,
    "uniqueCustomerCount": 50
  }
}
```

**Key Metrics:**
- Total Sales: Sum of all sales in the period
- Average Order Value: Mean value of orders
- Total Orders: Number of orders placed
- Unique Customer Count: Number of distinct customers

### 2. Customer Insights
**Endpoint:** `GET /api/v1/analytics/customer-insights`

**Response:**
```javascript
{
  "status": "success",
  "data": [
    {
      "_id": "customer_id",
      "fullname": "John Doe",
      "totalOrders": 5,
      "totalSpent": 2500,
      "lastOrderDate": "2024-03-15"
    }
  ]
}
```

**Key Metrics:**
- Total Orders per Customer
- Total Amount Spent
- Last Order Date
- Top 10 Customers by Spending

### 3. Product Performance Analysis
**Endpoint:** `GET /api/v1/analytics/product-performance`

**Query Parameters:**
- `startDate`: Start date for analysis (YYYY-MM-DD)
- `endDate`: End date for analysis (YYYY-MM-DD)

**Response:**
```javascript
{
  "status": "success",
  "data": [
    {
      "_id": "product_id",
      "name": "Product Name",
      "category": "Electronics",
      "totalQuantity": 100,
      "totalRevenue": 10000,
      "averagePrice": 100,
      "orderCount": 50,
      "profitMargin": 25
    }
  ]
}
```

**Key Metrics:**
- Total Quantity Sold
- Total Revenue
- Average Price
- Number of Orders
- Profit Margin (%)

### 4. Payment Collection Efficiency
**Endpoint:** `GET /api/v1/analytics/payment-efficiency`

**Query Parameters:**
- `startDate`: Start date for analysis (YYYY-MM-DD)
- `endDate`: End date for analysis (YYYY-MM-DD)

**Response:**
```javascript
{
  "status": "success",
  "data": [
    {
      "_id": "pending",
      "totalAmount": 15000,
      "count": 25,
      "averageDaysToPay": 15
    }
  ]
}
```

**Key Metrics:**
- Payment Status Distribution
- Total Amount by Status
- Number of Payments by Status
- Average Days to Payment

### 5. Inventory Turnover Rate
**Endpoint:** `GET /api/v1/analytics/inventory-turnover`

**Query Parameters:**
- `startDate`: Start date for analysis (YYYY-MM-DD)
- `endDate`: End date for analysis (YYYY-MM-DD)

**Response:**
```javascript
{
  "status": "success",
  "data": [
    {
      "_id": "product_id",
      "title": "Product Name",
      "category": "Electronics",
      "currentStock": 50,
      "totalSold": 200,
      "averagePrice": 100,
      "turnoverRate": 4
    }
  ]
}
```

**Key Metrics:**
- Current Stock Level
- Total Units Sold
- Average Price
- Turnover Rate (Total Sold / Current Stock)

## Implementation Details

### MongoDB Aggregation Pipeline
The system uses MongoDB's aggregation pipeline for efficient data processing:

1. **$match Stage:**
   - Filters documents based on date range
   - Example: `{ date: { $gte: start, $lte: end } }`

2. **$group Stage:**
   - Groups documents and calculates metrics
   - Example: `{ _id: "$status", totalAmount: { $sum: "$amount" } }`

3. **$lookup Stage:**
   - Joins with other collections
   - Example: Joining products with sales data

4. **$project Stage:**
   - Shapes the output document
   - Example: Selecting specific fields and calculating derived metrics

### Security
- All endpoints are protected with authentication
- Access restricted to admin users only
- Rate limiting implemented
- Input sanitization for query parameters

### Performance Optimization
- Indexed fields for faster queries
- Efficient aggregation pipelines
- Proper date range filtering
- Limited result sets where appropriate

## Usage Examples

### Frontend Integration
```javascript
// Using fetch
async function getSalesPerformance(startDate, endDate) {
  const response = await fetch(
    `/api/v1/analytics/sales-performance?startDate=${startDate}&endDate=${endDate}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  return response.json();
}

// Using axios
async function getProductPerformance(startDate, endDate) {
  const response = await axios.get('/api/v1/analytics/product-performance', {
    params: { startDate, endDate },
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.data;
}
```

### Date Range Selection
```javascript
// Get current month's data
const today = new Date();
const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

// Get last 30 days
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
```

## Best Practices

1. **Date Range Selection:**
   - Always specify date ranges for time-based metrics
   - Use appropriate date ranges for different metrics
   - Consider timezone differences

2. **Error Handling:**
   - Handle API errors gracefully
   - Implement retry logic for failed requests
   - Show appropriate error messages to users

3. **Data Visualization:**
   - Use appropriate charts for different metrics
   - Implement responsive designs
   - Consider data loading states

4. **Performance:**
   - Cache frequently accessed data
   - Implement pagination for large datasets
   - Use appropriate date ranges to limit data size

5. **Security:**
   - Always include authentication token
   - Validate date inputs
   - Sanitize query parameters

## Common Use Cases

1. **Dashboard Overview:**
   - Display key metrics at a glance
   - Show trends over time
   - Highlight important changes

2. **Sales Analysis:**
   - Track revenue trends
   - Analyze customer buying patterns
   - Identify top-performing products

3. **Inventory Management:**
   - Monitor stock levels
   - Track product turnover
   - Identify slow-moving inventory

4. **Customer Analysis:**
   - Identify valuable customers
   - Track customer retention
   - Analyze customer spending patterns

5. **Payment Tracking:**
   - Monitor payment collection
   - Track overdue payments
   - Analyze payment patterns

## Troubleshooting

1. **Common Issues:**
   - Invalid date formats
   - Missing authentication token
   - Rate limiting exceeded
   - Large date ranges causing slow responses

2. **Solutions:**
   - Validate date inputs
   - Implement proper error handling
   - Use appropriate date ranges
   - Implement caching

## Future Enhancements

1. **Additional Metrics:**
   - Customer lifetime value
   - Product return rates
   - Customer satisfaction scores
   - Market share analysis

2. **Advanced Features:**
   - Custom report builder
   - Automated report generation
   - Export functionality
   - Real-time updates

3. **Integration:**
   - External data sources
   - Third-party analytics
   - Custom dashboards
   - API integrations 