import { lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { LoginPage } from '@/pages/LoginPage';
import { useSession } from '@/providers/SessionProvider';

// Each screen is its own chunk, loaded when first opened.
const BookingDetailPage = lazy(() =>
  import('@/pages/BookingDetailPage').then((m) => ({ default: m.BookingDetailPage })),
);
const BookingsPage = lazy(() =>
  import('@/pages/BookingsPage').then((m) => ({ default: m.BookingsPage })),
);
const CategoriesPage = lazy(() =>
  import('@/pages/CategoriesPage').then((m) => ({ default: m.CategoriesPage })),
);
const CouponsPage = lazy(() =>
  import('@/pages/CouponsPage').then((m) => ({ default: m.CouponsPage })),
);
const CustomerDetailPage = lazy(() =>
  import('@/pages/CustomerDetailPage').then((m) => ({ default: m.CustomerDetailPage })),
);
const CustomersPage = lazy(() =>
  import('@/pages/CustomersPage').then((m) => ({ default: m.CustomersPage })),
);
const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);
const PayoutsPage = lazy(() =>
  import('@/pages/PayoutsPage').then((m) => ({ default: m.PayoutsPage })),
);
const ReviewsPage = lazy(() =>
  import('@/pages/ReviewsPage').then((m) => ({ default: m.ReviewsPage })),
);
const ServiceDetailPage = lazy(() =>
  import('@/pages/ServiceDetailPage').then((m) => ({ default: m.ServiceDetailPage })),
);
const ServicesPage = lazy(() =>
  import('@/pages/ServicesPage').then((m) => ({ default: m.ServicesPage })),
);
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const TechnicianDetailPage = lazy(() =>
  import('@/pages/TechnicianDetailPage').then((m) => ({ default: m.TechnicianDetailPage })),
);
const TechniciansPage = lazy(() =>
  import('@/pages/TechniciansPage').then((m) => ({ default: m.TechniciansPage })),
);
const TicketDetailPage = lazy(() =>
  import('@/pages/TicketDetailPage').then((m) => ({ default: m.TicketDetailPage })),
);
const TicketsPage = lazy(() =>
  import('@/pages/TicketsPage').then((m) => ({ default: m.TicketsPage })),
);
const VendorDetailPage = lazy(() =>
  import('@/pages/VendorDetailPage').then((m) => ({ default: m.VendorDetailPage })),
);
const VendorsPage = lazy(() =>
  import('@/pages/VendorsPage').then((m) => ({ default: m.VendorsPage })),
);
const ZonesPage = lazy(() => import('@/pages/ZonesPage').then((m) => ({ default: m.ZonesPage })));

function RequireAdmin() {
  const { session, status } = useSession();
  const location = useLocation();
  if (status === 'restoring') return null;
  if (!session)
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <AdminLayout />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAdmin />}>
        <Route index element={<DashboardPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="bookings/:id" element={<BookingDetailPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/:id" element={<CustomerDetailPage />} />
        <Route path="technicians" element={<TechniciansPage />} />
        <Route path="technicians/:id" element={<TechnicianDetailPage />} />
        <Route path="vendors" element={<VendorsPage />} />
        <Route path="vendors/:id" element={<VendorDetailPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="services/:id" element={<ServiceDetailPage />} />
        <Route path="zones" element={<ZonesPage />} />
        <Route path="coupons" element={<CouponsPage />} />
        <Route path="reviews" element={<ReviewsPage />} />
        <Route path="payouts" element={<PayoutsPage />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="tickets/:id" element={<TicketDetailPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
