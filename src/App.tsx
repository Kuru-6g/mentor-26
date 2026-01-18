import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Header } from "./components/Header";
import { LandingPage } from "./components/LandingPage";
import { MentorDirectory } from "./components/MentorDirectory";
import { MentorProfile } from "./components/MentorProfile";
import { SessionsPage } from "./components/SessionsPage";
import { MentorDashboard } from "./components/MentorDashboard";
import { AuthForm } from "./components/AuthForm";
import { ProfileSetup } from "./components/ProfileSetup";
import { Footer } from "./components/Footer";
import { AboutPage } from "./components/AboutPage";
import { ContactPage } from "./components/ContactPage";
import { CareersPage } from "./components/CareersPage";
import { HelpPage } from "./components/HelpPage";
import { CommunityPage } from "./components/CommunityPage";
import { PrivacyPage } from "./components/PrivacyPage";
import { TermsPage } from "./components/TermsPage";
import { BlogPage } from "./components/BlogPage";
import { CookiePage } from "./components/CookiePage";
import { BackToTop } from "./components/BackToTop";
import { Toaster, toast } from "sonner";
import { supabaseService, Session, SessionRequest, UserProfile } from "./services/supabaseService";
import { BrowserRouter } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';

// Re-export types for other components that might import them from App
export type { Session, SessionRequest, Speaker } from "./services/supabaseService";

function AppContent() {
  const { user, loading: authLoading, signOut, refreshUser } = useAuth();

  const [currentPage, setCurrentPage] = useState<string>("home");
  const [selectedMentorId, setSelectedMentorId] = useState<number | null>(null); // Mentor ID in DB is string (UUID), need to check MentorDirectory
  const [selectedMentorIdString, setSelectedMentorIdString] = useState<string | null>(null);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionRequests, setSessionRequests] = useState<SessionRequest[]>([]);

  // Auth state management
  const [authState, setAuthState] = useState<"none" | "auth" | "profile-setup" | "authenticated">("none");
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pendingUserEmail, setPendingUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<"mentor" | "mentee" | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Sync with AuthContext
  useEffect(() => {
    if (authLoading) return;

    if (user) {
      if (user.profile_completed) {
        setCurrentUser(user);
        setUserRole(user.role);
        setAuthState("authenticated");

        // If we were on auth page or profile setup, go to dashboard/home
        if (currentPage === 'auth' || currentPage === 'profile-setup') {
          if (user.role === 'mentor') setCurrentPage('dashboard');
          else setCurrentPage('mentors');
        }
      } else {
        setPendingUserId(user.id);
        setPendingUserEmail(user.email);
        setAuthState("profile-setup");
        setCurrentPage("profile-setup");
      }
    } else {
      setAuthState("none");
      setUserRole(null);
      setCurrentUser(null);
      setPendingUserId(null);
      setPendingUserEmail(null);
    }
  }, [user, authLoading, currentPage]);

  // Load Data
  useEffect(() => {
    loadSessions();
  }, []);

  // Reload requests when user changes
  useEffect(() => {
    if (currentUser) {
      loadSessionRequests();
    } else {
      setSessionRequests([]);
    }
  }, [currentUser]);

  const loadSessions = async () => {
    try {
      const data = await supabaseService.getSessions();
      setSessions(data);
    } catch (error) {
      console.error("Failed to load sessions", error);
      toast.error("Failed to load sessions");
    }
  };

  const loadSessionRequests = async () => {
    if (!currentUser) return;
    try {
      // If mentor, we want requests for my sessions (pass no args to let RLS handle it or implement specific logic)
      // If mentee, we want my requests (pass userId).

      // The service implementation:
      // getSessionRequests(userId?, mentorId?)
      // If userId passed -> eq('user_id', userId) -> My OUTGOING requests

      let data;
      if (currentUser.role === 'mentor') {
        // Fetch requests FOR my sessions.
        // Currently service doesn't have a direct "get incoming requests" arg that works perfectly without logic.
        // But let's assume getSessionRequests() without args returns all visible requests (via RLS).
        // RLS says: "Mentors can view requests for their sessions"
        data = await supabaseService.getSessionRequests();
      } else {
        // Fetch requests I made
        data = await supabaseService.getSessionRequests(currentUser.id);
      }
      setSessionRequests(data);
    } catch (error) {
      console.error("Failed to load requests", error);
    }
  };

  const handleAuthSuccess = (userId: string, userEmail: string) => {
    // This is called by AuthForm, but AuthContext listener should handle the state update.
    // We can just close the auth form / wait for the effect.
    // But to be responsive:
    // We'll let the effect handle it.
  };

  const handleProfileSetupComplete = async (profileData: any) => {
    // ProfileSetup component already calls supabaseService.updateProfile/createProfile
    // and then calls this callback.
    // We should refresh the user in AuthContext to get the updated profile.
    await refreshUser();

    // The effect will pick it up and update state.
    // But we can force redirect.
    if (profileData.role === "mentor") {
      setCurrentPage("dashboard");
    } else {
      setCurrentPage("mentors");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNavigate = (page: string) => {
    // Redirect to auth if trying to access sessions without login
    if (page === "sessions" && authState !== "authenticated") {
      setAuthState("auth");
      setCurrentPage("auth");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setCurrentPage(page);
    setSelectedMentorId(null);
    setSelectedMentorIdString(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectMentor = (mentorId: number | string) => {
    // Redirect to auth if trying to view mentor profile without login
    if (authState !== "authenticated") {
      // Store intent?
      setAuthState("auth");
      setCurrentPage("auth");
      return;
    }
    // MentorDirectory uses number IDs currently?
    // We need to check MentorDirectory.
    // Assuming we might eventually migrate it, but for now let's handle both.
    if (typeof mentorId === 'string') {
      setSelectedMentorIdString(mentorId);
    } else {
      setSelectedMentorId(mentorId);
    }
    setCurrentPage("mentor-profile");
  };

  const handleLogout = async () => {
    await signOut();
    setCurrentPage("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRoleChange = (
    role: "mentor" | "mentee" | null,
    user?: any
  ) => {
    // This was for dev switching. Now we rely on real auth.
    // If role is null, logout.
    if (role === null) {
      handleLogout();
    }
    // Else, do nothing as role is determined by profile.
  };

  const handleAddSession = async (
    newSession: Omit<
      Session,
      "id" | "attendees" | "availableSlots"
    >,
  ) => {
    try {
      if (!currentUser) return;

      const createdSession = await supabaseService.createSession({
        ...newSession,
        createdBy: currentUser.id
      });

      setSessions([createdSession, ...sessions]);
      toast.success("Session created successfully!", {
        description: "Your session is now visible to all users.",
      });
    } catch (error: any) {
      toast.error("Failed to create session", { description: error.message });
    }
  };

  const handleRequestToJoinSession = async (
    sessionId: string,
    formData?: {
      phone: string;
      occupation: string;
      experienceLevel: string;
      reasonToJoin: string;
      expectations: string;
    }
  ) => {
    if (!currentUser) {
      toast.error("Please log in");
      return;
    }

    try {
      const request = await supabaseService.createSessionRequest({
        sessionId,
        userId: currentUser.id,
        userName: currentUser.full_name,
        userEmail: currentUser.email,
        userAvatar: currentUser.avatar_url,
        ...formData
      });

      // Refresh requests
      await loadSessionRequests();

      toast.success("Request sent successfully!");
    } catch (error: any) {
      toast.error("Failed to send request", { description: error.message });
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await supabaseService.deleteSession(sessionId);
      setSessions(sessions.filter((s) => s.id !== sessionId));
      toast.success("Session deleted successfully");
    } catch (error: any) {
      toast.error("Failed to delete session");
    }
  };

  const handleRespondToRequest = async (
    requestId: string,
    action: "accept" | "reject"
  ) => {
    try {
      await supabaseService.updateSessionRequestStatus(requestId, action);

      // Update local state
      setSessionRequests(prev => prev.map(r =>
        r.id === requestId ? { ...r, status: action === "accept" ? "accepted" : "rejected" } : r
      ));

      // If accepted, we might want to reload sessions to update attendee count
      if (action === "accept") {
        loadSessions();
      }

      toast.success(`Request ${action}ed`);
    } catch (error: any) {
      toast.error("Failed to update request");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {currentPage !== "auth" && (
        <Header
          currentPage={currentPage}
          onNavigate={handleNavigate}
          userRole={userRole}
          onRoleChange={handleRoleChange}
        />
      )}

      <main className="flex-1">
        {currentPage === "home" && (
          <LandingPage
            onNavigate={handleNavigate}
            sessions={sessions}
          />
        )}
        {currentPage === "mentors" && (
          <MentorDirectory
            onSelectMentor={handleSelectMentor}
          />
        )}
        {currentPage === "mentor-profile" &&
          (selectedMentorId || selectedMentorIdString) && (
            <MentorProfile
              mentorId={selectedMentorId || selectedMentorIdString!} // Update MentorProfile to accept string/number
              onBack={() => handleNavigate("mentors")}
            />
          )}
        {currentPage === "sessions" && userRole && (
          <SessionsPage
            sessions={sessions}
            onRequestToJoin={handleRequestToJoinSession}
            userRole={userRole}
            currentUserId={currentUser?.id}
            sessionRequests={sessionRequests}
          />
        )}
        {currentPage === "auth" && (
          <AuthForm
            onSuccess={handleAuthSuccess}
            onClose={() => handleNavigate("home")}
          />
        )}
        {currentPage === "dashboard" &&
          userRole === "mentor" && (
            <MentorDashboard
              onAddSession={handleAddSession}
              onDeleteSession={handleDeleteSession}
              sessions={sessions}
              sessionRequests={sessionRequests}
              currentUserId={currentUser?.id}
              onRespondToRequest={handleRespondToRequest}
            />
          )}
        {currentPage === "profile-setup" && pendingUserId && pendingUserEmail && (
          <ProfileSetup
            userId={pendingUserId}
            userEmail={pendingUserEmail}
            onComplete={handleProfileSetupComplete}
          />
        )}
        {currentPage === "about" && <AboutPage />}
        {currentPage === "contact" && <ContactPage />}
        {currentPage === "careers" && <CareersPage onNavigate={handleNavigate} />}
        {currentPage === "help" && <HelpPage onNavigate={handleNavigate} />}
        {currentPage === "community" && <CommunityPage onNavigate={handleNavigate} />}
        {currentPage === "privacy" && <PrivacyPage />}
        {currentPage === "terms" && <TermsPage />}
        {currentPage === "blog" && <BlogPage />}
        {currentPage === "cookies" && <CookiePage />}
      </main>

      {currentPage !== "auth" && (
        <Footer onNavigate={handleNavigate} />
      )}

      <BackToTop />
      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
