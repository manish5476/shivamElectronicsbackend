// // import { Component } from '@angular/core';

// // @Component({
// //   selector: 'app-product-form',
// //   templateUrl: './product-form.component.html',
// // })
// // export class ProductFormComponent {
// //   product = {
// //     productId: '',
// //     name: '',
// //     description: {
// //       text: '',
// //       images: [],
// //       video: { url: '', description: '' }
// //     },
// //     category: {
// //       main: '',
// //       sub: '',
// //       subCategories: []
// //     },
// //     brand: {
// //       name: '',
// //       logo: ''
// //     },
// //     price: {
// //       current: null,
// //       original: null,
// //       currency: 'USD',
// //       discount: { percentage: null, expiresOn: null }
// //     },
// //     stock: {
// //       quantity: null,
// //       status: 'in_stock'
// //     },
// //     images: {
// //       default: '',
// //       variants: [{ color: '', images: [{ imageUrl: '', altText: '' }], stock: null }]
// //     },
// //     specifications: {},
// //     metadata: {},
// //     shipping: {},
// //     reviews: []
// //   };

// //   addVariant() {
// //     this.product.images.variants.push({ color: '', images: [{ imageUrl: '', altText: '' }], stock: null });
// //   }

// //   addVariantImage(index: number) {
// //     this.product.images.variants[index].images.push({ imageUrl: '', altText: '' });
// //   }

// //   removeVariant(index: number) {
// //     this.product.images.variants.splice(index, 1);
// //   }

// //   onSubmit() {
// //     console.log('Submitted Product:', this.product);
// //     // Handle form submission logic here, such as sending data to a server.
// //   }
// // }

// // @tailwind base;
// // @tailwind components;
// // @tailwind utilities;

// // .input {
// //   @apply border border-gray-300 p-2 rounded w-60; /* Adjust as needed */
// // }

// // .btn {
// //   @apply bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 mt-2;
// // }

// // .container {
// //   @apply max-w-2xl mx-auto;
// // }

// import { Component } from '@angular/core';

// @Component({
//   selector: 'app-product-form',
//   templateUrl: './product-form.component.html',
// })
// export class ProductFormComponent {
//   product = {
//     productId: '',
//     name: '',
//     description: {
//       text: '',
//       images: [],
//       video: { url: '', description: '' }
//     },
//     category: {
//       main: '',
//       sub: '',
//       subCategories: []
//     },
//     brand: {
//       name: '',
//       logo: ''
//     },
//     price: {
//       current: null,
//       original: null,
//       currency: 'USD',
//       discount: { percentage: null, expiresOn: null }
//     },
//     stock: {
//       quantity: null,
//       status: 'in_stock'
//     },
//     images: {
//       default: '',
//       variants: [{ color: '', images: [{ imageUrl: '', altText: '' }], stock: null }]
//     },
//     specifications: {},
//     metadata: {},
//     shipping: {},
//     reviews: []
//   };

//   // Add a new variant
//   addVariant() {
//     this.product.images.variants.push({
//       color: '',
//       images: [{ imageUrl: '', altText: '' }],
//       stock: null
//     });
//   }

//   // Add an image to a specific variant
//   addVariantImage(index: number) {
//     this.product.images.variants[index].images.push({ imageUrl: '', altText: '' });
//   }

//   // Remove a specific variant
//   removeVariant(index: number) {
//     this.product.images.variants.splice(index, 1);
//   }

//   // Handle form submission
//   onSubmit() {
//     if (this.product.productId && this.product.name) {
//       console.log('Submitted Product:', this.product);
//       // Add further submission logic here, like sending data to a server
//     } else {
//       console.error('Product ID and Name are required.');
//     }
//   }
// }
// interface Product {
//     productId: string;
//     name: string;
//     description: {
//       text: string;
//       images: Array<{ url: string; altText: string }>;
//       video?: { url: string; description: string };
//     };
//     category: {
//       main: string;
//       sub: string;
//       subCategories?: string[];
//     };
//     brand: {
//       name: string;
//       logo: string;
//     };
//     price: {
//       current: number;
//       original: number;
//       currency: string;
//       discount?: { percentage: number; expiresOn: string };
//     };
//     stock: {
//       quantity: number;
//       status: string;
//     };
//     images: {
//       default: string;
//       variants: Array<{
//         color: string;
//         images: Array<{ imageUrl: string; altText: string }>;
//         stock: number | null;
//       }>;
//     };
//     specifications?: any;
//     metadata?: any;
//     shipping?: any;
//     reviews?: any[];
//   }
  