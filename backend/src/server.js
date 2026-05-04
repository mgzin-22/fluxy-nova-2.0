const express = require("express");
const cors = require("cors");


const app = express();

//  PRIMEIRO vem os middlewares
app.use(cors());
app.use(express.json());

//  depois as rotas
const authRoutes = require("./routes/auth.routes");
const vendasRoutes = require("./routes/vendas.routes");
const userRoutes = require("./routes/user.routes");
const productRoutes = require("./routes/product.routes");

app.use("/products", productRoutes);
app.use("/user", userRoutes);
app.use("/auth", authRoutes);
app.use("/vendas", vendasRoutes);

// rota teste
app.get("/", (req, res) => {
  res.json({ message: "API Fluxy rodando 🚀" });
});

app.listen(3000, () => {
  console.log("Servidor rodando em http://localhost:3000");
});