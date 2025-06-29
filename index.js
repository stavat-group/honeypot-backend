const express = require("express");
const cors = require("cors");
const app = express();
const path = require('path');
require('dotenv').config({
    path: path.resolve(
        __dirname,
        process.env.NODE_ENV === 'production' ? '.env.prod' : '.env.local'
    )
});
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");



const connectDB = require("./src/config/db_Config");
const userRoutes = require("./src/routes/user_rotes");
const projectRoutes = require("./src/routes/project_routes");
const actionLogsRoutes = require("./src/routes/actionLogs_routes");

connectDB();

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/api/user", userRoutes);
app.use("/api/project", projectRoutes);
app.use("/api/actionLogs", actionLogsRoutes);

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});