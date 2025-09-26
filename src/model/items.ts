import mongoose from "mongoose";

export interface IItem {
  name: string;
  price: number;
  category: string;
}

const itemSchema = new mongoose.Schema<IItem>({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
});

export default mongoose.model<IItem>("Item",itemSchema);
