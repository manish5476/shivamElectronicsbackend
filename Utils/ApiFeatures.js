class ApiFeatures {
    constructor(query, queryString) {
        this.query = query; // Mongoose query object (e.g., Product.find())
        this.queryString = queryString; // From Express (req.query)
    }

    /**
     * Filters the query based on the query string.
     * Handles operators like [gte], [gt], [lte], [lt], [regex], [options].
     * Example URL: /api/products?price[gte]=100&name[regex]=phone
     */
    filter() {
        // 1. Create a shallow copy of the query string
        const queryObj = { ...this.queryString };

        // 2. Exclude special fields used for other features
        const excludedFields = ['page', 'sort', 'limit', 'fields'];
        excludedFields.forEach(el => delete queryObj[el]);

        // 3. Convert to a JSON string to replace operators with MongoDB format ($gte, $gt, etc.)
        let queryStr = JSON.stringify(queryObj);
        queryStr = queryStr.replace(/\b(gte|gt|lte|lt|regex|options)\b/g, match => `$${match}`);

        // 4. Apply the filter to the Mongoose query
        this.query = this.query.find(JSON.parse(queryStr));

        return this; // Return 'this' to allow chaining
    }

    /**
     * Sorts the query results.
     * Example URL: /api/products?sort=price,-ratingsAverage
     */
    sort() {
        if (this.queryString.sort) {
            const sortBy = this.queryString.sort.split(',').join(' ');
            this.query = this.query.sort(sortBy);
        } else {
            // Default sort if none is provided
            this.query = this.query.sort('-createdAt');
        }
        return this;
    }

    /**
     * Limits the fields returned in the results.
     * Example URL: /api/products?fields=name,price,description
     */
    limitFields() {
        if (this.queryString.fields) {
            const fields = this.queryString.fields.split(',').join(' ');
            this.query = this.query.select(fields);
        } else {
            // By default, exclude the '__v' field from Mongoose
            this.query = this.query.select('-__v');
        }
        return this;
    }

    /**
     * Paginates the results.
     * Example URL: /api/products?page=2&limit=10
     */
    paginate() {
        const page = parseInt(this.queryString.page, 10) || 1;
        const limit = parseInt(this.queryString.limit, 10) || 100;
        const skip = (page - 1) * limit;

        this.query = this.query.skip(skip).limit(limit);
        return this;
    }
}

module.exports = ApiFeatures;

// class ApiFeatures {
//   constructor(query, queryString) {
//     if (!queryString || typeof queryString !== 'object') {
//       throw new Error('Query string must be a valid object');
//     }
//     this.query = query;
//     this.queryString = queryString;
//   }

//   filter() {
//     if (!this.query) {
//       this.query = {}; // Initialize as an empty object if not already defined
//     }

//     // Handle nested filter object
//     let filterObj = {};
//     if (this.queryString.filter) {
//       filterObj = { ...this.queryString.filter };
//     } else {
//       // If no filter object, use the entire queryString
//       filterObj = { ...this.queryString };
//     }

//     // Remove pagination, sorting, and field limiting parameters
//     const excludedFields = ['page', 'sort', 'limit', 'fields', 'filter'];
//     excludedFields.forEach((el) => delete filterObj[el]);

//     // Handle empty filter object
//     if (Object.keys(filterObj).length === 0) {
//       this.query = this.query.find({});
//       return this;
//     }

//     // Process each field in the filter
//     Object.keys(filterObj).forEach((key) => {
//       const value = filterObj[key];
      
//       // Handle regex search
//       if (value && typeof value === 'object' && value.regex) {
//         filterObj[key] = { $regex: value.regex, $options: 'i' };
//       }
//       // Handle numeric comparisons
//       else if (value && typeof value === 'object') {
//         const operators = ['gte', 'gt', 'lte', 'lt', 'ne', 'in', 'nin'];
//         operators.forEach(op => {
//           if (value[op] !== undefined) {
//             filterObj[key] = { ...filterObj[key], [`$${op}`]: value[op] };
//           }
//         });
//       }
//       // Handle array values
//       else if (Array.isArray(value)) {
//         filterObj[key] = { $in: value };
//       }
//       // Handle comma-separated string values
//       else if (typeof value === 'string' && value.includes(',')) {
//         filterObj[key] = { $in: value.split(',').map(item => item.trim()) };
//       }
//       // // Handle nested queries
//       // if (key.includes('.')) {
//       //   const nestedKeys = key.split('.');
//       //   let tempQuery = filterObj;
//       //   for (let i = 0; i < nestedKeys.length - 1; i++) {
//       //     tempQuery = tempQuery[nestedKeys[i]] = tempQuery[nestedKeys[i]] || {};
//       //   }
//       //   tempQuery[nestedKeys[nestedKeys.length - 1]] = filterObj[key];
//       //   delete filterObj[key];
//       // }
//       if (key.includes('.')) {
//         const nestedKeys = key.split('.');
//         let tempQuery = filterObj;
//         for (let i = 0; i < nestedKeys.length - 1; i++) {
//           tempQuery = tempQuery[nestedKeys[i]] = tempQuery[nestedKeys[i]] || {};
//         }
//         tempQuery[nestedKeys[nestedKeys.length - 1]] = value; // use original value
//         delete filterObj[key];
//       } else {
//         filterObj[key] = value; // set it only if not nested
//       }
      
//     });

//     this.query = this.query.find(filterObj);
//     return this;
//   }

//   sort() {
//     if (this.queryString.sort) {
//       const sortBy = this.queryString.sort.split(',').join(' ').trim();
//       this.query = this.query.sort(sortBy || '-createdAt');
//     } else {
//       this.query = this.query.sort('-createdAt');
//     }
//     return this;
//   }

//   limitFields() {
//     if (this.queryString.fields) {
//       const fields = this.queryString.fields.split(',').join(' ').trim();
//       this.query = this.query.select(fields || '-__v');
//     } else {
//       this.query = this.query.select('-__v');
//     }
//     return this;
//   }

//   paginate() {
//     const page = Math.max(parseInt(this.queryString.page, 10) || 1, 1);
//     const limit = Math.min(Math.max(parseInt(this.queryString.limit, 10) || 200, 1), 1000);
//     const skip = (page - 1) * limit;

//     if (skip < 0) {
//       throw new Error('Invalid page number');
//     }
//     this.query = this.query.skip(skip).limit(limit);
//     return this;
//   }
// }

// module.exports = ApiFeatures;
