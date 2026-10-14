import { Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import ComingSoon from './pages/ComingSoon'
import AttractionsList from './pages/AttractionsList'

const todo = (title: string, source?: string) => <ComingSoon title={title} source={source} />

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/attractions" element={<AttractionsList />} />
        <Route path="/attractions/:id" element={todo('Attraction', 'attractions.html')} />
        <Route path="/hotels" element={todo('Hotels', 'hotels-list.html')} />
        <Route path="/hotels/:id" element={todo('Hotel', 'hotels.html')} />
        <Route path="/restaurants" element={todo('Restaurants', 'restaurants-list.html')} />
        <Route path="/restaurants/:id" element={todo('Restaurant', 'restaurants.html')} />
        <Route path="/travel-agencies" element={todo('Travel Agencies', 'travel-agencies.html')} />
        <Route path="/travel-agencies/:id" element={todo('Travel Agency', 'travel-agency.html')} />
        <Route path="/guides" element={todo('Local Guides', 'guides-list.html')} />
        <Route path="/routes" element={todo('Route Planner', 'location.html')} />
        <Route path="/emergency" element={todo('Emergency Contacts', 'emergency.html')} />
        <Route path="/partner" element={todo('Partner Portal', 'partner-portal.html')} />
        <Route path="/cities/:city" element={todo('City', 'not in the original site')} />
        <Route path="/regions" element={todo('Regions', 'not in the original site')} />
        <Route path="/tips" element={todo('Tips', 'tips.html')} />
        <Route path="/about" element={todo('About Us', 'not in the original site')} />
        <Route path="/privacy" element={todo('Privacy Policy', 'not in the original site')} />
        <Route path="/terms" element={todo('Terms of Service', 'not in the original site')} />
        <Route path="*" element={todo('Page not found')} />
      </Routes>
    </Suspense>
  )
}
