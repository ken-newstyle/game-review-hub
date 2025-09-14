import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Auth/Login';
import Feed from './pages/Feed/Feed';
import Profile from './pages/Profile/Profile';




export default function App() {
return (
<BrowserRouter>
<Routes>
<Route path="/login" element={<Login />} />
<Route path="/" element={<Feed />} />
<Route path="/:handle" element={<Profile />} />
</Routes>
</BrowserRouter>
);
}