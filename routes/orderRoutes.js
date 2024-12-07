const express = require("express");
const Order = require("..Models/Order");
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

// Checkout (process payment)
router.post("/checkout", async (req, res) => {
  const { products, token } = req.body;

  let totalPrice = 0;
  products.forEach((product) => {
    totalPrice += product.price * product.quantity;
  });

  const charge = await stripe.charges.create({
    amount: totalPrice * 100,
    currency: "usd",
    source: token.id,
    description: `Purchased ${products.length} products`,
  });

  res.json({ msg: "Payment successful", charge });
});

module.exports = router;
