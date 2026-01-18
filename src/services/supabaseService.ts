import { supabase, tables } from '@/lib/supabaseClient';
import { toast } from 'sonner';

export type UserRole = 'mentor' | 'mentee' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  expertise?: string[];
  role: UserRole;
  years_experience?: number;
  current_role?: string;
  company?: string;
  linkedin_url?: string;
  github_url?: string;
  website_url?: string;
  interests?: string[];
  goals?: string;
  created_at: string;
  updated_at: string;
  profile_completed?: boolean;
}

export interface Achievement {
  id: string;
  user_id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  type?: string;
  created_at: string;
}

export interface Speaker {
  name: string;
  avatar: string;
  title?: string;
}

export interface Session {
  id: string;
  title: string;
  description: string;
  speakers: Speaker[];
  date: string;
  time: string;
  duration: string;
  topics: string[];
  attendees: number;
  sessionType: "online" | "physical";
  location?: string;
  maxSlots?: number;
  availableSlots?: number;
  companyName?: string;
  createdBy?: string;
}

export interface SessionRequest {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar: string;
  status: "pending" | "accepted" | "rejected";
  requestedAt: string;
  updatedAt: string;
  phone?: string;
  occupation?: string;
  experienceLevel?: string;
  reasonToJoin?: string;
  expectations?: string;
}

// Helper to convert DB session to Frontend session
const mapDBSessionToSession = (dbSession: any): Session => {
  const startDate = new Date(dbSession.start_time);
  const date = startDate.toLocaleDateString('en-CA'); // YYYY-MM-DD
  const time = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  return {
    id: dbSession.id,
    title: dbSession.title,
    description: dbSession.description,
    speakers: dbSession.speakers || [],
    date: date,
    time: time,
    duration: dbSession.duration || "60 min",
    topics: dbSession.topics || [],
    attendees: dbSession.attendees_count || 0,
    sessionType: dbSession.session_type,
    location: dbSession.location,
    maxSlots: dbSession.max_participants,
    availableSlots: (dbSession.max_participants || 0) - (dbSession.attendees_count || 0),
    companyName: dbSession.company_name,
    createdBy: dbSession.created_by
  };
};

export const supabaseService = {
  // User Profile Operations
  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from(tables.profiles)
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data as UserProfile;
  },

  async createProfile(profile: any): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from(tables.profiles)
      .insert(profile)
      .select()
      .single();

    if (error) {
      console.error('Error creating profile:', error);
      toast.error('Failed to create profile');
      return null;
    }

    return data as UserProfile;
  },

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from(tables.profiles)
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
      return null;
    }

    return data as UserProfile;
  },

  async getMentors() {
    const { data, error } = await supabase
      .from(tables.profiles)
      .select('*')
      .eq('role', 'mentor');

    if (error) {
      console.error('Error fetching mentors:', error);
      return [];
    }

    return data as UserProfile[];
  },

  // Achievement Operations
  async getAchievements(userId: string): Promise<Achievement[]> {
    const { data, error } = await supabase
      .from(tables.achievements)
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching achievements:', error);
      return [];
    }

    return data as Achievement[];
  },

  async createAchievement(achievement: Omit<Achievement, 'id' | 'created_at' | 'user_id'> & { user_id: string }): Promise<Achievement | null> {
    const { data, error } = await supabase
      .from(tables.achievements)
      .insert(achievement)
      .select()
      .single();

    if (error) {
      console.error('Error creating achievement:', error);
      toast.error('Failed to create achievement');
      return null;
    }

    return data as Achievement;
  },

  async deleteAchievement(achievementId: string): Promise<boolean> {
    const { error } = await supabase
      .from(tables.achievements)
      .delete()
      .eq('id', achievementId);

    if (error) {
      console.error('Error deleting achievement:', error);
      toast.error('Failed to delete achievement');
      return false;
    }

    return true;
  },

  // Session Operations
  async getSessions(filters: {
    status?: string;
    topic?: string;
    session_type?: string;
    created_by?: string;
  } = {}) {
    let q = supabase.from(tables.sessions).select('*');

    if (filters.status) {
      q = q.eq('status', filters.status);
    }
    if (filters.session_type) {
      q = q.eq('session_type', filters.session_type);
    }
    if (filters.created_by) {
      q = q.eq('created_by', filters.created_by);
    }

    const { data, error } = await q;

    if (error) {
      console.error('Error fetching sessions:', error);
      return [];
    }

    let sessions = data;

    const sessionIds = sessions.map((s: any) => s.id);
    const { data: requestData } = await supabase
        .from('session_requests')
        .select('session_id')
        .in('session_id', sessionIds)
        .eq('status', 'accepted');

    const counts: {[key: string]: number} = {};
    requestData?.forEach((r: any) => {
        counts[r.session_id] = (counts[r.session_id] || 0) + 1;
    });

    return sessions.map((s: any) => mapDBSessionToSession({
        ...s,
        attendees_count: counts[s.id] || 0
    }));
  },

  async createSession(session: Omit<Session, 'id' | 'attendees' | 'availableSlots'>) {
    const startTime = new Date(`${session.date} ${session.time}`);
    const durationMinutes = parseInt(session.duration) || 60;
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

    const dbSession = {
      title: session.title,
      description: session.description,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration: session.duration,
      topics: session.topics,
      session_type: session.sessionType,
      location: session.location,
      max_participants: session.maxSlots,
      company_name: session.companyName,
      speakers: session.speakers,
      created_by: session.createdBy
    };

    const { data, error } = await supabase
      .from(tables.sessions)
      .insert(dbSession)
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      throw error;
    }

    return mapDBSessionToSession(data);
  },

  async deleteSession(sessionId: string) {
    const { error } = await supabase
      .from(tables.sessions)
      .delete()
      .eq('id', sessionId);

    if (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  },

  // Session Requests
  async getSessionRequests(userId?: string, mentorId?: string) {
    let query = supabase.from('session_requests').select('*');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching requests:', error);
      return [];
    }

    return data.map((r: any) => ({
      id: r.id,
      sessionId: r.session_id,
      userId: r.user_id,
      userName: r.user_name || 'Unknown',
      userEmail: r.user_email || '',
      userAvatar: r.user_avatar || '',
      status: r.status,
      requestedAt: r.created_at,
      updatedAt: r.updated_at,
      phone: r.phone,
      occupation: r.occupation,
      experienceLevel: r.experience_level,
      reasonToJoin: r.reason_to_join,
      expectations: r.expectations
    }));
  },

  async createSessionRequest(request: any) {
    const dbRequest = {
      session_id: request.sessionId,
      user_id: request.userId,
      user_name: request.userName,
      user_email: request.userEmail,
      user_avatar: request.userAvatar,
      phone: request.phone,
      occupation: request.occupation,
      experience_level: request.experienceLevel,
      reason_to_join: request.reasonToJoin,
      expectations: request.expectations,
      status: 'pending'
    };

    const { data, error } = await supabase
      .from('session_requests')
      .insert(dbRequest)
      .select()
      .single();

    if (error) {
      console.error('Error creating request:', error);
      throw error;
    }

    return data;
  },

  async updateSessionRequestStatus(requestId: string, status: 'accepted' | 'rejected') {
    const { data, error } = await supabase
      .from('session_requests')
      .update({ status })
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      console.error('Error updating request:', error);
      throw error;
    }

    return data;
  }
};

export default supabaseService;
