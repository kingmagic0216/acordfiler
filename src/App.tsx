import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import CustomerIntake from './pages/CustomerIntake';
import BrokerDashboard from './pages/BrokerDashboard';
import AdminPanel from './pages/AdminPanel';

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/customer" element={<CustomerIntake />} />
        <Route path="/broker" element={<BrokerDashboard />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </Router>
  );
}

export default App;
