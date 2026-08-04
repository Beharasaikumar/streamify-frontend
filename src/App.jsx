import { Navigate, Route, Routes, useParams } from "react-router";

const ChatRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/friends?friendId=${id}`} replace />;
};

import HomePage from "./pages/HomePage.jsx";
import SignUpPage from "./pages/SignUpPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import CallPage from "./pages/CallPage.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import OnboardingPage from "./pages/OnboardingPage.jsx";

import { Toaster } from "react-hot-toast";

import PageLoader from "./components/PageLoader.jsx";
import useAuthUser from "./hooks/useAuthUser.js";
import Layout from "./components/Layout.jsx";
import { useThemeStore } from "./store/useThemeStore.js";
import RoomsPage from "./pages/RoomsPage.jsx";
import GroupChatPage from "./pages/GroupChatPage.jsx";
import ChallengePage from "./pages/ChallengePage.jsx";
import LearnersPage from "./pages/LearnersPage.jsx";
import FriendsPage from "./pages/FriendsPage.jsx";
import VideoCallPage from "./pages/VideoCallPage.jsx";          // NEW
import IncomingCallModal from "./components/IncomingCallModal.jsx"; // NEW
import { SocketProvider } from "./context/SocketContext.jsx";

const App = () => {
  const { isLoading, authUser } = useAuthUser();
  const { theme } = useThemeStore();

  const isAuthenticated = Boolean(authUser);
  const isOnboarded = authUser?.isOnboarded;

  if (isLoading) return <PageLoader />;

  return (
    <SocketProvider>
      <div className="min-h-screen" data-theme={theme}>
        <Routes>
          <Route
            path="/"
            element={
              isAuthenticated && isOnboarded ? (
                <Layout showSidebar={true}><HomePage /></Layout>
              ) : (
                <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
              )
            }
          />
          <Route
            path="/signup"
            element={!isAuthenticated ? <SignUpPage /> : <Navigate to={isOnboarded ? "/" : "/onboarding"} />}
          />
          <Route
            path="/login"
            element={!isAuthenticated ? <LoginPage /> : <Navigate to={isOnboarded ? "/" : "/onboarding"} />}
          />
          <Route
            path="/notifications"
            element={
              isAuthenticated && isOnboarded ? (
                <Layout showSidebar={true}><NotificationsPage /></Layout>
              ) : (
                <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
              )
            }
          />

          {/* Legacy Stream-based call — kept for backward compat */}
          <Route
            path="/call/:id"
            element={
              isAuthenticated && isOnboarded ? <CallPage /> : <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
            }
          />

          {/* NEW: WebRTC video call page */}
          <Route
            path="/video-call/:callId"
            element={
              isAuthenticated && isOnboarded ? <VideoCallPage /> : <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
            }
          />

          <Route
            path="/chat/:id"
            element={
              isAuthenticated && isOnboarded ? (
                <ChatRedirect />
              ) : (
                <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
              )
            }
          />
          <Route
            path="/onboarding"
            element={
              isAuthenticated ? (!isOnboarded ? <OnboardingPage /> : <Navigate to="/" />) : <Navigate to="/login" />
            }
          />
          <Route
            path="/rooms"
            element={
              isAuthenticated && isOnboarded ? (
                <Layout showSidebar={true}><RoomsPage /></Layout>
              ) : (
                <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
              )
            }
          />
          <Route
            path="/rooms/:roomId"
            element={
              isAuthenticated && isOnboarded ? (
                <Layout showSidebar={true}><GroupChatPage /></Layout>
              ) : (
                <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
              )
            }
          />
          <Route
            path="/challenges"
            element={
              isAuthenticated && isOnboarded ? (
                <Layout showSidebar={true}><ChallengePage /></Layout>
              ) : (
                <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
              )
            }
          />
          <Route
            path="/learners"
            element={
              isAuthenticated && isOnboarded ? (
                <Layout showSidebar={true}><LearnersPage /></Layout>
              ) : (
                <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
              )
            }
          />
          <Route
            path="/friends"
            element={
              isAuthenticated && isOnboarded ? (
                <Layout showSidebar={true}><FriendsPage /></Layout>
              ) : (
                <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
              )
            }
          />
          <Route
            path="/profile"
            element={
              isAuthenticated && isOnboarded ? (
                <Layout showSidebar={true}><OnboardingPage isEditMode={true} /></Layout>
              ) : (
                <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
              )
            }
          />
        </Routes>

        {/* Global incoming call overlay — shown regardless of current route */}
        {isAuthenticated && isOnboarded && <IncomingCallModal />}

        <Toaster />
      </div>
    </SocketProvider>
  );
};

export default App;