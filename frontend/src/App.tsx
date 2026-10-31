import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Login } from './pages/auth/Login.tsx';
import { Signup } from './pages/auth/Signup.tsx';
import { ForgotPassword } from './pages/auth/ForgotPassword.tsx';
import { ResetPassword } from './pages/auth/ResetPassword.tsx';
import { ProtectedRoute } from './components/layout/ProtectedRoute.tsx';
import { AppLayout } from './components/layout/AppLayout.tsx';
import { DashboardPage } from './pages/dashboard/DashboardPage.tsx';
import { ProductsPage } from './pages/products/ProductsPage.tsx';
import { PlansPage } from './pages/plans/PlansPage.tsx';
import { TaxesDiscountsPage } from './pages/taxes-discounts/TaxesDiscountsPage.tsx';
import { TemplatesPage } from './pages/templates/TemplatesPage.tsx';
import { SubscriptionsPage } from './pages/subscriptions/SubscriptionsPage.tsx';
import { InvoicesPage } from './pages/invoices/InvoicesPage.tsx';
import { PaymentsPage } from './pages/payments/PaymentsPage.tsx';
import { CustomerPortalPage } from './pages/portal/CustomerPortalPage.tsx';

// Root redirect based on role
const RootRedirect: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'CUSTOMER') {
    return <Navigate to="/portal" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Root Redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Admin & Staff Internal Workspace */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'STAFF']} />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/subscriptions" element={<SubscriptionsPage />} />
              <Route path="/templates" element={<TemplatesPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/plans" element={<PlansPage />} />
              <Route path="/taxes-discounts" element={<TaxesDiscountsPage />} />
              {/* Placeholders for subsequent phases */}
              <Route path="/invoices" element={<InvoicesPage />} />
              <Route path="/payments" element={<PaymentsPage />} />
            </Route>
          </Route>

          {/* Customer Portal Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['CUSTOMER']} />}>
            <Route path="/portal" element={<CustomerPortalPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
