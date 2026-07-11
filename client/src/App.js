import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext.js';

// Component imports
import Navbar from './components/Navbar/Navbar.js';
import Footer from './components/Footer/Footer.js';
import FloatingButtons from './components/FloatingButtons/FloatingButtons.js';

// Page imports
import Home from './pages/Home/Home.js';
import Login from './pages/Auth/Login.js';
import Register from './pages/Auth/Register.js';
import VerifyEmail from './pages/Auth/VerifyEmail.js';
import ForgotPassword from './pages/Auth/ForgotPassword.js';
import Categories from './pages/Categories/Categories.js';
import TemplatesListing from './pages/TemplatesListing/TemplatesListing.js';
import TemplateDetail from './pages/TemplateDetail/TemplateDetail.js';
import Checkout from './pages/Checkout/Checkout.js';
import PaymentSuccess from './pages/PaymentSuccess/PaymentSuccess.js';
import UserDashboard from './pages/UserDashboard/UserDashboard.js';
import Services from './pages/Services/Services.js';
import Contact from './pages/Contact/Contact.js';
import About from './pages/About/About.js';
import AdminDashboard from './pages/AdminDashboard/AdminDashboard.js';
import Training from './pages/Training/Training.js';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div className="loader-container"><div className="loader"></div></div>;
  return user ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div className="loader-container"><div className="loader"></div></div>;
  return user && user.role === 'admin' ? children : <Navigate to="/" replace />;
};

import ScrollToTop from './components/ScrollToTop/ScrollToTop.js';

function AppContent() {
  const { loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="loader-container">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <Router>
      <ScrollToTop />
      <div className="app-container">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/templates" element={<TemplatesListing />} />
            <Route path="/templates/:id" element={<TemplateDetail />} />
            <Route path="/services" element={<Services />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/about" element={<About />} />
            <Route path="/training" element={<Training />} />
            
            {/* Protected Routes */}
            <Route 
              path="/checkout/:orderId" 
              element={
                <ProtectedRoute>
                  <Checkout />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/payment-success" 
              element={
                <ProtectedRoute>
                  <PaymentSuccess />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <UserDashboard />
                </ProtectedRoute>
              } 
            />

            {/* Admin Routes */}
            <Route 
              path="/admin/*" 
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              } 
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
        <FloatingButtons />
      </div>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
