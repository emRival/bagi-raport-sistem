import ErrorBoundary from './components/ErrorBoundary.jsx'
import Router from './Router.jsx'
import './App.css'

function App() {
  return (
    <ErrorBoundary>
      <Router />
    </ErrorBoundary>
  )
}

export default App
