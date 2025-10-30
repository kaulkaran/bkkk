import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import UserModel from "../models/user.model";
import CourseModel from "../models/course.model";
import path from "path";
import ejs from "ejs";
import sendMail from "../utils/sendMail";
import NotificationModel from "../models/notification.Model";
import { newOrder, getAllOrdersService } from "../services/order.service";
import { redis } from "../utils/redis";
import dotenv from "dotenv";
dotenv.config();

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// ===============================
// 💳 CREATE ORDER
// ===============================
export const createOrder = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    console.log("🟡 [createOrder] Incoming request body:", req.body);

    try {
      const { courseId, payment_info } = req.body;

      if (payment_info && "id" in payment_info) {
        console.log("🔹 Verifying payment intent:", payment_info.id);
        const paymentIntent = await stripe.paymentIntents.retrieve(
          payment_info.id
        );
        if (paymentIntent.status !== "succeeded") {
          console.warn(
            "⚠️ Payment not authorized! Status:",
            paymentIntent.status
          );
          return next(new ErrorHandler("Payment not authorized!", 400));
        }
      }

      const user = await UserModel.findById(req.user?._id);
      if (!user) return next(new ErrorHandler("User not found", 404));

      const courseExistInUser = user.courses.some(
        (course: any) => course._id.toString() === courseId
      );
      if (courseExistInUser) {
        return next(
          new ErrorHandler("You have already purchased this course", 400)
        );
      }

      const course = await CourseModel.findById(courseId);
      if (!course) return next(new ErrorHandler("Course not found", 404));

      console.log("📘 Course found:", course.name);

      const data = {
        courseId: course._id,
        userId: user._id,
        payment_info,
      };

      // Send Email
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

      await sendMail({
        email: user.email,
        subject: "Order Confirmation",
        template: "order-confirmation.ejs",
        data: mailData,
      });

      console.log("✅ Order confirmation email sent to:", user.email);

      // Update user data
      user.courses.push(course._id);
      await redis.set(req.user?._id, JSON.stringify(user));
      await user.save();

      // Create notification
      await NotificationModel.create({
        user: user._id,
        title: "New Order",
        message: `You have a new order from ${course.name}`,
      });

      // Increment course purchase count
      course.purchased = course.purchased + 1;
      await course.save();

      console.log("✅ Creating new order entry in database...");
      await newOrder(data, res); // ✅ FIXED
    } catch (error: any) {
      console.error("🔥 [createOrder] Internal Server Error:", error.message);
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ===============================
// 📦 GET ALL ORDERS (Admin)
// ===============================
export const getAllOrders = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    console.log("🟢 [getAllOrders] Request received");
    try {
      await getAllOrdersService(res);
    } catch (error: any) {
      console.error("🔥 [getAllOrders] Error:", error.message);
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ===============================
// 🔑 SEND STRIPE PUBLISHABLE KEY
// ===============================
export const sendStripePublishableKey = CatchAsyncError(
  async (req: Request, res: Response) => {
    res.status(200).json({
      publishablekey: process.env.STRIPE_PUBLISHABLE_KEY,
    });
  }
);

// ===============================
// 💰 NEW PAYMENT (Stripe Intent)
// ===============================
export const newPayment = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
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
    } catch (error: any) {
      console.error("🔥 [newPayment] Stripe error:", error.message);
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
