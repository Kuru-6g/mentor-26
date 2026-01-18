import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Plus, Edit, Trash2, Calendar, Award, Video, Users2, MapPin, Monitor, UserPlus, X, Inbox, Users, Loader2 } from "lucide-react";
import { SessionRequestsManager } from "./SessionRequestsManager";
import { SessionParticipants } from "./SessionParticipants";
import { supabaseService, Session, SessionRequest, Speaker, Achievement } from "../services/supabaseService";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

interface VisitingExperience {
  id: number;
  menteeName: string;
  menteeAvatar: string;
  date: string;
  description: string;
  topics: string[];
}

interface MentorDashboardProps {
  onAddSession: (session: Omit<Session, "id" | "attendees" | "availableSlots">) => void;
  onDeleteSession: (sessionId: string) => void;
  sessions: Session[];
  sessionRequests: SessionRequest[];
  currentUserId?: string;
  onRespondToRequest: (requestId: string, action: "accept" | "reject") => void;
}

export function MentorDashboard({
  onAddSession,
  onDeleteSession,
  sessions,
  sessionRequests,
  currentUserId,
  onRespondToRequest
}: MentorDashboardProps) {
  const { user, updateProfile } = useAuth();

  // Profile state
  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || "",
    current_role: user?.current_role || "",
    company: user?.company || "",
    bio: user?.bio || "",
    expertise: user?.expertise?.join(", ") || "",
    years_experience: user?.years_experience || 0,
    linkedin_url: user?.linkedin_url || "",
    github_url: user?.github_url || "",
    website_url: user?.website_url || ""
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Achievements state
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(false);

  useEffect(() => {
    if (user?.id) {
        loadAchievements();
        // Sync profile form if user updates
        setProfileForm({
            full_name: user.full_name || "",
            current_role: user.current_role || "",
            company: user.company || "",
            bio: user.bio || "",
            expertise: user.expertise?.join(", ") || "",
            years_experience: user.years_experience || 0,
            linkedin_url: user.linkedin_url || "",
            github_url: user.github_url || "",
            website_url: user.website_url || ""
        });
    }
  }, [user]);

  const loadAchievements = async () => {
    if (!user?.id) return;
    setIsLoadingAchievements(true);
    try {
        const data = await supabaseService.getAchievements(user.id);
        setAchievements(data);
    } catch (error) {
        console.error("Failed to load achievements", error);
    } finally {
        setIsLoadingAchievements(false);
    }
  };

  // Filter sessions to show only those created by this mentor
  // Assuming sessions prop is already filtered or we filter by createdBy
  const mentorSessions = sessions.filter(s => s.createdBy === user?.id);

  const [visitingExperiences, setVisitingExperiences] = useState<VisitingExperience[]>([
    {
      id: 1,
      menteeName: "Alex Martinez",
      menteeAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop",
      date: "September 2024",
      description: "Guided Alex through a career transition from marketing to software development. Covered fundamentals of web development and helped prepare for technical interviews.",
      topics: ["Career Change", "Web Development", "Interview Prep"]
    }
  ]);

  const [newAchievement, setNewAchievement] = useState({
    title: "",
    description: "",
    date: "",
    type: "Certification"
  });

  const [newSession, setNewSession] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    duration: "",
    topics: "",
    sessionType: "online" as "online" | "physical",
    location: "",
    maxSlots: "50",
    companyName: ""
  });

  const [sessionSpeakers, setSessionSpeakers] = useState<Speaker[]>([]);
  const [newSpeaker, setNewSpeaker] = useState({
    name: "",
    title: "",
    avatar: ""
  });

  const [newExperience, setNewExperience] = useState({
    menteeName: "",
    date: "",
    description: "",
    topics: ""
  });

  const [isAddAchievementOpen, setIsAddAchievementOpen] = useState(false);
  const [isAddSessionOpen, setIsAddSessionOpen] = useState(false);
  const [isAddExperienceOpen, setIsAddExperienceOpen] = useState(false);

  const handleProfileUpdate = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    try {
        await updateProfile({
            ...profileForm,
            expertise: profileForm.expertise.split(",").map(s => s.trim()).filter(Boolean)
        });
        // Success handled in context
    } catch (error) {
        // Error handled in context
    } finally {
        setIsSavingProfile(false);
    }
  };

  const handleAddAchievement = async () => {
    if (newAchievement.title && newAchievement.description && user) {
      try {
          const created = await supabaseService.createAchievement({
              user_id: user.id,
              title: newAchievement.title,
              description: newAchievement.description,
              date: newAchievement.date,
              type: newAchievement.type
          });

          if (created) {
              setAchievements([...achievements, created]);
              setNewAchievement({ title: "", description: "", date: "", type: "Certification" });
              setIsAddAchievementOpen(false);
              toast.success("Achievement added successfully");
          }
      } catch (error) {
          toast.error("Failed to add achievement");
      }
    }
  };

  const handleAddSessionClick = () => {
    if (newSession.title && newSession.description && sessionSpeakers.length > 0) {
      onAddSession({
        title: newSession.title,
        description: newSession.description,
        date: newSession.date,
        time: newSession.time,
        duration: newSession.duration,
        topics: newSession.topics.split(",").map(t => t.trim()),
        speakers: sessionSpeakers,
        sessionType: newSession.sessionType,
        location: newSession.sessionType === "physical" ? newSession.location : undefined,
        maxSlots: parseInt(newSession.maxSlots) || 50,
        companyName: newSession.companyName || undefined
      });
      setNewSession({
        title: "",
        description: "",
        date: "",
        time: "",
        duration: "",
        topics: "",
        sessionType: "online",
        location: "",
        maxSlots: "50",
        companyName: ""
      });
      setSessionSpeakers([]);
      setIsAddSessionOpen(false);
    }
  };

  const handleAddSpeaker = () => {
    if (newSpeaker.name) {
      setSessionSpeakers([...sessionSpeakers, {
        name: newSpeaker.name,
        title: newSpeaker.title,
        avatar: newSpeaker.avatar || (user?.avatar_url || "")
      }]);
      setNewSpeaker({ name: "", title: "", avatar: "" });
    }
  };

  const handleRemoveSpeaker = (index: number) => {
    setSessionSpeakers(sessionSpeakers.filter((_, i) => i !== index));
  };

  const handleAddCurrentMentorAsSpeaker = () => {
    if (user && !sessionSpeakers.some(s => s.name === user.full_name)) {
      setSessionSpeakers([...sessionSpeakers, {
        name: user.full_name,
        avatar: user.avatar_url || "",
        title: user.current_role || "Mentor"
      }]);
    }
  };

  const handleAddExperience = () => {
    // Note: Visiting experiences still mock for now, can be implemented similarly to achievements
    if (newExperience.menteeName && newExperience.description) {
      setVisitingExperiences([
        ...visitingExperiences,
        {
          ...newExperience,
          id: visitingExperiences.length + 1,
          topics: newExperience.topics.split(",").map(t => t.trim()),
          menteeAvatar: ""
        }
      ]);
      setNewExperience({ menteeName: "", date: "", description: "", topics: "" });
      setIsAddExperienceOpen(false);
    }
  };

  const handleDeleteExperience = (id: number) => {
    setVisitingExperiences(visitingExperiences.filter(e => e.id !== id));
  };

  const handleDeleteAchievement = async (id: string) => {
    if (await supabaseService.deleteAchievement(id)) {
        setAchievements(achievements.filter(a => a.id !== id));
        toast.success("Achievement deleted");
    }
  };

  const handleDeleteSessionClick = (id: string) => {
    onDeleteSession(id);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2">Mentor Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your portfolio and tech sessions
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="grid w-full grid-cols-6 max-w-4xl">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="participants" className="gap-2">
            <Users className="w-4 h-4" />
            Participants
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-2">
            <Inbox className="w-4 h-4" />
            Requests
          </TabsTrigger>
          <TabsTrigger value="experiences">Experiences</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card className="p-6 max-w-2xl">
            <h3 className="mb-6">Profile Information</h3>
            <div className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={user?.avatar_url} />
                  <AvatarFallback>
                    {user?.full_name?.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline" size="sm">Change Photo</Button>
                  <p className="text-xs text-muted-foreground mt-2">JPG, PNG or GIF. Max 2MB</p>
                </div>
              </div>
              <div>
                <Label>Full Name</Label>
                <Input
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm({...profileForm, full_name: e.target.value})}
                />
              </div>
              <div>
                <Label>Title</Label>
                <Input
                    value={profileForm.current_role}
                    onChange={(e) => setProfileForm({...profileForm, current_role: e.target.value})}
                />
              </div>
              <div>
                <Label>Company</Label>
                <Input
                    value={profileForm.company}
                    onChange={(e) => setProfileForm({...profileForm, company: e.target.value})}
                />
              </div>
              <div>
                <Label>Years of Experience</Label>
                <Input
                    type="number"
                    value={profileForm.years_experience}
                    onChange={(e) => setProfileForm({...profileForm, years_experience: parseInt(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label>Bio</Label>
                <Textarea
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({...profileForm, bio: e.target.value})}
                  rows={4}
                />
              </div>
              <div>
                <Label>Expertise (comma-separated)</Label>
                <Input
                    value={profileForm.expertise}
                    onChange={(e) => setProfileForm({...profileForm, expertise: e.target.value})}
                />
              </div>
              <div>
                <Label>LinkedIn URL</Label>
                <Input
                    value={profileForm.linkedin_url}
                    onChange={(e) => setProfileForm({...profileForm, linkedin_url: e.target.value})}
                />
              </div>
              <div>
                <Label>GitHub URL</Label>
                <Input
                    value={profileForm.github_url}
                    onChange={(e) => setProfileForm({...profileForm, github_url: e.target.value})}
                />
              </div>
              <div>
                <Label>Website URL</Label>
                <Input
                    value={profileForm.website_url}
                    onChange={(e) => setProfileForm({...profileForm, website_url: e.target.value})}
                />
              </div>
              <Button onClick={handleProfileUpdate} disabled={isSavingProfile}>
                {isSavingProfile && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <h3>Your Achievements</h3>
            <Dialog open={isAddAchievementOpen} onOpenChange={setIsAddAchievementOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Achievement
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Achievement</DialogTitle>
                  <DialogDescription>
                    Add a new achievement, certification, or milestone to showcase on your profile.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={newAchievement.title}
                      onChange={(e) => setNewAchievement({ ...newAchievement, title: e.target.value })}
                      placeholder="Achievement title"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={newAchievement.description}
                      onChange={(e) => setNewAchievement({ ...newAchievement, description: e.target.value })}
                      placeholder="Describe your achievement"
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={newAchievement.date}
                      onChange={(e) => setNewAchievement({ ...newAchievement, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Input
                      value={newAchievement.type}
                      onChange={(e) => setNewAchievement({ ...newAchievement, type: e.target.value })}
                      placeholder="e.g., Certification, Project, Speaking"
                    />
                  </div>
                  <Button onClick={handleAddAchievement} className="w-full">
                    Add Achievement
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {isLoadingAchievements ? (
              <div className="flex justify-center p-8">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {achievements.map((achievement) => (
                <Card key={achievement.id} className="p-6">
                    <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                        <h4 className="mb-1">{achievement.title}</h4>
                        <Badge variant="outline">{achievement.type}</Badge>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAchievement(achievement.id)}
                    >
                        <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                    </div>
                    <p className="text-muted-foreground mb-3 text-sm">{achievement.description}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {achievement.date}
                    </div>
                </Card>
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sessions" className="mt-6">
          {/* Session logic mostly unchanged but wired to props which are wired to Supabase in App.tsx */}
          <div className="flex justify-between items-center mb-6">
            <h3>Your Tech Sessions</h3>
            <Dialog open={isAddSessionOpen} onOpenChange={setIsAddSessionOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Session
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Session</DialogTitle>
                  <DialogDescription>
                    Create a new tech session to share your knowledge with the community.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {/* Form fields same as before... */}
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={newSession.title}
                      onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                      placeholder="Session title"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={newSession.description}
                      onChange={(e) => setNewSession({ ...newSession, description: e.target.value })}
                      placeholder="Describe what attendees will learn"
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label>Company Name (Optional)</Label>
                    <Input
                      value={newSession.companyName}
                      onChange={(e) => setNewSession({ ...newSession, companyName: e.target.value })}
                      placeholder="e.g., TechCorp Inc."
                    />
                  </div>

                  {/* Speakers Section */}
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <div className="flex items-center justify-between mb-3">
                      <Label>Speakers ({sessionSpeakers.length})</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddCurrentMentorAsSpeaker}
                      >
                        <UserPlus className="w-3 h-3 mr-1" />
                        Add Me
                      </Button>
                    </div>

                    {sessionSpeakers.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {sessionSpeakers.map((speaker, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-background p-2 rounded-md">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={speaker.avatar} />
                              <AvatarFallback className="text-xs">
                                {speaker.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{speaker.name}</p>
                              {speaker.title && (
                                <p className="text-xs text-muted-foreground truncate">{speaker.title}</p>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveSpeaker(idx)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Input
                        placeholder="Speaker name"
                        value={newSpeaker.name}
                        onChange={(e) => setNewSpeaker({ ...newSpeaker, name: e.target.value })}
                      />
                      <Input
                        placeholder="Speaker title (optional)"
                        value={newSpeaker.title}
                        onChange={(e) => setNewSpeaker({ ...newSpeaker, title: e.target.value })}
                      />
                      <Input
                        placeholder="Speaker avatar URL (optional)"
                        value={newSpeaker.avatar}
                        onChange={(e) => setNewSpeaker({ ...newSpeaker, avatar: e.target.value })}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        onClick={handleAddSpeaker}
                        disabled={!newSpeaker.name}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Speaker
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={newSession.date}
                      onChange={(e) => setNewSession({ ...newSession, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Time</Label>
                    <Input
                      value={newSession.time}
                      onChange={(e) => setNewSession({ ...newSession, time: e.target.value })}
                      placeholder="e.g., 6:00 PM EST"
                    />
                  </div>
                  <div>
                    <Label>Duration</Label>
                    <Input
                      value={newSession.duration}
                      onChange={(e) => setNewSession({ ...newSession, duration: e.target.value })}
                      placeholder="e.g., 90 minutes"
                    />
                  </div>
                  <div>
                    <Label>Session Type</Label>
                    <Select
                      value={newSession.sessionType}
                      onValueChange={(value: "online" | "physical") => setNewSession({ ...newSession, sessionType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="physical">Physical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {newSession.sessionType === "physical" && (
                    <div>
                      <Label>Location</Label>
                      <Input
                        value={newSession.location}
                        onChange={(e) => setNewSession({ ...newSession, location: e.target.value })}
                        placeholder="e.g., Tech Hub, San Francisco"
                      />
                    </div>
                  )}
                  <div>
                    <Label>Max Slots</Label>
                    <Input
                      type="number"
                      value={newSession.maxSlots}
                      onChange={(e) => setNewSession({ ...newSession, maxSlots: e.target.value })}
                      placeholder="e.g., 50"
                    />
                  </div>
                  <div>
                    <Label>Topics (comma-separated)</Label>
                    <Input
                      value={newSession.topics}
                      onChange={(e) => setNewSession({ ...newSession, topics: e.target.value })}
                      placeholder="e.g., React, Hooks, State Management"
                    />
                  </div>
                  <Button
                    onClick={handleAddSessionClick}
                    className="w-full"
                    disabled={!newSession.title || !newSession.description || sessionSpeakers.length === 0}
                  >
                    Create Session
                  </Button>
                  {sessionSpeakers.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center">
                      Please add at least one speaker
                    </p>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {mentorSessions.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Video className="w-10 h-10 text-primary" />
              </div>
              <h3 className="mb-2">No sessions yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first tech session to share your knowledge with the community!
              </p>
              <Button onClick={() => setIsAddSessionOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Session
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {mentorSessions.map((session) => (
              <Card key={session.id} className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="mb-2">{session.title}</h4>
                    <div className="flex gap-2">
                      <Badge variant={session.sessionType === "online" ? "default" : "secondary"}>
                        {session.sessionType === "online" ? (
                          <><Monitor className="w-3 h-3 mr-1" /> Online</>
                        ) : (
                          <><MapPin className="w-3 h-3 mr-1" /> Physical</>
                        )}
                      </Badge>
                      {session.companyName && (
                        <Badge variant="outline">{session.companyName}</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSessionClick(session.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                <p className="text-muted-foreground mb-4 text-sm">{session.description}</p>

                {/* Speakers */}
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-2">{session.speakers.length} Speaker{session.speakers.length > 1 ? 's' : ''}</p>
                  <div className="flex flex-wrap gap-2">
                    {session.speakers.map((speaker, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-muted/50 rounded-md px-2 py-1">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={speaker.avatar} />
                          <AvatarFallback className="text-xs">
                            {speaker.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs">{speaker.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Date & Time</p>
                    <p className="text-sm">{session.date} at {session.time}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Duration</p>
                    <p className="text-sm">{session.duration}</p>
                  </div>
                </div>

                {session.sessionType === "physical" && session.location && (
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground mb-1">Location</p>
                    <p className="text-sm">{session.location}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Topics</p>
                  <div className="flex flex-wrap gap-2">
                    {session.topics.map((topic, index) => (
                      <Badge key={index} variant="secondary">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="experiences" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <h3>Visiting Experiences with Mentees</h3>
            <Dialog open={isAddExperienceOpen} onOpenChange={setIsAddExperienceOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Experience
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Visiting Experience</DialogTitle>
                  <DialogDescription>
                    Document your mentorship journey by adding an experience with a mentee.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Mentee Name</Label>
                    <Input
                      value={newExperience.menteeName}
                      onChange={(e) => setNewExperience({ ...newExperience, menteeName: e.target.value })}
                      placeholder="Mentee's full name"
                    />
                  </div>
                  <div>
                    <Label>Date/Period</Label>
                    <Input
                      value={newExperience.date}
                      onChange={(e) => setNewExperience({ ...newExperience, date: e.target.value })}
                      placeholder="e.g., September 2024"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={newExperience.description}
                      onChange={(e) => setNewExperience({ ...newExperience, description: e.target.value })}
                      placeholder="Describe the mentorship experience and outcomes"
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label>Topics Covered (comma-separated)</Label>
                    <Input
                      value={newExperience.topics}
                      onChange={(e) => setNewExperience({ ...newExperience, topics: e.target.value })}
                      placeholder="e.g., Career Change, Web Development"
                    />
                  </div>
                  <Button onClick={handleAddExperience} className="w-full">
                    Add Experience
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {visitingExperiences.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users2 className="w-10 h-10 text-primary" />
              </div>
              <h3 className="mb-2">No experiences recorded yet</h3>
              <p className="text-muted-foreground mb-6">
                Document your mentorship journey by adding experiences with your mentees!
              </p>
              <Button onClick={() => setIsAddExperienceOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Experience
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {visitingExperiences.map((experience) => (
                <Card key={experience.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={experience.menteeAvatar} />
                        <AvatarFallback>
                          {experience.menteeName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4>{experience.menteeName}</h4>
                        <p className="text-sm text-muted-foreground">{experience.date}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteExperience(experience.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  <p className="text-muted-foreground mb-4">{experience.description}</p>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Topics Covered</p>
                    <div className="flex flex-wrap gap-2">
                      {experience.topics.map((topic, index) => (
                        <Badge key={index} variant="secondary">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="participants" className="mt-6">
          <SessionParticipants
            sessionRequests={sessionRequests}
            sessions={sessions}
            currentUserId={currentUserId || ""}
          />
        </TabsContent>

        <TabsContent value="requests" className="mt-6">
          <SessionRequestsManager
            sessionRequests={sessionRequests}
            sessions={sessions}
            currentUserId={currentUserId || ""}
            onRespondToRequest={onRespondToRequest}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
