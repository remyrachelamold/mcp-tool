import express from "express";
import mongoose from 'mongoose';
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import logger from "./logger.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolResult, isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import {addCatalogItem, updateCatalogItem, getCatalog, deleteCatalogItem} from "./controllers/itemController.js";
import { text } from "node:stream/consumers";
const PORT=process.env.PORT || 3000;

const app = express();
app.use(express.json());

import dotenv from "dotenv";
import catalog from "./routes/catalog.js";
import { userInfo } from "os";

dotenv.config();

// Middleware
app.use(express.json());
app.use('/catalogs',catalog );

//OPTIONS route 
app.options("/items", (req, res) => {
  res.set("Allow", "GET,POST,PUT,DELETE,OPTIONS").send();
});

const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

app.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports[sessionId]) {
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        transports[sessionId] = transport;
      },
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        delete transports[transport.sessionId];
      }
    };

    const server = new McpServer({
      name: "mcp-server",
      version: "1.0.0",
    });

// Get all items
server.tool(
  "get-all-items", "Get all items",
  {},
  async({}): Promise<CallToolResult> => {
    try {
      const data = await getCatalog();
      return {
        content: [
          { type: "text", text: JSON.stringify(data) }
        ]
      };
    } catch (e) {
      return {
        content: [
          { type: "text", text: "Error: " + e }
        ]
      };
    }
  }
);

// Create item
server.tool(
  "create-item",
  "Create an item",
  {
    name: z.string().describe("Name of the item"),
    price: z.number().describe("Price of the item"),
    category: z.string().describe("Category of the item"),
  },
  async ({ name, price, category }): Promise<CallToolResult> => {
    const missingFields = [];
  if (!name) missingFields.push('name');
  if (!price) missingFields.push('price');
  if (!category) missingFields.push('category');
  if (missingFields.length > 0) {
    return {
      isError: true,
      content: [
        { type: "text", text: `Field(s) required: ${missingFields.join(', ')}` }
      ]
    };
  }
    try {
      const result = await addCatalogItem({ name, price, category });
      return {
        content: [
          {
            type: "text",
            text: `Item created successfully!\n${JSON.stringify(result, null, 2)}`
          },
        ],
      };
    } catch (e: any) {
      return {
        isError: true,
        content: [
          { type: "text", text: `Error: ${e.message || e}` },
        ],
      };
    }
  }
);

// Update item
server.tool(
  "update-item", "Update an item",
 {
    id: z.string().describe("ID of the item"),
    name: z.string().optional().describe("Updated name "),
    price: z.number().optional().describe("Updated price "),
    category: z.string().optional().describe("Updated category "),
  },
  async ({
    id, name, price, category
  }: { id: string; name?: string; price?: number; category?: string }): Promise<CallToolResult> => {
  if (!id) {
    return {
      isError: true,
      content: [
        { type: "text", text: "Field 'id' is required"} 
      ]
    };
  }
  const updateData:Record<string,any>={};
  if (typeof name === "string" && name.trim().length > 0)updateData.name=name;
  if (typeof price === "number" && ! isNaN(price))updateData.price=price;
  if (typeof category === "string" && category.trim().length > 0)updateData.category=category;
  if (Object.keys(updateData).length === 0){
    return {
      isError: true,
      content: [
        { type: "text", text: "Provide at least one field to update "} 
      ]
    };
  }
  
    try {
      const result = await updateCatalogItem({ id, data: updateData});
      return {
        content: [
          { type: "text", text: JSON.stringify(result) }
        ]
      };
    } catch(e) {
      return {
        isError: true,
        content: [
          { type: "text", text: "Error: " + e }
        ]
      };
    }
  }
);

// Delete item
server.tool(
  "delete-item", "Delete an item",
  {
    id: z.string().describe("ID of the item"),
  },
  async ({ id }: { id: string }): Promise<CallToolResult> => {
    try {
      const result = await deleteCatalogItem({ id });
      return {
        content: [
          { type: "text", text: "Item deleted successfully" }
        ]
      };
    } catch(e) {
      return {
        isError: true,
        content: [
          { type: "text", text: "Error: " + e }
        ]
      };
    }
  }
);
  
    await server.connect(transport);
  } else {
    res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Bad Request: No valid session ID" },
      id: null,
    });
    return;
  }
  await transport.handleRequest(req, res, req.body);
});

app.get("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }
  await transports[sessionId].handleRequest(req, res);
});

app.delete("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }
  await transports[sessionId].handleRequest(req, res);
});

app.listen(3000, () => {
  logger.info("✅ MCP Echo Server running at http://localhost:3000/mcp");
  logger.info(`🚀 Server running at http://localhost:3000`);
});
function getCatalogs() {
  throw new Error("Function not implemented.");
}

mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => logger.info("✅ MCP Tool connected to MongoDB"))
  .catch(err => logger.error("❌ MCP Tool MongoDB connection error:", err));

  export default app;
