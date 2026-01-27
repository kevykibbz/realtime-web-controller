import React, { useEffect } from 'react';
import {
  HashRouter as Router,   // ✅ CHANGE HERE
  Route,
  Routes,
  useLocation,
  useNavigate
} from 'react-router-dom';

import { SocketProvider } from './contexts/SocketContext.jsx';
import Home from './components/Home.jsx';
import HostView from './components/HostView.jsx';
import ControllerView from './components/ControllerView.jsx';
import NotFound from './components/NotFound.jsx';
import './App.css';

/**
 * Auto-redirect:
 * If someone opens the site with ?lobbyId=XXXX
 * → automatically send them to the controller view
 */
function AutoControllerRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const lobbyId = params.get('lobbyId');

    // HashRouter paths still look like "/"
    if (lobbyId && location.pathname === '/') {
      navigate(`/controller?lobbyId=${lobbyId}`, { replace: true });
    }
  }, [location, navigate]);

  return null;
}

function App() {
  return (
    <SocketProvider>
      <Router>
        <AutoControllerRedirect />

        <div className="App">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/host" element={<HostView />} />
            <Route path="/controller" element={<ControllerView />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </Router>
    </SocketProvider>
  );
}

export default App;
