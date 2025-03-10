console.log("Starting server...");
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const { CosmosClient } = require("@azure/cosmos");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 🔴 Check for Missing Environment Variables
if (!process.env.COSMOS_DB_URI || !process.env.COSMOS_DB_KEY) {
    console.error("❌ Missing CosmosDB environment variables! Check Azure App Service Configuration.");
    process.exit(1);  // Stop the app if credentials are missing
}

// ✅ Cosmos DB Config
const endpoint = process.env.COSMOS_DB_URI;
const key = process.env.COSMOS_DB_KEY;
const databaseId = "ProductDB";
const containerId = "Products";

const client = new CosmosClient({ endpoint, key });
let container;

async function initDatabase() {
    try {
        const database = client.database(databaseId);
        container = database.container(containerId);
        console.log("✅ Connected to CosmosDB successfully!");
    } catch (error) {
        console.error("❌ Error connecting to CosmosDB:", error.message);
        process.exit(1);  // Stop the app if database connection fails
    }
}

initDatabase();  // Initialize DB connection on startup

// ✅ Route to add a product
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

// ✅ Route to list all products
app.get("/products", async (req, res) => {
    try {
        const { resources } = await container.items.readAll().fetchAll();
        res.json(resources);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch products", error: error.message });
    }
});

// ✅ Route to search products
app.get("/search", async (req, res) => {
    const searchQuery = req.query.q?.toLowerCase();
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

// ✅ Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});
