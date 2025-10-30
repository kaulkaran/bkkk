import { Response } from "express";
import OrderModel from "../models/order.Model";

// ✅ Create new order (plain async function)
export const newOrder = async (data: any, res: Response) => {
  try {
    console.log("🟢 [newOrder] Creating new order with data:", data);

    const order = await OrderModel.create(data);

    console.log("✅ [newOrder] Order created successfully:", order._id);

    res.status(201).json({
      success: true,
      order,
    });
  } catch (error: any) {
    console.error("🔥 [newOrder] Failed to create order:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: error.message,
    });
  }
};

// ✅ Get all orders
export const getAllOrdersService = async (res: Response) => {
  try {
    console.log("🟢 [getAllOrdersService] Fetching all orders...");
    const orders = await OrderModel.find().sort({ createdAt: -1 });
    console.log(`✅ [getAllOrdersService] Found ${orders.length} orders`);

    res.status(200).json({
      success: true,
      orders,
    });
  } catch (error: any) {
    console.error("🔥 [getAllOrdersService] Failed:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
};
