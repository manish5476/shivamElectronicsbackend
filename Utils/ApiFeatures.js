class ApiFeatures {
  constructor(query, queryString) {
    if (!queryString || typeof queryString !== 'object') {
      throw new Error('Query string must be a valid object');
    }
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    if (!this.query) {
      this.query = {}; // Initialize as an empty object if not already defined
    }

    // Handle nested filter object
    let filterObj = {};
    if (this.queryString.filter) {
      filterObj = { ...this.queryString.filter };
    } else {
      // If no filter object, use the entire queryString
      filterObj = { ...this.queryString };
    }

    // Remove pagination, sorting, and field limiting parameters
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'filter'];
    excludedFields.forEach((el) => delete filterObj[el]);

    // Handle empty filter object
    if (Object.keys(filterObj).length === 0) {
      this.query = this.query.find({});
      return this;
    }

    // Process each field in the filter
    Object.keys(filterObj).forEach((key) => {
      const value = filterObj[key];
      
      // Handle regex search
      if (value && typeof value === 'object' && value.regex) {
        filterObj[key] = { $regex: value.regex, $options: 'i' };
      }
      // Handle numeric comparisons
      else if (value && typeof value === 'object') {
        const operators = ['gte', 'gt', 'lte', 'lt', 'ne', 'in', 'nin'];
        operators.forEach(op => {
          if (value[op] !== undefined) {
            filterObj[key] = { ...filterObj[key], [`$${op}`]: value[op] };
          }
        });
      }
      // Handle array values
      else if (Array.isArray(value)) {
        filterObj[key] = { $in: value };
      }
      // Handle comma-separated string values
      else if (typeof value === 'string' && value.includes(',')) {
        filterObj[key] = { $in: value.split(',').map(item => item.trim()) };
      }
      // // Handle nested queries
      // if (key.includes('.')) {
      //   const nestedKeys = key.split('.');
      //   let tempQuery = filterObj;
      //   for (let i = 0; i < nestedKeys.length - 1; i++) {
      //     tempQuery = tempQuery[nestedKeys[i]] = tempQuery[nestedKeys[i]] || {};
      //   }
      //   tempQuery[nestedKeys[nestedKeys.length - 1]] = filterObj[key];
      //   delete filterObj[key];
      // }
      if (key.includes('.')) {
        const nestedKeys = key.split('.');
        let tempQuery = filterObj;
        for (let i = 0; i < nestedKeys.length - 1; i++) {
          tempQuery = tempQuery[nestedKeys[i]] = tempQuery[nestedKeys[i]] || {};
        }
        tempQuery[nestedKeys[nestedKeys.length - 1]] = value; // use original value
        delete filterObj[key];
      } else {
        filterObj[key] = value; // set it only if not nested
      }
      
    });

    this.query = this.query.find(filterObj);
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ').trim();
      this.query = this.query.sort(sortBy || '-createdAt');
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ').trim();
      this.query = this.query.select(fields || '-__v');
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate() {
    const page = Math.max(parseInt(this.queryString.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(this.queryString.limit, 10) || 200, 1), 1000);
    const skip = (page - 1) * limit;

    if (skip < 0) {
      throw new Error('Invalid page number');
    }
    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}

module.exports = ApiFeatures;
// // Class to handle filtering, sorting, limiting fields, and pagination for API requests
// class ApiFeatures {
//   constructor(query, queryString) {
//     // `query` is the initial query (e.g., Tour.find()), and `queryString` is the req.query from Express
//     this.query = query;
//     this.queryString = queryString;
//   }

//   // Method to handle filtering based on query parameters
//   // filter() {
//   //   // Copy queryString to avoid mutating the original object
//   //   const queryObj = { ...this.queryString };

//   //   // Fields to exclude from the query (they are used for other functionalities)
//   //   const excludedFields = ["page", "sort", "limit", "fields"];

//   //   // Remove excluded fields from the query object
//   //   excludedFields.forEach((el) => delete queryObj[el]);

//   //   // Convert query object to a JSON string and replace operators like gte, gt, lte, lt with MongoDB operators ($gte, etc.)
//   //   let queryStr = JSON.stringify(queryObj);
//   //   queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

//   //   // Object.keys(query).forEach((key) => {
//   //   //   if (typeof query[key] === 'string' && query[key].includes(',')) {
//   //   //     query[key] = { $in: query[key].split(',') };
//   //   //   }
//   //   // });

//   //   // this.query = this.query.find(query);

//   //   // Update the query with filtering applied
//   //   this.query = this.query.find(JSON.parse(queryStr));

//   //   // Return `this` to allow method chaining
//   //   return this;
//   // }
//   filter() {
//     // Ensure this.query is initialized
//     if (!this.query) {
//       this.query = {}; // Initialize as an empty object if not already defined
//     }

//     const queryObj = { ...this.queryString };
//     const excludedFields = ["page", "sort", "limit", "fields"];
//     excludedFields.forEach((el) => delete queryObj[el]);

//     let queryStr = JSON.stringify(queryObj);
//     queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

//     const query = JSON.parse(queryStr);

//     // Dynamically handle multiple values for any field
//     Object.keys(query).forEach((key) => {
//       if (typeof query[key] === 'string' && query[key].includes(',')) {
//         query[key] = { $in: query[key].split(',') };
//       }
//     });

//     this.query = this.query.find(query);

//     return this;
//   }
//   // Method to handle sorting
//   sort() {
//     if (this.queryString.sort) {
//       // Convert the comma-separated sort parameter to space-separated for Mongoose
//       const sortBy = this.queryString.sort.split(",").join(" ");
//       // Apply the sorting to the query
//       this.query = this.query.sort(sortBy);
//     } else {
//       // Default sort by `createdAt` field in descending order if no sort is specified
//       this.query = this.query.sort("-createdAt");
//     }

//     return this;
//   }

//   // Method to limit the fields returned in the response
//   limitFields() {
//     if (this.queryString.fields) {
//       // Convert the comma-separated fields parameter to space-separated for Mongoose
//       const fields = this.queryString.fields.split(",").join(" ");

//       // Select only the specified fields
//       this.query = this.query.select(fields);
//     } else {
//       // By default, exclude the `__v` field from the response
//       this.query = this.query.select("-__v");
//     }

//     return this;
//   }

//   // Method to handle pagination
//   paginate() {
//     // Get the `page` and `limit` values from the query string or set defaults
//     const page = Math.max(this.queryString.page * 1 || 1, 1); // Ensure page is at least 1
//     const limit = Math.min(
//       Math.max(this.queryString.limit * 1 || 200, 1),
//       1000
//     ); // Limit max to 1000, and ensure it's at least 1

//     // Calculate the number of documents to skip for pagination
//     const skip = (page - 1) * limit;

//     // Apply skip and limit to the query for pagination
//     this.query = this.query.skip(skip).limit(limit);

//     return this;
//   }
// }

// // Export the ApiFeatures class for use in other files
// module.exports = ApiFeatures;
