export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'manager';
  avatar?: string;
  phone?: string;
  department?: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  last_login?: string;
}

export interface Meeting {
  id: string;
  user_id: string;
  title: string;
  subject?: string;
  date: string;
  time?: string;
  end_time?: string;
  location?: string;
  meeting_link?: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  purpose?: string;
  goals: string[];
  agenda: AgendaItem[];
  things_to_be_aware_of?: string;
  participant_notes?: string;
  additional_notes?: string;
  participants: Participant[];
  tasks: Task[];
  participant_count: number;
  task_count: number;
  pending_tasks: number;
  urgent_tasks: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface AgendaItem { id: string; title: string; duration?: number; notes?: string; }
export interface Participant { id: string; meeting_id: string; name: string; email?: string; role?: string; company?: string; background?: string; notes?: string; added_from_content: boolean; created_at: string; }
export interface Task { id: string; meeting_id: string; title: string; description?: string; assigned_to?: string; due_date?: string; priority: 'low' | 'medium' | 'high'; status: 'pending' | 'in_progress' | 'completed'; is_urgent: boolean; completed_at?: string; created_at: string; updated_at: string; }
export interface MeetingBrief { purpose?: string; goals: string[]; agenda: AgendaItem[]; things_to_be_aware_of?: string; participant_notes?: string; additional_notes?: string; }
export interface DashboardStats { totalUsers: number; newUsersThisMonth: number; userGrowth: number; totalMeetings: number; meetingsThisWeek: number; upcomingMeetings: number; pendingTasks: number; urgentTasks: number; completedTasksThisMonth: number; }
export interface PaginatedResponse<T> { data: T[]; pagination: { page: number; limit: number; total: number; pages: number; }; }
export interface AuthState { user: User | null; token: string | null; isAuthenticated: boolean; isLoading: boolean; login: (email: string, password: string) => Promise<void>; register: (email: string, password: string, name: string) => Promise<void>; logout: () => void; checkAuth: () => void; }