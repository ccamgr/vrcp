import { HashRouter, Routes, Route } from "react-router-dom";
import { LogProvider } from "./context/LogContext";
import Layout from "./components/Layout";
import Monitor from "./pages/Monitor";
import Settings from "./pages/Settings";

function App() {
  return (
    <LogProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Monitor />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </HashRouter>
    </LogProvider>
  );
}

export default App;
