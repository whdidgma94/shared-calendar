import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CreatePage from './pages/CreatePage.jsx';
import CalendarPage from './pages/CalendarPage.jsx';
import EmbedPage from './pages/EmbedPage.jsx';
import ErrorPage from './pages/ErrorPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 홈: 세션 생성 */}
        <Route path="/" element={<CreatePage />} />

        {/* 임베드 위젯 (읽기 전용) — CalendarPage 보다 앞에 선언 */}
        <Route path="/embed/:token" element={<EmbedPage />} />

        {/* 오류 안내 */}
        <Route path="/error" element={<ErrorPage />} />

        {/* 공유 캘린더 메인 */}
        <Route path="/:token" element={<CalendarPage />} />
      </Routes>
    </BrowserRouter>
  );
}
