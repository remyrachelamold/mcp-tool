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

const app = express();
app.use(express.json());

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
    name: z.string().describe("Updated name "),
    price: z.number().describe("Updated price "),
    category: z.string().describe("Updated category "),
  },
  async ({
    id, name, price, category
  }: { id: string; name?: string; price?: number; category?: string }): Promise<CallToolResult> => {
  const missingFields = [];
  if (!id) missingFields.push('id');
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
      const result = await updateCatalogItem({ id, data:{name, price, category }});
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
    // Get all items
    // server.tool("getCatalogs", {
    //   input: {
    //     type: "object",
    //     properties: {},
    //     required: []
    //   },
    //   output: {
    //     type: "object",
    //     properties: {
    //       output: { type: "array", items: { type: "object" }, description: "Catalog items" }
    //     },
    //     required: ["output"]
    //   },
    //   handler: async () => {
    //     console.log("Calling getCatalogs")
    //     try{
    //       const data = await getCatalogs();
    //        return { output: data };
    //     }
    //     catch(e){
    //       console.log(e);
    //     }
    //   }
    // } as any);

    // // Add an item
    // server.tool("addCatalogItem", {
    //   input: {
    //     type: "object",
    //     properties: {
    //       name: { type: "string" },
    //       price: { type: "number" },
    //       category: { type: "string" }
    //     },
    //     required: ["name", "price", "category"]
    //   },
    //   output: {
    //     type: "object",
    //     properties: {
    //       output: { type: "object", description: "Added catalog item" }
    //     },
    //     required: ["output"]
    //   },
    //   handler: async (input: { name: string, price: number, category: string }) => {
    //     const data = await addCatalogItem(input);
    //     return { output: data };
    //   }
    // } as any);

    // server.tool("updateCatalogItem", {
    //   input: {
    //     type: "object",
    //     properties: {
    //       id: { type: "string" },
    //       data: { type: "object" },
    //     },
    //     required: ["id", "data"]
    //   },
    //   output: {
    //     type: "object",
    //     properties: {
    //       output: { type: "object", description: "updated item or result" }
    //     },
    //     required: ["output"]
    //   },
    //   handler: async (input: { id:string, data:object }) => {
    //     const updated = await updateCatalogItem(input);
    //     return { output: updated };
    //   }
    // } as any);

    // // Delete an item by id
    // server.tool("deleteCatalogItem", {
    //   input: {
    //     type: "object",
    //     properties: {
    //       id: { type: "string" }
    //     },
    //     required: ["id"]
    //   },
    //   output: {
    //     type: "object",
    //     properties: {
    //       output: { type: "object", description: "Delete result or item" }
    //     },
    //     required: ["output"]
    //   },
    //   handler: async (input: { id: string }) => {
    //     const data = await deleteCatalogItem(input);
    //     return { output: data };
    //   }
    // } as any);

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
});
function getCatalogs() {
  throw new Error("Function not implemented.");
}

mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => logger.info("✅ MCP Tool connected to MongoDB"))
  .catch(err => logger.error("❌ MCP Tool MongoDB connection error:", err));
