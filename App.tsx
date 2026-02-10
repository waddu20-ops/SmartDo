
import React, { useState, useEffect, useCallback } from 'react';
import { Task, SubTask } from './types';
import TaskItem from './components/TaskItem';
import VoiceAssistant from './components/VoiceAssistant';
import CalendarView from './components/CalendarView';
import ImmediateView from './components/ImmediateView';
import { getKindSuggestion, getDailyReflection, categorizeTask } from './services/geminiService';

type ViewMode = 'home' | 'calendar' | 'immediate';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('smartdo-tasks');
    return saved ? JSON.parse(saved) : [];
  });
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isMajor, setIsMajor] = useState(false);
  const [smartDoSuggestion, setSmartDoSuggestion] = useState<string>('Welcome back. What shall we grow today?');
  const [isRefreshingSuggestion, setIsRefreshingSuggestion] = useState(false);
  
  const [reflection, setReflection] = useState<string | null>(null);
  const [isReflecting, setIsReflecting] = useState(false);
  const [energyFilter, setEnergyFilter] = useState<'all' | 'low' | 'high'>('all');

  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('smartdo-tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTasks(prev => prev.map(task => {
        if (task.completed || task.notified) return task;

        let shouldNotify = false;
        let notificationBody = "";

        if (task.dueDate && task.reminderMinutes !== undefined) {
          const dueTime = new Date(task.dueDate).getTime();
          const reminderTime = dueTime - (task.reminderMinutes * 60 * 1000);
          if (now.getTime() >= reminderTime && now.getTime() < dueTime) {
            shouldNotify = true;
            notificationBody = `Reminder: ${task.title} is coming up!`;
          }
        } else if (!task.dueDate) {
          const age = now.getTime() - task.createdAt;
          if (age > 2 * 60 * 60 * 1000) {
             shouldNotify = true;
             notificationBody = `SmartDo nudge: "${task.title}" is still waiting.`;
          }
        }

        if (shouldNotify) {
          triggerNotification(task.title, notificationBody);
          return { ...task, notified: true };
        }
        return task;
      }));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const triggerNotification = (title: string, body: string) => {
    if (Notification.permission === "granted") {
      new Notification("SmartDo", { body, icon: "https://cdn-icons-png.flaticon.com/512/826/826070.png" });
    }
  };

  const refreshSuggestion = useCallback(async () => {
    setIsRefreshingSuggestion(true);
    const suggestion = await getKindSuggestion(tasks);
    setSmartDoSuggestion(suggestion);
    setIsRefreshingSuggestion(false);
  }, [tasks]);

  const handleReflect = async () => {
    setIsReflecting(true);
    const dailyReflection = await getDailyReflection(tasks);
    setReflection(dailyReflection);
    setIsReflecting(false);
  };

  useEffect(() => { refreshSuggestion(); }, []);

  const addTask = async (title: string, date?: string, priority?: 'high' | 'medium') => {
    if (!title.trim()) return;
    
    // Auto-categorize
    const category = await categorizeTask(title);
    
    const newTask: Task = {
      id: Date.now().toString(),
      title: title.trim(),
      completed: false,
      createdAt: Date.now(),
      priority: priority || (isMajor ? 'high' : 'medium'),
      energyLevel: category.energy,
      zone: category.zone,
      subtasks: [],
      notified: false,
      dueDate: date,
      reminderMinutes: date ? 15 : undefined 
    };
    
    setTasks(prev => [newTask, ...prev]);
    setNewTaskTitle('');
    setIsMajor(false);
    
    if (date) {
      setViewMode('calendar');
    } else if (viewMode === 'home') {
      setViewMode('immediate');
    }
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const addSubtasks = (taskId: string, steps: string[]) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const newSubtasks: SubTask[] = steps.map(step => ({
          id: Math.random().toString(36).substr(2, 9),
          title: step,
          completed: false
        }));
        return { ...task, subtasks: [...task.subtasks, ...newSubtasks] };
      }
      return task;
    }));
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          subtasks: task.subtasks.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s)
        };
      }
      return task;
    }));
  };

  const filteredTasks = tasks.filter(t => {
    if (energyFilter === 'all') return true;
    return t.energyLevel === energyFilter;
  });

  return (
    <div className="min-h-screen">
      <main className="max-w-2xl mx-auto px-4 py-12 md:py-20">
        <header className="mb-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-[2.5rem] shadow-2xl mb-6 text-indigo-500 transform hover:rotate-12 transition-transform duration-500">
             <i className="fas fa-check-double text-4xl"></i>
          </div>
          <h1 className="text-5xl font-black text-slate-800 tracking-tighter mb-2">SmartDo</h1>
          <p className="text-slate-400 font-medium text-lg italic">Intelligent, kind productivity.</p>
        </header>

        {/* AI Encouragement */}
        <section className="mb-8 animate-fade-in group">
          <div className="bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-700 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden transition-all duration-500 group-hover:shadow-indigo-200">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
              <i className="fas fa-quote-right text-8xl text-white"></i>
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                  <span className="text-xs font-black text-indigo-100 uppercase tracking-[0.2em]">SmartDo's Perspective</span>
                </div>
                <button onClick={refreshSuggestion} className="text-white/50 hover:text-white transition-colors">
                  <i className={`fas fa-sync-alt text-xs ${isRefreshingSuggestion ? 'animate-spin' : ''}`}></i>
                </button>
              </div>
              <p className="text-white text-xl md:text-2xl font-semibold leading-snug">
                "{smartDoSuggestion}"
              </p>
            </div>
          </div>
        </section>

        {/* Reflection Button */}
        <div className="flex justify-center mb-12">
           <button 
             onClick={handleReflect}
             disabled={isReflecting}
             className="bg-white border-2 border-slate-100 px-6 py-2 rounded-full shadow-md text-indigo-600 font-bold text-sm hover:border-indigo-200 transition-all flex items-center gap-2 group"
           >
             <i className={`fas fa-sparkles text-indigo-400 group-hover:rotate-12 transition-transform ${isReflecting ? 'animate-spin' : ''}`}></i>
             Review My Garden
           </button>
        </div>

        {/* Energy Filter Toggle */}
        <div className="flex items-center justify-center gap-4 mb-8 bg-slate-100/50 p-2 rounded-2xl w-fit mx-auto">
           <button 
             onClick={() => setEnergyFilter('all')}
             className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${energyFilter === 'all' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
           >All</button>
           <button 
             onClick={() => setEnergyFilter('low')}
             className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${energyFilter === 'low' ? 'bg-sky-500 text-white shadow-md' : 'text-sky-400 hover:text-sky-600'}`}
           >
             <i className="fas fa-mug-hot"></i> Chill
           </button>
           <button 
             onClick={() => setEnergyFilter('high')}
             className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${energyFilter === 'high' ? 'bg-amber-500 text-white shadow-md' : 'text-amber-400 hover:text-amber-600'}`}
           >
             <i className="fas fa-bolt-lightning"></i> Power
           </button>
        </div>

        {/* Option 1 & 2 Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <button 
            onClick={() => setViewMode('calendar')}
            className="group p-8 bg-white rounded-[2rem] shadow-lg border-2 border-transparent hover:border-indigo-100 text-left transition-all hover:-translate-y-2"
          >
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 mb-6 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
              <i className="far fa-calendar-alt text-2xl"></i>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Future Growth</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Map your week hour-by-hour with customizable reminders.</p>
          </button>

          <button 
            onClick={() => setViewMode('immediate')}
            className="group p-8 bg-white rounded-[2rem] shadow-lg border-2 border-transparent hover:border-rose-100 text-left transition-all hover:-translate-y-2"
          >
            <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mb-6 group-hover:bg-rose-500 group-hover:text-white transition-colors">
              <i className="fas fa-bolt text-2xl"></i>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Daily Flow</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Focus on what matters now with active notification nudges.</p>
          </button>
        </div>

        {/* Home Quick Input */}
        <div className="relative group mb-4">
          <div className="flex gap-2 mb-3 px-2">
             <button 
                onClick={() => setIsMajor(true)}
                className={`text-[10px] font-bold px-3 py-1 rounded-full transition-all ${isMajor ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
             >
                MAJOR TASK
             </button>
             <button 
                onClick={() => setIsMajor(false)}
                className={`text-[10px] font-bold px-3 py-1 rounded-full transition-all ${!isMajor ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
             >
                MINOR TASK
             </button>
          </div>
          <div className="relative">
            <input 
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTask(newTaskTitle)}
              placeholder="What needs to happen?"
              className="w-full bg-white border-4 border-white focus:border-indigo-50 rounded-3xl py-5 pl-16 pr-6 shadow-xl focus:outline-none transition-all text-slate-700 placeholder:text-slate-300 text-xl font-medium"
            />
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-200 group-focus-within:text-indigo-400 transition-colors">
              <i className="fas fa-plus-circle text-2xl"></i>
            </div>
          </div>
        </div>
      </main>

      {/* Reflection Modal */}
      {reflection && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-[3rem] p-10 max-w-lg shadow-2xl relative overflow-hidden text-center">
             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-rose-400"></div>
             <i className="fas fa-leaf text-5xl text-emerald-400 mb-6 block"></i>
             <h2 className="text-2xl font-black text-slate-800 mb-4">A Note on Your Growth</h2>
             <p className="text-slate-600 text-lg leading-relaxed italic">
               "{reflection}"
             </p>
             <button 
               onClick={() => setReflection(null)}
               className="mt-8 bg-slate-800 text-white px-8 py-3 rounded-2xl font-bold shadow-lg hover:bg-slate-900 transition-all"
             >
               Keep Growing
             </button>
           </div>
        </div>
      )}

      {/* Floating Views */}
      {viewMode === 'calendar' && (
        <CalendarView 
          tasks={tasks.filter(t => !!t.dueDate)}
          allTasks={tasks}
          onToggle={toggleTask}
          onDelete={deleteTask}
          onUpdate={updateTask}
          onAddTask={addTask}
          onClose={() => setViewMode('home')}
        />
      )}
      {viewMode === 'immediate' && (
        <ImmediateView 
          tasks={filteredTasks.filter(t => !t.dueDate)}
          onToggle={toggleTask}
          onDelete={deleteTask}
          onUpdate={updateTask}
          onToggleSubtask={toggleSubtask}
          onAddSubtasks={addSubtasks}
          onClose={() => setViewMode('home')}
        />
      )}

      {/* Voice Assistant */}
      <VoiceAssistant onTaskDetected={(title, date, priority) => addTask(title, date, priority)} />

      <style>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-subtle { animation: bounce-subtle 3s ease-in-out infinite; }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default App;
