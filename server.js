console.log("Starting server...");
require("dotenv").config();  

const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const { CosmosClient } = require("@azure/cosmos");

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, "public")));

console.log("🔍 Checking environment variables...");
console.log("COSMOS_DB_URI:", process.env.COSMOS_DB_URI || "NOT SET");
console.log("COSMOS_DB_KEY:", process.env.COSMOS_DB_KEY ? "SET" : "NOT SET");
console.log("COSMOS_DB_NAME:", process.env.COSMOS_DB_NAME || "NOT SET");

if (!process.env.COSMOS_DB_URI || !process.env.COSMOS_DB_KEY || !process.env.COSMOS_DB_NAME) {
    console.error("Missing CosmosDB environment variables! Check Azure App Service Configuration.");
    process.exit(1);
}

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
        console.log("Connected to CosmosDB successfully!");
    } catch (error) {
        console.error("Error connecting to CosmosDB:", error.message);
        process.exit(1);
    }
}

initDatabase();  

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

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

app.get("/products", async (req, res) => {
    try {
        const { resources } = await container.items.readAll().fetchAll();
        res.json(resources);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch products", error: error.message });
    }
});

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

app.delete("/delete-product/:id", async (req, res) => {
    const productId = req.params.id;

    if (!productId) {
        return res.status(400).json({ message: "Product ID is required" });
    }

    try {
        const item = container.item(productId); 
        const { resource } = await item.delete();

       // if (!resource) {
       //     return res.status(404).json({ message: "Product not found in database" });
       // }

        res.json({ message: "Product deleted successfully" });
    } catch (error) {
        console.error("Error deleting product:", error.message);
        res.status(500).json({ message: "Failed to delete product", error: error.message });
    }
});


const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
