"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllOrdersService = exports.newOrder = void 0;
const order_Model_1 = __importDefault(require("../models/order.Model"));
// ✅ Create new order (plain async function)
const newOrder = async (data, res) => {
    try {
        console.log("🟢 [newOrder] Creating new order with data:", data);
        const order = await order_Model_1.default.create(data);
        console.log("✅ [newOrder] Order created successfully:", order._id);
        res.status(201).json({
            success: true,
            order,
        });
    }
    catch (error) {
        console.error("🔥 [newOrder] Failed to create order:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to create order",
            error: error.message,
        });
    }
};
exports.newOrder = newOrder;
// ✅ Get all orders
const getAllOrdersService = async (res) => {
    try {
        console.log("🟢 [getAllOrdersService] Fetching all orders...");
        const orders = await order_Model_1.default.find().sort({ createdAt: -1 });
        console.log(`✅ [getAllOrdersService] Found ${orders.length} orders`);
        res.status(200).json({
            success: true,
            orders,
        });
    }
    catch (error) {
        console.error("🔥 [getAllOrdersService] Failed:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to fetch orders",
            error: error.message,
        });
    }
};
exports.getAllOrdersService = getAllOrdersService;
