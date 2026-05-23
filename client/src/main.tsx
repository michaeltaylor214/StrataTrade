import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';

import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';

// Shared auth pages
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ChangePassword from './pages/ChangePassword';
import RegisterTrade from './pages/RegisterTrade';
import RegisterStrata from './pages/RegisterStrata';

// Public token pages
import SubmitQuote from './pages/SubmitQuote';
import JobConfirmed from './pages/JobConfirmed';

// Admin portal
import AdminDashboard from './pages/admin/AdminDashboard';
import SchemesList from './pages/admin/SchemesList';
import SchemeDetail from './pages/admin/SchemeDetail';
import SchemeForm from './pages/admin/SchemeForm';
import CompaniesList from './pages/admin/CompaniesList';
import CompanyDetail from './pages/admin/CompanyDetail';
import JobsList from './pages/admin/JobsList';
import JobDetail from './pages/admin/JobDetail';
import JobForm from './pages/admin/JobForm';
import AuditsList from './pages/admin/AuditsList';
import AuditDetail from './pages/admin/AuditDetail';
import AuditReport from './pages/admin/AuditReport';
import MaintenanceList from './pages/admin/MaintenanceList';
import MaintenanceDetail from './pages/admin/MaintenanceDetail';
import QuotesList from './pages/admin/QuotesList';
import QuoteDetail from './pages/admin/QuoteDetail';
import TradesList from './pages/admin/TradesList';
import TradeDetail from './pages/admin/TradeDetail';
import InvoicesList from './pages/admin/InvoicesList';

// Strata Manager portal
import StrataDashboard from './pages/strata/StrataDashboard';
import StrataSchemesList from './pages/strata/StrataSchemesList';
import StrataSchemeDetail from './pages/strata/StrataSchemeDetail';
import StrataQuotes from './pages/strata/StrataQuotes';
import StrataMaintenance from './pages/strata/StrataMaintenance';
import StrataMaintenanceNew from './pages/strata/StrataMaintenanceNew';
import StrataAuditReport from './pages/strata/StrataAuditReport';

// Building Manager portal
import BuildingDashboard from './pages/building/BuildingDashboard';
import BuildingMyBuilding from './pages/building/BuildingMyBuilding';
import BuildingMaintenanceList from './pages/building/BuildingMaintenanceList';
import BuildingMaintenanceNew from './pages/building/BuildingMaintenanceNew';

// Trade portal
import TradeDashboard from './pages/trade/TradeDashboard';
import TradeJobsList from './pages/trade/TradeJobsList';
import TradeJobDetail from './pages/trade/TradeJobDetail';
import TradeQuotesList from './pages/trade/TradeQuotesList';
import TradeHistory from './pages/trade/TradeHistory';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login"              element={<Login />} />
          <Route path="/forgot-password"    element={<ForgotPassword />} />
          <Route path="/reset-password"     element={<ResetPassword />} />
          <Route path="/change-password"    element={<ChangePassword />} />
          <Route path="/register/trade"     element={<RegisterTrade />} />
          <Route path="/register/strata"    element={<RegisterStrata />} />
          <Route path="/submit-quote/:token" element={<SubmitQuote />} />
          <Route path="/job-confirmed"      element={<JobConfirmed />} />

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/companies" element={<ProtectedRoute allowedRoles={['admin']}><CompaniesList /></ProtectedRoute>} />
          <Route path="/admin/companies/:id" element={<ProtectedRoute allowedRoles={['admin']}><CompanyDetail /></ProtectedRoute>} />
          <Route path="/admin/schemes" element={<ProtectedRoute allowedRoles={['admin']}><SchemesList /></ProtectedRoute>} />
          <Route path="/admin/schemes/new" element={<ProtectedRoute allowedRoles={['admin']}><SchemeForm /></ProtectedRoute>} />
          <Route path="/admin/schemes/:id" element={<ProtectedRoute allowedRoles={['admin']}><SchemeDetail /></ProtectedRoute>} />
          <Route path="/admin/schemes/:id/edit" element={<ProtectedRoute allowedRoles={['admin']}><SchemeForm /></ProtectedRoute>} />
          <Route path="/admin/jobs" element={<ProtectedRoute allowedRoles={['admin']}><JobsList /></ProtectedRoute>} />
          <Route path="/admin/jobs/new" element={<ProtectedRoute allowedRoles={['admin']}><JobForm /></ProtectedRoute>} />
          <Route path="/admin/jobs/:id" element={<ProtectedRoute allowedRoles={['admin']}><JobDetail /></ProtectedRoute>} />
          <Route path="/admin/audits" element={<ProtectedRoute allowedRoles={['admin']}><AuditsList /></ProtectedRoute>} />
          <Route path="/admin/audits/:id" element={<ProtectedRoute allowedRoles={['admin']}><AuditDetail /></ProtectedRoute>} />
          <Route path="/admin/audits/:id/report" element={<ProtectedRoute allowedRoles={['admin']}><AuditReport /></ProtectedRoute>} />
          <Route path="/admin/maintenance" element={<ProtectedRoute allowedRoles={['admin']}><MaintenanceList /></ProtectedRoute>} />
          <Route path="/admin/maintenance/:id" element={<ProtectedRoute allowedRoles={['admin']}><MaintenanceDetail /></ProtectedRoute>} />
          <Route path="/admin/quotes" element={<ProtectedRoute allowedRoles={['admin']}><QuotesList /></ProtectedRoute>} />
          <Route path="/admin/quotes/:id" element={<ProtectedRoute allowedRoles={['admin']}><QuoteDetail /></ProtectedRoute>} />
          <Route path="/admin/trades" element={<ProtectedRoute allowedRoles={['admin']}><TradesList /></ProtectedRoute>} />
          <Route path="/admin/trades/:id" element={<ProtectedRoute allowedRoles={['admin']}><TradeDetail /></ProtectedRoute>} />
          <Route path="/admin/invoices" element={<ProtectedRoute allowedRoles={['admin']}><InvoicesList /></ProtectedRoute>} />

          {/* Strata Manager */}
          <Route path="/strata" element={<ProtectedRoute allowedRoles={['strata_manager']}><StrataDashboard /></ProtectedRoute>} />
          <Route path="/strata/schemes" element={<ProtectedRoute allowedRoles={['strata_manager']}><StrataSchemesList /></ProtectedRoute>} />
          <Route path="/strata/schemes/:id" element={<ProtectedRoute allowedRoles={['strata_manager']}><StrataSchemeDetail /></ProtectedRoute>} />
          <Route path="/strata/schemes/:id/audit-report" element={<ProtectedRoute allowedRoles={['strata_manager']}><StrataAuditReport /></ProtectedRoute>} />
          <Route path="/strata/quotes" element={<ProtectedRoute allowedRoles={['strata_manager']}><StrataQuotes /></ProtectedRoute>} />
          <Route path="/strata/maintenance" element={<ProtectedRoute allowedRoles={['strata_manager']}><StrataMaintenance /></ProtectedRoute>} />
          <Route path="/strata/maintenance/new" element={<ProtectedRoute allowedRoles={['strata_manager']}><StrataMaintenanceNew /></ProtectedRoute>} />

          {/* Building Manager */}
          <Route path="/building" element={<ProtectedRoute allowedRoles={['building_manager']}><BuildingDashboard /></ProtectedRoute>} />
          <Route path="/building/my-building" element={<ProtectedRoute allowedRoles={['building_manager']}><BuildingMyBuilding /></ProtectedRoute>} />
          <Route path="/building/maintenance" element={<ProtectedRoute allowedRoles={['building_manager']}><BuildingMaintenanceList /></ProtectedRoute>} />
          <Route path="/building/maintenance/new" element={<ProtectedRoute allowedRoles={['building_manager']}><BuildingMaintenanceNew /></ProtectedRoute>} />

          {/* Trade */}
          <Route path="/trade" element={<ProtectedRoute allowedRoles={['trade']}><TradeDashboard /></ProtectedRoute>} />
          <Route path="/trade/jobs" element={<ProtectedRoute allowedRoles={['trade']}><TradeJobsList /></ProtectedRoute>} />
          <Route path="/trade/jobs/:id" element={<ProtectedRoute allowedRoles={['trade']}><TradeJobDetail /></ProtectedRoute>} />
          <Route path="/trade/quotes" element={<ProtectedRoute allowedRoles={['trade']}><TradeQuotesList /></ProtectedRoute>} />
          <Route path="/trade/history" element={<ProtectedRoute allowedRoles={['trade']}><TradeHistory /></ProtectedRoute>} />

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
