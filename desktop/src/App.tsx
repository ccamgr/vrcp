import { HashRouter, Routes, Route } from "react-router-dom";
import { LogProvider } from "./context/LogContext";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/Layout";
import Monitor from "./pages/Monitor";
import Settings from "./pages/Settings";
import Analytics from "./pages/Analytics";
import Top from "./pages/Top";

function App() {
  return (
    <LogProvider>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Top />} />
              <Route path="monitor" element={<Monitor />} />
              <Route path="history" element={<Analytics />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </HashRouter>
      </AuthProvider>
    </LogProvider>
  );
}

export default App;
