import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import Index from './pages/Index';
import CustomerIntake from './pages/CustomerIntake';
import BrokerDashboard from './pages/BrokerDashboard';
import AdminPanel from './pages/AdminPanel';
import Dashboard from './components/Dashboard';
import NotificationBell from './components/NotificationBell';

function App() {
  return (
    <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="min-h-screen bg-gray-50">
          {/* Navigation Header */}
          <nav className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex items-center">
                  <h1 className="text-xl font-bold text-gray-900">
                    ACORD Intake Platform
                  </h1>
                </div>
                <div className="flex items-center space-x-4">
                  <NotificationBell />
                  {/* Add user menu here */}
                </div>
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/customer" element={<CustomerIntake />} />
              <Route path="/broker" element={<BrokerDashboard />} />
              <Route path="/admin" element={<AdminPanel />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
