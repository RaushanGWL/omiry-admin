import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminLayout } from './layouts/AdminLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Collections } from './pages/Collections';
import { Products } from './pages/Products';
import { Blogs } from './pages/Blogs';
import { Enquiries } from './pages/Enquiries';
import { Customers } from './pages/Customers';
import { HeroSection } from './pages/HeroSection';
import { Faqs } from './pages/Faqs';

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="collections" element={<Collections />} />
              <Route path="products" element={<Products />} />
              <Route path="blogs" element={<Blogs />} />
              <Route path="enquiries" element={<Enquiries />} />
              <Route path="customers" element={<Customers />} />
              <Route path="hero" element={<HeroSection />} />
              <Route path="faqs" element={<Faqs />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
