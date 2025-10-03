import express from "express";
import { getFilteredItems, createItem, updateItem, patchItem, deleteItem} from "../controllers/itemController.js";

const router = express.Router();

// router.post("/create", createUser);
router.get('/test', (req,res) => res.send("Test route OK"));
router.get("/", getFilteredItems);
router.post("/", createItem);
router.put("/:id", updateItem);
router.patch("/:id", patchItem);
router.delete("/:id", deleteItem);

export default router;