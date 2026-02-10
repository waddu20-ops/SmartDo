
export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: number;
  priority: 'low' | 'medium' | 'high';
  energyLevel: 'low' | 'high';
  zone: 'self' | 'work' | 'home' | 'social' | 'other';
  subtasks: SubTask[];
  dueDate?: string; // ISO Date string
  dayIndex?: number; // 0 (Sun) to 6 (Sat)
  hour?: number; // 0 to 23
  reminderMinutes?: number;
  notified?: boolean;
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface VoiceState {
  isActive: boolean;
  isConnecting: boolean;
  isModelSpeaking: boolean;
  transcript: string;
}
