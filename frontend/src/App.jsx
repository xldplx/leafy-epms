import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
// import Dashboard from './pages/Dashboard'; // Likely not needed if DashboardLayout handles it
import DashboardLayout from './pages/dashboard/DashboardLayout';
import About from './pages/About';
import Contact from './pages/Contact';
import Layout from './layout/Layout';

function App() {
  return (
    <>
      <Routes>
        {/* public routes */}
        <Route path="/" element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
        </Route>

        {/* 👇 KEY CHANGE HERE:
            1. Use "/*" to match /dashboard AND /dashboard/anything
            2. Remove all nested child routes (Main, Manpower, etc.)
            3. DashboardLayout now handles the sub-routing internally.
        */}
        <Route path="/dashboard/*" element={<DashboardLayout />} />

      </Routes>
    </>
  );
}

export default App;