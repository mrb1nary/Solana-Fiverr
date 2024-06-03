import Navbar from "./components/Navbar"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import NextTask from "./components/NextTask"

function App() {
  

  return (
    <BrowserRouter>
      <div className="w-full h-full bg-gray-800 absolute">
        <Navbar />
        <Routes>
          <Route path="/" element={<NextTask />} />
        </Routes>
        
      </div>
    </BrowserRouter>
  )
}

export default App
