import { Link } from 'react-router-dom'
import '../styles/HomeScreen.css'

export default function HomeScreen() {
  return (
    <div className="landing-root">
    
      <main className="landing-main">
        <h1 className="landing-title">
          Ship code,<br />
          Not Infrastructure
        </h1>
        <p className="landing-subtitle">
          A unified interface to schedule, monitor, and manage<br />
          containerized jobs on GCP Batch
        </p>
        <Link to="/submit" className="landing-cta">
          Start deployment
        </Link>
      </main>
    </div>
  )
}