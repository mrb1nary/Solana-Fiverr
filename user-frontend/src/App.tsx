import Navbar from "./components/Navbar"
import Upload from "./components/Upload"
import TaskWrapper from "./utils/TaskWrapper"
import { BrowserRouter, Routes, Route } from "react-router-dom"

function App() {
  

  return (
    <BrowserRouter>
      <div className="w-full h-full bg-gray-800 absolute">
        <Navbar />
        <Routes>
          <Route path="/" element={<Upload />} />
          <Route path="/task/:id" element={<TaskWrapper />} />
        </Routes>
        
      </div>
    </BrowserRouter>
  )
}

export default App
