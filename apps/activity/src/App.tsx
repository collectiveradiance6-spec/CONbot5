import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { QueuePage } from './pages/QueuePage'
import { SettingsPage } from './pages/SettingsPage'
import { StudioPage } from './pages/StudioPage'
import { VisualsPage } from './pages/VisualsPage'
import { LibraryPage } from './pages/LibraryPage'
import { LivePage } from './pages/LivePage'
import { MediaHubPage } from './pages/MediaHubPage'
import {
  AdminConsolePage,
  EqualizerPage,
  HistoryPage,
  LibraryManagerPage,
  LyricsPage,
  NowPlayingPage,
  PlaylistsPage,
  ProfilePage,
  SearchPage,
  SystemCorePage,
} from './pages/ReleasePages'

// Lazy-load heavy pages
const CinemaScreenPage = lazy(() => import('./modules/cinema/CinemaScreenPage').then(m => ({ default: m.CinemaScreenPage })))
const VibeRoomPortalsPage = lazy(() => import('./modules/vibeRooms/VibeRoomPortalsPage').then(m => ({ default: m.VibeRoomPortalsPage })))

function Fallback() {
  return (
    <div className="flex h-64 items-center justify-center text-[color:var(--conbot-muted)] text-sm font-black">
      Loading…
    </div>
  )
}

function App() {
  return (
    <AppShell>
      {(context) => (
        <Routes>
          <Route path="/"               element={<DashboardPage context={context} />} />
          <Route path="/now"            element={<NowPlayingPage />} />
          <Route path="/library"        element={<LibraryPage />} />
          <Route path="/media"          element={<MediaHubPage />} />
          <Route path="/search"         element={<SearchPage />} />
          <Route path="/queue"          element={<QueuePage />} />
          <Route path="/live"           element={<LivePage context={context} />} />
          <Route path="/studio"         element={<StudioPage />} />
          <Route path="/visuals"        element={<VisualsPage />} />
          <Route path="/rooms"          element={<Suspense fallback={<Fallback />}><VibeRoomPortalsPage /></Suspense>} />
          <Route path="/playlists"      element={<PlaylistsPage />} />
          <Route path="/cinema"         element={<Suspense fallback={<Fallback />}><CinemaScreenPage /></Suspense>} />
          <Route path="/watch-party"    element={<Suspense fallback={<Fallback />}><CinemaScreenPage /></Suspense>} />
          <Route path="/equalizer"      element={<EqualizerPage />} />
          <Route path="/lyrics"         element={<LyricsPage />} />
          <Route path="/profile"        element={<ProfilePage />} />
          <Route path="/history"        element={<HistoryPage />} />
          <Route path="/ledger"         element={<HistoryPage />} />
          <Route path="/library-manager" element={<LibraryManagerPage />} />
          <Route path="/system"         element={<SystemCorePage />} />
          <Route path="/settings"       element={<SettingsPage activityContext={context.activityContext} />} />
          <Route path="/admin"          element={<AdminConsolePage />} />
        </Routes>
      )}
    </AppShell>
  )
}

export default App
