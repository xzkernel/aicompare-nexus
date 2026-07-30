import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Navigate, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LocaleProvider } from "./contexts/LocaleProvider";
import ErrorBoundary from "./components/ErrorBoundary";
import { Toaster } from "./components/ui/toaster";
import { Landing } from "./pages/Landing";
import Index from "./pages/Index";
import { Shell } from "./app/Shell";
import NotFound from "./pages/NotFound";
import { RouteFallback } from "./components/RouteFallback";

const Playground = lazy(() => import("./pages/Playground"));
const Settings = lazy(() => import("./pages/Settings"));

function App() {
  return (
    <LocaleProvider>
    <ThemeProvider>
      <ErrorBoundary>
        <Router>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Navigate to="/playground" replace />} />
            <Route path="/auth/callback" element={<Navigate to="/playground" replace />} />

            <Route path="/app" element={<Index />} />

            <Route path="/dashboard" element={<Navigate to="/playground" replace />} />
            <Route
              path="/playground"
              element={
                <Shell>
                  <Suspense fallback={<RouteFallback />}>
                    <Playground />
                  </Suspense>
                </Shell>
              }
            />
            <Route
              path="/settings"
              element={
                <Shell>
                  <Suspense fallback={<RouteFallback />}>
                    <Settings />
                  </Suspense>
                </Shell>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </ErrorBoundary>
      <Toaster />
    </ThemeProvider>
    </LocaleProvider>
  );
}

export default App;
