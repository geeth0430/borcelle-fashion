import App from './App.jsx'
import AdminPanel from './admin/AdminPanel.jsx'

export default function Root() {
  const route = window.location.pathname.replace(/\/+$/, '')
  const Page = route === '/admin' ? AdminPanel : App
  return <Page />
}