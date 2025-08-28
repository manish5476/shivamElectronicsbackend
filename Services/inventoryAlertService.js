const Product = require("../Models/productModel");
const sendEmail = require("../Utils/email"); // Assuming you have an email utility

const LOW_STOCK_THRESHOLD = 10;

/**
 * @description Checks the stock of a product and sends an alert if it's low.
 * @param {string} productId - The ID of the product to check.
 */
exports.checkStockAndSendAlert = async (productId) => {
  try {
    const product = await Product.findById(productId);

    if (product && product.stock < LOW_STOCK_THRESHOLD) {
      // In a real application, you would send an email or a Telegram message here.
      // For now, we'll log it to the console.
      console.log(`--- Inventory Alert ---`);
      console.log(`Product: ${product.title} (SKU: ${product.sku})`);
      console.log(`Stock is low: ${product.stock} units remaining.`);
      console.log(`-----------------------`);

      // Example of sending an email alert
      // await sendEmail({
      //   email: 'admin@example.com', // Your admin email
      //   subject: `Low Stock Alert: ${product.title}`,
      //   message: `The stock for ${product.title} (SKU: ${product.sku}) is currently at ${product.stock}. Please reorder soon.`,
      // });
    }
  } catch (error) {
    console.error("Error checking stock for alert:", error);
  }
};
