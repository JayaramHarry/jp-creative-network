import Razorpay from 'razorpay';
import crypto from 'crypto';

const isRazorpayConfigured = () => {
  return (
    process.env.RAZORPAY_KEY_ID &&
    process.env.RAZORPAY_KEY_SECRET &&
    !process.env.RAZORPAY_KEY_ID.includes('mock')
  );
};

const maskRazorpayId = (keyId) => {
  if (!keyId) return 'N/A';
  if (keyId.length <= 8) return '****';
  return `${keyId.substring(0, 8)}****${keyId.substring(keyId.length - 3)}`;
};

console.log('=== RAZORPAY DIAGNOSTIC LOGS ===');
console.log(`RAZORPAY_KEY_ID exists: ${!!process.env.RAZORPAY_KEY_ID}`);
console.log(`RAZORPAY_KEY_SECRET exists: ${!!process.env.RAZORPAY_KEY_SECRET}`);
console.log(`Masked Key ID: ${maskRazorpayId(process.env.RAZORPAY_KEY_ID)}`);

let razorpayInstance = null;
if (isRazorpayConfigured()) {
  try {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    console.log('[Diagnostic] Razorpay instance initialized successfully.');
  } catch (error) {
    console.error('[Diagnostic] Error initializing Razorpay:', error);
  }
} else {
  console.log('[Diagnostic] Razorpay credentials missing or running in mock mode.');
}
console.log('=================================');

export const createPaymentOrder = async (amount, receipt) => {
  const amountInPaise = Math.round(amount * 100);

  if (isRazorpayConfigured() && razorpayInstance) {
    try {
      const options = {
        amount: amountInPaise,
        currency: 'INR',
        receipt: receipt,
      };
      const order = await razorpayInstance.orders.create(options);
      return {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
        isMock: false,
      };
    } catch (error) {
      console.error('Razorpay API error, falling back to Mock order:', error);
    }
  }

  const mockOrderId = `order_mock_${Math.random().toString(36).substring(2, 15)}`;
  return {
    id: mockOrderId,
    amount: amountInPaise,
    currency: 'INR',
    status: 'created',
    isMock: true,
  };
};

export const verifyPaymentSignature = (orderId, paymentId, signature) => {
  const isMock = orderId.startsWith('order_mock_') || paymentId.startsWith('pay_mock_') || signature === 'mock_signature_approved';

  if (!isRazorpayConfigured()) {
    // In local development or mock mode (when Razorpay credentials are not set), allow mock payments
    return isMock || true;
  }

  // In production/when Razorpay credentials ARE set, block any mock credentials!
  if (isMock) {
    console.warn(`Blocked mock payment signature attempt for order: ${orderId}`);
    return false;
  }

  try {
    const text = orderId + '|' + paymentId;
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    return generated_signature === signature;
  } catch (error) {
    console.error('Error verifying Razorpay signature:', error);
    return false;
  }
};
