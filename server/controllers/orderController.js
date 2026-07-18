import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Template from '../models/Template.js';
import { createPaymentOrder, verifyPaymentSignature } from '../services/razorpayService.js';

export const getOrderById = async (req, res) => {
  try {
    const queryId = req.params.id;
    const isMongoId = mongoose.isValidObjectId(queryId);
    
    const order = await Order.findOne({
      $or: [
        { _id: isMongoId ? queryId : null },
        { orderId: queryId }
      ],
      user: req.user._id
    }).populate('template');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ 
      success: true, 
      data: order,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createOrder = async (req, res) => {
  const { templateId, customizedData } = req.body;

  try {
    const template = await Template.findById(templateId);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    const existingPaidOrder = await Order.findOne({
      user: req.user._id,
      template: templateId,
      status: 'paid'
    });

    if (existingPaidOrder) {
      return res.json({
        success: true,
        message: 'You have already purchased this template.',
        alreadyPurchased: true,
        order: existingPaidOrder
      });
    }

    // Admin users get free access — auto-create a paid order without payment
    if (req.user.role === 'admin') {
      const adminOrder = await Order.create({
        orderId: `admin_free_${Date.now()}`,
        user: req.user._id,
        template: templateId,
        amount: 0,
        status: 'paid',
        paymentId: `admin_bypass_${Date.now()}`,
        customizedData,
      });

      return res.status(201).json({
        success: true,
        adminFreeAccess: true,
        message: 'Admin access granted — template unlocked for free.',
        order: adminOrder,
      });
    }

    const orderRecord = new Order({
      orderId: `temp_ref_${Date.now()}`,
      user: req.user._id,
      template: templateId,
      amount: template.price,
      status: 'pending',
      customizedData,
    });

    const paymentOrder = await createPaymentOrder(template.price, orderRecord._id.toString());

    orderRecord.orderId = paymentOrder.id;
    await orderRecord.save();

    res.status(201).json({
      success: true,
      orderId: paymentOrder.id,
      amount: paymentOrder.amount,
      currency: paymentOrder.currency,
      dbOrderId: orderRecord._id,
      isMock: paymentOrder.isMock,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyPayment = async (req, res) => {
  const { orderId, paymentId, signature } = req.body;

  try {
    const isAuthentic = verifyPaymentSignature(orderId, paymentId, signature);

    if (!isAuthentic) {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order reference not found' });
    }

    order.status = 'paid';
    order.paymentId = paymentId || `pay_mock_${Date.now()}`;
    await order.save();

    res.json({
      success: true,
      message: 'Payment verified and order updated successfully',
      data: order,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate({
        path: 'template',
        populate: { path: 'category', select: 'name slug' }
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const downloadTemplateFile = async (req, res) => {
  const { templateId } = req.params;

  try {
    let order = await Order.findOne({
      user: req.user._id,
      template: templateId,
      status: 'paid'
    });

    // Bypass purchase requirement for admin users and test user harry
    if (!order && (req.user.role === 'admin' || req.user.name === 'harry' || req.user.email === 'harry@memoriastudio.com')) {
      order = { status: 'paid' };
    }

    if (!order) {
      return res.status(403).json({
        success: false,
        message: 'Purchase restriction: Access denied. You must buy this template before downloading it.'
      });
    }

    const template = await Template.findById(templateId);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template files not found' });
    }

    res.json({
      success: true,
      fileUrl: template.fileUrl,
      title: template.title,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate('user', 'name email')
      .populate('template', 'title price type')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.status = req.body.status || order.status;
    const updatedOrder = await order.save();

    res.json({ success: true, data: updatedOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
