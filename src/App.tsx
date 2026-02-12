import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomeScreen from './pages/HomeScreen'
import ProjectsOverview from './pages/ProjectsOverview'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

function App() {
  console.log('App component rendering')
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-[#f5f5f5]">
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route path="/overview" element={<ProjectsOverview />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
