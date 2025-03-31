# Frontend Implementation Guide

## Overview
This guide provides implementation details for integrating the analytics system into your frontend application. It includes examples using React and popular charting libraries.

## Required Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "axios": "^1.6.0",
    "recharts": "^2.10.0",
    "date-fns": "^2.30.0",
    "@mui/material": "^5.14.0",
    "@mui/icons-material": "^5.14.0"
  }
}
```

## API Service

```javascript
// services/analyticsService.js
import axios from 'axios';

const API_URL = '/api/v1/analytics';

export const analyticsService = {
  // Get sales performance
  getSalesPerformance: async (startDate, endDate) => {
    const response = await axios.get(`${API_URL}/sales-performance`, {
      params: { startDate, endDate },
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  },

  // Get customer insights
  getCustomerInsights: async () => {
    const response = await axios.get(`${API_URL}/customer-insights`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  },

  // Get product performance
  getProductPerformance: async (startDate, endDate) => {
    const response = await axios.get(`${API_URL}/product-performance`, {
      params: { startDate, endDate },
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  },

  // Get payment efficiency
  getPaymentEfficiency: async (startDate, endDate) => {
    const response = await axios.get(`${API_URL}/payment-efficiency`, {
      params: { startDate, endDate },
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  },

  // Get inventory turnover
  getInventoryTurnover: async (startDate, endDate) => {
    const response = await axios.get(`${API_URL}/inventory-turnover`, {
      params: { startDate, endDate },
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  }
};
```

## Dashboard Components

### 1. Sales Performance Card
```javascript
// components/SalesPerformanceCard.jsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Grid } from '@mui/material';
import { analyticsService } from '../services/analyticsService';
import { formatCurrency } from '../utils/formatters';

export const SalesPerformanceCard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        const response = await analyticsService.getSalesPerformance(
          startOfMonth.toISOString(),
          endOfMonth.toISOString()
        );
        setData(response.data);
      } catch (error) {
        console.error('Error fetching sales performance:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">Sales Performance</Typography>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="subtitle2">Total Sales</Typography>
            <Typography variant="h4">{formatCurrency(data.totalSales)}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2">Average Order Value</Typography>
            <Typography variant="h4">{formatCurrency(data.averageOrderValue)}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2">Total Orders</Typography>
            <Typography variant="h4">{data.totalOrders}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2">Unique Customers</Typography>
            <Typography variant="h4">{data.uniqueCustomerCount}</Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};
```

### 2. Product Performance Chart
```javascript
// components/ProductPerformanceChart.jsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { analyticsService } from '../services/analyticsService';

export const ProductPerformanceChart = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const response = await analyticsService.getProductPerformance(
          thirtyDaysAgo.toISOString(),
          today.toISOString()
        );
        setData(response.data);
      } catch (error) {
        console.error('Error fetching product performance:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">Product Performance</Typography>
        <BarChart width={800} height={400} data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="totalRevenue" name="Revenue" fill="#8884d8" />
          <Bar dataKey="totalQuantity" name="Quantity" fill="#82ca9d" />
        </BarChart>
      </CardContent>
    </Card>
  );
};
```

### 3. Customer Insights Table
```javascript
// components/CustomerInsightsTable.jsx
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { analyticsService } from '../services/analyticsService';
import { formatCurrency } from '../utils/formatters';

export const CustomerInsightsTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await analyticsService.getCustomerInsights();
        setData(response.data);
      } catch (error) {
        console.error('Error fetching customer insights:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">Top Customers</Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Customer Name</TableCell>
                <TableCell align="right">Total Orders</TableCell>
                <TableCell align="right">Total Spent</TableCell>
                <TableCell>Last Order</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((customer) => (
                <TableRow key={customer._id}>
                  <TableCell>{customer.fullname}</TableCell>
                  <TableCell align="right">{customer.totalOrders}</TableCell>
                  <TableCell align="right">{formatCurrency(customer.totalSpent)}</TableCell>
                  <TableCell>{new Date(customer.lastOrderDate).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};
```

### 4. Payment Efficiency Chart
```javascript
// components/PaymentEfficiencyChart.jsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { analyticsService } from '../services/analyticsService';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export const PaymentEfficiencyChart = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const response = await analyticsService.getPaymentEfficiency(
          thirtyDaysAgo.toISOString(),
          today.toISOString()
        );
        setData(response.data);
      } catch (error) {
        console.error('Error fetching payment efficiency:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">Payment Status Distribution</Typography>
        <PieChart width={400} height={400}>
          <Pie
            data={data}
            dataKey="totalAmount"
            nameKey="_id"
            cx="50%"
            cy="50%"
            outerRadius={150}
            label
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </CardContent>
    </Card>
  );
};
```

## Dashboard Layout

```javascript
// pages/Dashboard.jsx
import React from 'react';
import { Grid, Container } from '@mui/material';
import { SalesPerformanceCard } from '../components/SalesPerformanceCard';
import { ProductPerformanceChart } from '../components/ProductPerformanceChart';
import { CustomerInsightsTable } from '../components/CustomerInsightsTable';
import { PaymentEfficiencyChart } from '../components/PaymentEfficiencyChart';

export const Dashboard = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <SalesPerformanceCard />
        </Grid>
        <Grid item xs={12} md={8}>
          <ProductPerformanceChart />
        </Grid>
        <Grid item xs={12} md={4}>
          <PaymentEfficiencyChart />
        </Grid>
        <Grid item xs={12}>
          <CustomerInsightsTable />
        </Grid>
      </Grid>
    </Container>
  );
};
```

## Utility Functions

```javascript
// utils/formatters.js
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};
```

## Error Handling

```javascript
// components/ErrorBoundary.jsx
import React from 'react';
import { Alert, AlertTitle } from '@mui/material';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert severity="error">
          <AlertTitle>Error</AlertTitle>
          Something went wrong. Please try again later.
        </Alert>
      );
    }

    return this.props.children;
  }
}
```

## Loading States

```javascript
// components/LoadingSpinner.jsx
import React from 'react';
import { CircularProgress, Box } from '@mui/material';

export const LoadingSpinner = () => {
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="200px"
    >
      <CircularProgress />
    </Box>
  );
};
```

## Best Practices

1. **Component Organization:**
   - Keep components modular and reusable
   - Use proper prop types
   - Implement error boundaries
   - Handle loading states

2. **Data Fetching:**
   - Use useEffect for data fetching
   - Implement proper error handling
   - Cache data when appropriate
   - Use loading states

3. **Performance:**
   - Implement proper memoization
   - Use pagination for large datasets
   - Optimize re-renders
   - Implement proper loading states

4. **User Experience:**
   - Provide feedback for actions
   - Handle errors gracefully
   - Implement proper loading states
   - Use appropriate animations

5. **Security:**
   - Handle authentication properly
   - Sanitize user inputs
   - Implement proper error handling
   - Use secure storage for tokens 