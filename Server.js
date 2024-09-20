const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
const app = require("./app");
console.log(process.env.NODE_ENV);

mongoose
  .connect(
    `mongodb+srv://msms5476mmmm:ms201426@shivamelectronics.ahdcm.mongodb.net/?retryWrites=true&w=majority&appName=ShivamElectronics`
  )
  .then((con) => {});
const cors = require("cors");
app.use(cors());

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

//
{
  /* <html>
<head>
    <style>
        body {
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background-color: #f0f0f0;
        }
        .container {
            width: 80%;
            height: 80%;
            background: url('https://placehold.co/800x600') no-repeat center center;
            background-size: cover;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 20px;
            box-sizing: border-box;
        }
        .top-bar, .bottom-bar {
            width: 100%;
            height: 50px;
            background-color: rgba(0, 0, 0, 0.7);
            border-radius: 25px;
        }
        .content {
            display: flex;
            justify-content: space-between;
            flex-grow: 1;
            margin: 20px 0;
        }
        .left-panel, .right-panel {
            background-color: rgba(0, 0, 0, 0.7);
            border-radius: 25px;
        }
        .left-panel {
            width: 30%;
            height: 100%;
        }
        .right-panel {
            width: 65%;
            height: 100%;
        }

        @media (max-width: 768px) {
            .container {
                width: 90%;
                height: 90%;
            }
            .top-bar, .bottom-bar {
                height: 40px;
            }
            .content {
                flex-direction: column;
                align-items: center;
            }
            .left-panel, .right-panel {
                width: 90%;
                height: 45%;
                margin-bottom: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="top-bar"></div>
        <div class="content">
            <div class="left-panel"></div>
            <div class="right-panel"></div>
        </div>
        <div class="bottom-bar"></div>
    </div>
</body>
</html> */
}
//
