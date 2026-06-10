import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Landing from './pages/Landing'
import Hub from './pages/Hub'
import BotDetail from './pages/BotDetail'
import { useRoute } from './lib/router'

function App() {
  const route = useRoute()

  // Detail page is a standalone app shell (its own sidebar — no global nav/footer).
  if (route.name === 'detail') {
    return (
      <div className="selection:bg-brand-green selection:text-black">
        <BotDetail id={route.id} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-base selection:bg-brand-green selection:text-black">
      <Navbar />
      <main>{route.name === 'hub' ? <Hub /> : <Landing />}</main>
      <Footer />
    </div>
  )
}

export default App
