console.log("Starting server...");
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const { CosmosClient } = require("@azure/cosmos");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Cosmos DB Config
const endpoint = process.env.COSMOS_DB_URI;
const key = process.env.COSMOS_DB_KEY;
const databaseId = "ProductDB";
const containerId = "Products";
const client = new CosmosClient({ endpoint, key });
const container = client.database(databaseId).container(containerId);

// Route to add a product
app.post("/add-product", async (req, res) => {
    const { name, price, description } = req.body;
    if (!name || !price) {
        return res.status(400).json({ message: "Name and price are required" });
    }
    
    const product = { id: new Date().getTime().toString(), name, price, description };

    try {
        await container.items.create(product);
        res.status(201).json({ message: "Product added", product });
    } catch (error) {
        res.status(500).json({ message: "Failed to add product", error: error.message });
    }
});

// Route to list all products
app.get("/products", async (req, res) => {
    try {
        const { resources } = await container.items.readAll().fetchAll();
        res.json(resources);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch products", error: error.message });
    }
});

// Route to search products
app.get("/search", async (req, res) => {
    const searchQuery = req.query.q.toLowerCase();
    if (!searchQuery) {
        return res.status(400).json({ message: "Search query is required" });
    }

    try {
        const { resources } = await container.items.readAll().fetchAll();
        const filteredProducts = resources.filter(product =>
            product.name.toLowerCase().includes(searchQuery) ||
            (product.description && product.description.toLowerCase().includes(searchQuery))
        );
        res.json(filteredProducts);
    } catch (error) {
        res.status(500).json({ message: "Search failed", error: error.message });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
