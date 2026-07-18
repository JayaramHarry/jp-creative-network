import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import API, { resolveUploadUrl } from '../../services/api.js';
import { AuthContext } from '../../context/AuthContext.js';
import './Checkout.css';

export default function Checkout() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [razorpayKey, setRazorpayKey] = useState('');
  
  // Mock Payment Form details
  const [selectedMockMethod, setSelectedMockMethod] = useState('card'); // 'card', 'upi', 'netbanking'
  const [cardNumber, setCardNumber] = useState('4111 2222 3333 4444');
  const [cardExpiry, setCardExpiry] = useState('12/29');
  const [cardCvv, setCardCvv] = useState('123');
  const [upiId, setUpiId] = useState('memoria@oksbi');

  // Load Order Details
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data } = await API.get(`/orders/${orderId}`);
        
        // Diagnostic log: Log the response from the order creation API before Checkout opens
        console.log('[Diagnostic] Checkout Order Response:', data);

        if (data.success) {
          setOrder(data.data);
          if (data.razorpayKeyId) {
            setRazorpayKey(data.razorpayKeyId);
          }
          
          // If already paid, send straight to success
          if (data.data.status === 'paid') {
            navigate(`/payment-success?orderId=${data.data.orderId}`);
          }
        }
      } catch (err) {
        console.error('Error fetching order details for checkout:', err);
        setError(err.response?.data?.message || 'Could not retrieve order information.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  // Load Razorpay Script
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Launch Live Razorpay Checkout
  const handleRazorpayPayment = async () => {
    try {
      setPaymentProcessing(true);
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        alert('Razorpay SDK failed to load. Are you connected to the internet?');
        setPaymentProcessing(false);
        return;
      }

      // We need the Razorpay key. Let's make an API call to get it or fetch it during order creation if stored.
      // Since orderRecord stores the mock or live status, let's look up key. If we don't have it, we fallback.
      // We also returned razorpayKeyId in createOrder. In case we navigated directly to /checkout/:id, 
      // let's fetch config or check if the backend response can provide it.
      // We will try to request the key via a dummy verify signature or use a standard environment value if hardcoded.
      // To ensure reliability, we can query it or fallback. Let's assume we returned it. Since we didn't save it in Order model,
      // let's define a fallback or mock payment verification directly.
      
      const keyId = order.isMock ? '' : (razorpayKey || process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_test_mockKey');

      console.log(`[Diagnostic] Initializing Razorpay Checkout with Key ID: ${keyId}`);

      const options = {
        key: keyId,
        amount: order.amount,
        currency: 'INR',
        name: 'Memoria Studio',
        description: `Premium Card Template: ${order.template?.title}`,
        order_id: order.orderId,
        handler: async function (response) {
          try {
            const verifyRes = await API.post('/orders/verify', {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });

            if (verifyRes.data.success) {
              navigate(`/payment-success?orderId=${response.razorpay_order_id}`);
            } else {
              alert('Payment validation failed.');
            }
          } catch (err) {
            console.error('Error verifying payment signature:', err);
            alert('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: {
          color: '#6366f1',
        },
        modal: {
          ondismiss: function () {
            setPaymentProcessing(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error('Razorpay Modal error:', err);
      setPaymentProcessing(false);
    }
  };

  // Launch Simulated Payment Checkout
  const handleMockPayment = async () => {
    setPaymentProcessing(true);
    
    // Simulate transaction delay
    setTimeout(async () => {
      try {
        const mockPaymentId = `pay_mock_${Math.random().toString(36).substring(2, 12)}`;
        const mockSignature = 'mock_signature_approved';

        const { data } = await API.post('/orders/verify', {
          orderId: order.orderId,
          paymentId: mockPaymentId,
          signature: mockSignature,
        });

        if (data.success) {
          navigate(`/payment-success?orderId=${order.orderId}`);
        } else {
          setError('Simulated payment verification failed on backend.');
          setPaymentProcessing(false);
        }
      } catch (err) {
        console.error('Error during mock verification:', err);
        setError('Error verifying simulated payment.');
        setPaymentProcessing(false);
      }
    }, 1500);
  };

  if (loading) {
    return (
      <div className="loader-container">
        <div className="loader"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="checkout-error-container max-width-container">
        <div className="glass-card error-card">
          <h2>Checkout Error</h2>
          <p>{error || 'Order detail lookup failed.'}</p>
          <Link to="/templates" className="btn btn-primary">Browse Templates</Link>
        </div>
      </div>
    );
  }

  const isMockOrder = order.orderId.startsWith('order_mock_');

  return (
    <div className="checkout-page max-width-container fade-in-up">
      <div className="checkout-header">
        <h1>Complete Your <span>Purchase</span></h1>
        <p>Order Reference: <strong>{order.orderId}</strong></p>
      </div>

      <div className="checkout-grid">
        {/* Left: Summary Panel */}
        <div className="summary-side">
          <div className="order-summary-card glass-card">
            <h2>Order Summary</h2>
            <div className="summary-item-row">
              <div className="template-preview-small" style={{ backgroundImage: `url(${resolveUploadUrl(order.template?.previewUrl)})` }} />
              <div className="summary-item-details">
                <h3>{order.template?.title}</h3>
                <span className="summary-item-cat">{order.template?.category?.name || 'Category'}</span>
                <span className="summary-item-format">{order.template?.type === 'image' ? 'Image Design' : 'Video Template'}</span>
              </div>
            </div>

            <hr className="summary-divider" />

            <div className="summary-total-row">
              <span>Template Price</span>
              <span className="summary-price-num">₹{order.amount}</span>
            </div>

            <div className="summary-total-row final-total">
              <span>Total Amount</span>
              <span className="summary-price-num highlight">₹{order.amount}</span>
            </div>
            
            <p className="summary-notice">
              🔒 Safe & Secure Checkout. Instant download will be unlocked in your dashboard upon payment verification.
            </p>
          </div>
        </div>

        {/* Right: Payment Method Selection */}
        <div className="payment-side">
          {isMockOrder ? (
            /* Mock Simulator Card */
            <div className="payment-method-card glass-card">
              <div className="simulator-badge">TEST MODE SIMULATOR</div>
              <h2>Select Mock Payment Method</h2>
              
              <div className="mock-tabs">
                <button 
                  className={`tab-btn ${selectedMockMethod === 'card' ? 'active' : ''}`}
                  onClick={() => setSelectedMockMethod('card')}
                >
                  💳 Credit/Debit Card
                </button>
                <button 
                  className={`tab-btn ${selectedMockMethod === 'upi' ? 'active' : ''}`}
                  onClick={() => setSelectedMockMethod('upi')}
                >
                  📱 UPI / QR Code
                </button>
                <button 
                  className={`tab-btn ${selectedMockMethod === 'netbanking' ? 'active' : ''}`}
                  onClick={() => setSelectedMockMethod('netbanking')}
                >
                  🏦 Net Banking
                </button>
              </div>

              <div className="tab-content">
                {selectedMockMethod === 'card' && (
                  <div className="card-input-simulator fade-in-up">
                    <div className="form-group">
                      <label className="form-label">Card Number</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={cardNumber} 
                        onChange={(e) => setCardNumber(e.target.value)}
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group flex-1">
                        <label className="form-label">Expiry Date</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                        />
                      </div>
                      <div className="form-group flex-1">
                        <label className="form-label">CVV</label>
                        <input 
                          type="password" 
                          className="form-input" 
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedMockMethod === 'upi' && (
                  <div className="upi-input-simulator fade-in-up">
                    <div className="form-group">
                      <label className="form-label">Virtual Payment Address (VPA)</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                      />
                    </div>
                    <div className="qr-box">
                      <div className="qr-placeholder">Scan QR Code</div>
                      <p>Use any UPI App to scan (Google Pay, PhonePe, Paytm)</p>
                    </div>
                  </div>
                )}

                {selectedMockMethod === 'netbanking' && (
                  <div className="bank-input-simulator fade-in-up">
                    <label className="form-label">Select Bank</label>
                    <select className="form-input select-control">
                      <option>State Bank of India (SBI)</option>
                      <option>HDFC Bank</option>
                      <option>ICICI Bank</option>
                      <option>Axis Bank</option>
                      <option>Punjab National Bank</option>
                    </select>
                  </div>
                )}
              </div>

              <button 
                onClick={handleMockPayment}
                disabled={paymentProcessing}
                className="btn btn-primary w-full mock-payment-submit"
              >
                {paymentProcessing ? (
                  <div className="simulating-spinner">
                    <span className="dot-spinner"></span> Simulating Payment...
                  </div>
                ) : `Simulate Payment Approval (₹${order.amount})`}
              </button>
            </div>
          ) : (
            /* Real Razorpay Trigger */
            <div className="payment-method-card glass-card">
              <h2>Secure Payment Portal</h2>
              <p className="rzp-desc">
                Click below to complete transaction via Razorpay. We support UPI, Credit Cards, Net Banking, and Wallet payments.
              </p>

              <button 
                onClick={handleRazorpayPayment}
                disabled={paymentProcessing}
                className="btn btn-primary w-full pay-now-btn"
              >
                {paymentProcessing ? 'Opening Payment Gateway...' : `Pay Now with Razorpay (₹${order.amount})`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
