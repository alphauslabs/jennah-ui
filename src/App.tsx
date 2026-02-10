import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import HomeScreen from './pages/HomeScreen'
import JobsPage from './pages/JobsPage'
import SubmitJobPage from './pages/SubmitJobPage'
import './App.css'

function App() {
  console.log('App component rendering')
  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <Link to="/" className="logo">Jennah</Link>
          <div className="nav-links">
            <Link to="/">Home</Link>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<HomeScreen />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
