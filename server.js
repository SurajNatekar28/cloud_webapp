console.log("Starting server...");
require("dotenv").config();  // ✅ Load environment variables from .env

const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const { CosmosClient } = require("@azure/cosmos");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ✅ Serve static frontend files
app.use(express.static(path.join(__dirname, "public")));

// 🔍 Debugging Logs (Check Environment Variables)
console.log("🔍 Checking environment variables...");
console.log("COSMOS_DB_URI:", process.env.COSMOS_DB_URI || "❌ NOT SET");
console.log("COSMOS_DB_KEY:", process.env.COSMOS_DB_KEY ? "✅ SET" : "❌ NOT SET");
console.log("COSMOS_DB_NAME:", process.env.COSMOS_DB_NAME || "❌ NOT SET");

// 🔴 Stop if variables are missing
if (!process.env.COSMOS_DB_URI || !process.env.COSMOS_DB_KEY || !process.env.COSMOS_DB_NAME) {
    console.error("❌ Missing CosmosDB environment variables! Check Azure App Service Configuration.");
    process.exit(1);
}

// ✅ Cosmos DB Config (Using Environment Variables)
const endpoint = process.env.COSMOS_DB_URI;
const key = process.env.COSMOS_DB_KEY;
const databaseId = process.env.COSMOS_DB_NAME;
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
        process.exit(1);
    }
}

initDatabase();  // Initialize DB connection on startup

// ✅ Serve frontend (index.html) at "/"
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

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

// ✅ Route to delete a product (Updated)
app.delete("/delete-product/:id", async (req, res) => {
    const { id } = req.params;

    try {
        // 🔍 Read the product to get partition key
        const { resource } = await container.item(id, id).read();

        if (!resource) {
            return res.status(404).json({ message: "Product not found in database" });
        }

        // ✅ Delete product using correct partition key
        await container.item(id, id).delete();
        res.status(200).json({ message: "Product deleted successfully" });

    } catch (error) {
        res.status(500).json({ message: "Failed to delete product", error: error.message });
    }
});




// ✅ Start the server (Port 8080 for Azure)
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server running on port ${PORT}`);
});
