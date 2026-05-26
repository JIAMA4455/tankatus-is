export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'worker' | 'viewer';
  department?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  start_date?: string;
  end_date?: string;
  budget?: number;
  manager_id?: string;
  manager_name?: string;
  total_tasks?: number;
  done_tasks?: number;
  members?: ProjectMember[];
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  department?: string;
  project_role: 'manager' | 'member' | 'observer';
}

export interface Stage {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  order_index: number;
  status: 'pending' | 'in_progress' | 'completed';
  start_date?: string;
  end_date?: string;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  stage_id?: string;
  stage_name?: string;
  parent_task_id?: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee_id?: string;
  assignee_name?: string;
  assignee_email?: string;
  creator_id?: string;
  creator_name?: string;
  budget?: number;
  actual_cost?: number;
  estimated_hours?: number;
  actual_hours?: number;
  start_date?: string;
  due_date?: string;
  completed_at?: string;
  project_name?: string;
  comments?: Comment[];
  attachments?: Attachment[];
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  task_id: string;
  author_id: string;
  author_name: string;
  avatar_url?: string;
  content: string;
  created_at: string;
}

export interface Attachment {
  id: string;
  task_id?: string;
  project_id?: string;
  filename: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  created_at: string;
}

export interface KpiSnapshot {
  id: string;
  project_id: string;
  snapshot_date: string;
  planned_value: number;
  earned_value: number;
  actual_cost: number;
  budget_at_completion?: number;
  spi?: number;
  cpi?: number;
  cv?: number;
  sv?: number;
  eac?: number;
  etc?: number;
  vac?: number;
}

export interface DashboardStats {
  project_stats: Array<{ status: string; cnt: string }>;
  task_stats: Array<{ status: string; cnt: string }>;
  overdue_tasks: number;
  recent_active_projects: Array<Project & { total_tasks: string; done_tasks: string }>;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}
