import request from "supertest";
import mongoose from "mongoose";
import app from "../index.js"; // make sure index exports app
import Item from "../model/items.js";
beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI);
});
afterAll(async () => {
    await mongoose.connection.close();
});
// ✅ Test GET all items
describe("GET /catalogs", () => {
    it("should return all items and include 'The Alchemist'", async () => {
        const res = await request(app).get("/catalogs");
        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
        // check for The Alchemist
        const alchemist = res.body.find((i) => i.name === "The Alchemist");
        expect(alchemist).toBeDefined();
        expect(alchemist.price).toBe(500);
        expect(alchemist.category).toBe("Books");
    });
});
// ✅ Test GET items by category = Books
describe("GET /catalogs?category=Books", () => {
    it("should return only books (The Alchemist & Atomic Habits)", async () => {
        const res = await request(app).get("/catalogs?category=Books");
        expect(res.status).toBe(200);
        const names = res.body.map((i) => i.name);
        expect(names).toContain("The Alchemist");
        expect(names).toContain("Atomic Habits");
        res.body.forEach((item) => {
            expect(item.category).toBe("Books");
        });
    });
});
// ✅ Test POST new item
describe("POST /catalogs", () => {
    it("should create a new item 'Laptop'", async () => {
        const newItem = { name: "Laptop", price: 60000, category: "Electronics" };
        const res = await request(app).post("/catalogs").send(newItem);
        expect(res.status).toBe(201);
        expect(res.body.data.name).toBe("Laptop");
        expect(res.body.data.category).toBe("Electronics");
    });
});
// ✅ Test PUT update an item (update Smartphone price)
describe("PUT /catalogs/:id", () => {
    it("should update the Smartphone price to 25000", async () => {
        const res = await request(app)
            .put("/catalogs/68b930e4e3744bf8d629c7fe") // Smartphone ID
            .send({ price: 25000 });
        expect(res.status).toBe(200);
        expect(res.body.data.price).toBe(25000);
        expect(res.body.data.name).toBe("Smartphone");
    });
});
// ✅ Test PATCH (partial update Headphones price)
describe("PATCH /catalogs/:id", () => {
    it("should update Headphones price to 1500", async () => {
        const res = await request(app)
            .patch("/catalogs/68b9311ae3744bf8d629c800") // Headphones ID
            .send({ price: 1500 });
        expect(res.status).toBe(200);
        expect(res.body.data.price).toBe(1500);
        expect(res.body.data.name).toBe("Headphones");
    });
});
// ✅ Test DELETE an item (delete Jeans)
describe("DELETE /catalogs/:id", () => {
    it("should delete the Jeans item", async () => {
        // 1. Create Jeans first
        const jeans = await Item.create({
            name: "Jeans",
            price: 1200,
            category: "Clothing",
        });
        // 2. Delete Jeans by its freshly created ID
        const res = await request(app).delete(`/catalogs/${jeans._id}`);
        // 3. Check response
        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Item deleted successfully");
        expect(res.body.data.name).toBe("Jeans");
    });
});
