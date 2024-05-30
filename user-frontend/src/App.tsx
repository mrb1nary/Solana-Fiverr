import Navbar from "./components/Navbar"
import Upload from "./components/Upload"
import { BrowserRouter } from "react-router-dom"

function App() {
  

  return (
    <BrowserRouter>
      <div className="w-full h-full bg-gray-800 absolute">
        <Navbar />
        <Upload />
      </div>
    </BrowserRouter>
  )
}

export default App
