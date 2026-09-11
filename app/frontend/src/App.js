import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NameNest from "@/pages/NameNest";
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<NameNest />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" />
    </div>
  );
}
export default App;