import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LocaleProvider } from "./contexts/LocaleProvider";
import { AuthProvider } from "./contexts/AuthContext";
import { CloudSyncProvider } from "./contexts/CloudSyncContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { Toaster } from "./components/ui/toaster";
import { Landing } from "./pages/Landing";
import Index from "./pages/Index";
import { Shell } from "./app/Shell";
import NotFound from "./pages/NotFound";
import { RouteFallback } from "./components/RouteFallback";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Playground = lazy(() => import("./pages/Playground"));
const Settings = lazy(() => import("./pages/Settings"));
const Auth = lazy(() => import("./pages/Auth"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));

function App() {
  return (
    <LocaleProvider>
    <ThemeProvider>
      <AuthProvider>
      <CloudSyncProvider>
      <ErrorBoundary>
        <Router>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route
              path="/auth"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <Auth />
                </Suspense>
              }
            />

            <Route
              path="/auth/callback"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <AuthCallback />
                </Suspense>
              }
            />

            <Route path="/app" element={<Index />} />

            <Route
              path="/dashboard"
              element={
                <Shell>
                  <Suspense fallback={<RouteFallback />}>
                    <Dashboard />
                  </Suspense>
                </Shell>
              }
            />
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
      </CloudSyncProvider>
      </AuthProvider>
      <Toaster />
    </ThemeProvider>
    </LocaleProvider>
  );
}

export default App;
