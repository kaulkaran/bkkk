"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.newPayment = exports.sendStripePublishableKey = exports.getAllOrders = exports.createOrder = void 0;
const catchAsyncErrors_1 = require("../middleware/catchAsyncErrors");
const ErrorHandler_1 = __importDefault(require("../utils/ErrorHandler"));
const user_model_1 = __importDefault(require("../models/user.model"));
const course_model_1 = __importDefault(require("../models/course.model"));
const path_1 = __importDefault(require("path"));
const ejs_1 = __importDefault(require("ejs"));
const sendMail_1 = __importDefault(require("../utils/sendMail"));
const notification_Model_1 = __importDefault(require("../models/notification.Model"));
const order_service_1 = require("../services/order.service");
const redis_1 = require("../utils/redis");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// create order
exports.createOrder = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    console.log("🟡 [createOrder] Incoming request body:", req.body);
    try {
        const { courseId, payment_info } = req.body;

        if (payment_info) {
            if ("id" in payment_info) {
                console.log("🔹 Verifying payment intent:", payment_info.id);
                const paymentIntentId = payment_info.id;

                const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
                console.log("🔹 Payment intent retrieved:", paymentIntent.status);

                if (paymentIntent.status !== "succeeded") {
                    console.warn("⚠️ Payment not authorized! Status:", paymentIntent.status);
                    return next(new ErrorHandler_1.default("Payment not authorized!", 400));
                }
            } else {
                console.warn("⚠️ payment_info does not contain an ID field");
            }
        }

        const user = await user_model_1.default.findById(req.user?._id);
        console.log("👤 User found:", user ? user.email : "No user");

        const courseExistInUser = user?.courses.some((course) => course._id.toString() === courseId);
        if (courseExistInUser) {
            console.warn("⚠️ User already owns this course:", courseId);
            return next(new ErrorHandler_1.default("You have already purchased this course", 400));
        }

        const course = await course_model_1.default.findById(courseId);
        if (!course) {
            console.error("❌ Course not found:", courseId);
            return next(new ErrorHandler_1.default("Course not found", 404));
        }

        console.log("📘 Course found:", course.name);

        const data = {
            courseId: course._id,
            userId: user?._id,
            payment_info,
        };

        const mailData = {
            order: {
                _id: course._id.toString().slice(0, 6),
                name: course.name,
                price: course.price,
                date: new Date().toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                }),
            },
        };

        console.log("📧 Preparing order confirmation email for:", user?.email);

        try {
            if (user) {
                await (0, sendMail_1.default)({
                    email: user.email,
                    subject: "Order Confirmation",
                    template: "order-confirmation.ejs",
                    data: mailData,
                });
                console.log("✅ Order confirmation email sent to:", user.email);
            }
        } catch (error) {
            console.error("🔥 Failed to send email:", error.message);
            return next(new ErrorHandler_1.default(error.message, 500));
        }

        console.log("🗃️ Updating user course list...");
        user?.courses.push(course?._id);
        await redis_1.redis.set(req.user?._id, JSON.stringify(user));
        await user?.save();

        console.log("🔔 Creating notification for new order...");
        await notification_Model_1.default.create({
            user: user?._id,
            title: "New Order",
            message: `You have a new order from ${course?.name}`,
        });

        console.log("📈 Increasing course purchase count...");
        course.purchased = course.purchased + 1;
        await course.save();

        console.log("✅ Creating new order entry in database...");
        (0, order_service_1.newOrder)(data, res, next);
    } catch (error) {
        console.error("🔥 [createOrder] Internal Server Error:", error.message);
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});

// get All orders --- only for admin
exports.getAllOrders = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    console.log("🟢 [getAllOrders] Request received");
    try {
        (0, order_service_1.getAllOrdersService)(res);
    } catch (error) {
        console.error("🔥 [getAllOrders] Error:", error.message);
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});

//  send stripe publishble key
exports.sendStripePublishableKey = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res) => {
    console.log("🟢 [sendStripePublishableKey] Sending publishable key");
    res.status(200).json({
        publishablekey: process.env.STRIPE_PUBLISHABLE_KEY,
    });
});

// new payment
exports.newPayment = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    console.log("🟡 [newPayment] Creating new payment with body:", req.body);
    try {
        const myPayment = await stripe.paymentIntents.create({
            amount: req.body.amount,
            currency: "USD",
            description: "QualtSpire course services",
            metadata: {
                company: "QualtSpire",
            },
            automatic_payment_methods: {
                enabled: false,
            },
            payment_method_types: ["card"],
            shipping: {
                name: "Harmik Lathiya",
                address: {
                    line1: "510 Townsend St",
                    postal_code: "98140",
                    city: "San Francisco",
                    state: "CA",
                    country: "US",
                },
            },
        });

        console.log("✅ [newPayment] Payment intent created:", myPayment.id);
        res.status(201).json({
            success: true,
            client_secret: myPayment.client_secret,
        });
    } catch (error) {
        console.error("🔥 [newPayment] Stripe error:", error.message);
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
