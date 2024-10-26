const express = require("express");
const app = express();
app.use(express.json());
const morgan = require("morgan");

const productRoutes = require("./routes/product");
// const usersRoutes = require("./routes/auth");

// if (process.env.NODE_ENV === "development") {
//   app.use(morgan("dev"));
// }
const cors = require("cors");
app.use(cors());

app.use(morgan("combined"));
app.use((req, res, next) => {
  next();
});

app.use((req, res, next) => {
  req.getTime = new Date().toISOString();
  next();
});
app.use(express.static(`${__dirname}/public/`));

app.use((req,res,next)=>{
  req.requestTime=new Date().toISOString();
  next();
})
// app.use("/api/v1/users", usersRoutes);
app.use("/api/v1/Product", productRoutes);


app.all('*',(req,res,next)=>{
  // res.status(404).json({
  //   status:'fail',
  //   message:`Cant find the Requested url ${req.originalUrl} on Server `
  // })
  const err=new Error(`Cant find the Requested url ${req.originalUrl} on Server `)
  err.status='fail';
  err.statusCode=404;
  next(err);
})

app.use((err,req,res,next)=>{
err.statusCode=err.statusCode||500;
err.status=err.status||"error"
res.status(err.statusCode).json({
  status:err.status,
  message:err.message
})

})

module.exports = app;
  // 
//   const express = require("express");
// const app = express();
// app.use(express.json());
// const morgan = require("morgan");

// const productRoutes = require("./routes/product");
// // const usersRoutes = require("./routes/auth");

// // if (process.env.NODE_ENV === "development") {
// //   app.use(morgan("dev"));
// // }
// const cors = require("cors");
// app.use(cors());

// app.use(morgan("combined"));

// app.use((req, res, next) => {
//   req.requestTime = new Date().toISOString();
//   next();
// });

// app.use(express.static(`${__dirname}/public/`));

// // app.use("/api/v1/users", usersRoutes);
// app.use("/api/v1/Product", productRoutes);

// app.all('*', (req, res, next) => {
//   const err = new Error(`Can't find the requested URL ${req.originalUrl} on this server`);
//   err.status = 'fail';
//   err.statusCode = 404;
//   next(err);
// });

// app.use((err, req, res, next) => {
//   err.statusCode = err.statusCode || 500;
//   err.status = err.status || "error";
//   res.status(err.statusCode).json({
//     status: err.status,
//     message: err.message
//   });
// });

// module.exports = app;
