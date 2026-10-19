import { Navigate, Route, Routes, useLocation } from 'react-router';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { BookingDetailPage } from '@/pages/BookingDetailPage';
import { BookingsPage } from '@/pages/BookingsPage';
import { CategoriesPage } from '@/pages/CategoriesPage';
import { CouponsPage } from '@/pages/CouponsPage';
import { CustomerDetailPage } from '@/pages/CustomerDetailPage';
import { CustomersPage } from '@/pages/CustomersPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PayoutsPage } from '@/pages/PayoutsPage';
import { ReviewsPage } from '@/pages/ReviewsPage';
import { ServiceDetailPage } from '@/pages/ServiceDetailPage';
import { ServicesPage } from '@/pages/ServicesPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { TechnicianDetailPage } from '@/pages/TechnicianDetailPage';
import { TechniciansPage } from '@/pages/TechniciansPage';
import { TicketDetailPage } from '@/pages/TicketDetailPage';
import { TicketsPage } from '@/pages/TicketsPage';
import { VendorDetailPage } from '@/pages/VendorDetailPage';
import { VendorsPage } from '@/pages/VendorsPage';
import { ZonesPage } from '@/pages/ZonesPage';
import { useSession } from '@/providers/SessionProvider';

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
