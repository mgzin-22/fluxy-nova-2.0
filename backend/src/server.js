require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const authRoutes = require("./routes/auth.routes");
const vendasRoutes = require("./routes/vendas.routes");
const userRoutes = require("./routes/user.routes");
const productRoutes = require("./routes/product.routes");
const notificationRoutes = require("./routes/notification.routes");

app.use("/products", productRoutes);
app.use("/user", userRoutes);
app.use("/auth", authRoutes);
app.use("/vendas", vendasRoutes);
app.use("/notifications", notificationRoutes);

app.get("/", (req, res) => {
  res.json({ message: "API Fluxy rodando 🚀" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});