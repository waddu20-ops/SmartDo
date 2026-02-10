
import React, { useState } from 'react';
import { Task } from '../types';

interface CalendarViewProps {
  tasks: Task[];
  allTasks: Task[]; // To show unscheduled ones
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onAddTask: (title: string, date?: string, priority?: 'high' | 'medium') => void;
  onClose: () => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7 AM to 9 PM

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, allTasks, onToggle, onDelete, onUpdate, onAddTask, onClose }) => {
  const [isAddingToSlot, setIsAddingToSlot] = useState<{ day: number; hour: number } | null>(null);
  const [newSlotTaskTitle, setNewSlotTaskTitle] = useState('');
  const [newSlotIsMajor, setNewSlotIsMajor] = useState(false);
  
  const [newPendingTitle, setNewPendingTitle] = useState('');
  const [newPendingDate, setNewPendingDate] = useState('');
  const [isMajorPending, setIsMajorPending] = useState(false);
  
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const unscheduledTasks = allTasks.filter(t => !t.dueDate);

  const getTasksForSlot = (day: number, hour: number) => {
    return tasks.filter(t => {
      if (!t.dueDate) return false;
      const date = new Date(t.dueDate);
      return date.getDay() === day && date.getHours() === hour;
    });
  };

  const handleAddSlotTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAddingToSlot || !newSlotTaskTitle.trim()) return;

    const now = new Date();
    const targetDate = new Date();
    const currentDayIndex = now.getDay();
    let diff = isAddingToSlot.day - currentDayIndex;
    if (diff < 0) diff += 7;
    targetDate.setDate(now.getDate() + diff);
    targetDate.setHours(isAddingToSlot.hour, 0, 0, 0);

    onAddTask(newSlotTaskTitle, targetDate.toISOString(), newSlotIsMajor ? 'high' : 'medium');
    setNewSlotTaskTitle('');
    setNewSlotIsMajor(false);
    setIsAddingToSlot(null);
  };

  const handleAddPendingTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPendingTitle.trim()) return;
    onAddTask(newPendingTitle.trim(), newPendingDate || undefined, isMajorPending ? 'high' : 'medium');
    setNewPendingTitle('');
    setNewPendingDate('');
    setIsMajorPending(false);
  };

  return (
    <div className="fixed inset-0 z-40 bg-slate-50 overflow-hidden animate-fade-in flex flex-col md:flex-row">
      {/* Main Calendar Area */}
      <div className="flex-1 flex flex-col h-full overflow-auto p-4 md:p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">Weekly Garden</h2>
            <p className="text-slate-500">Scheduled SmartDos with heart.</p>
          </div>
          <button 
            onClick={onClose}
            className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </header>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 min-w-[800px]">
          <div className="grid grid-cols-8 border-b border-slate-100 bg-slate-50/50">
            <div className="p-4 border-r border-slate-100 font-bold text-slate-400 text-xs uppercase tracking-wider">Time</div>
            {DAYS.map((day, idx) => (
              <div key={day} className={`p-4 font-bold text-center text-sm ${new Date().getDay() === idx ? 'text-indigo-600 bg-indigo-50/30' : 'text-slate-600'}`}>
                {day}
              </div>
            ))}
          </div>

          <div className="divide-y divide-slate-50">
            {HOURS.map(hour => (
              <div key={hour} className="grid grid-cols-8 group">
                <div className="p-4 border-r border-slate-100 text-xs font-medium text-slate-400 text-right">
                  {hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                </div>
                {DAYS.map((_, dayIdx) => {
                  const slotTasks = getTasksForSlot(dayIdx, hour);
                  const isActiveSlot = isAddingToSlot?.day === dayIdx && isAddingToSlot?.hour === hour;
                  
                  return (
                    <div 
                      key={dayIdx} 
                      onClick={() => !isActiveSlot && setIsAddingToSlot({ day: dayIdx, hour })}
                      className="p-1 min-h-[100px] border-r border-slate-50 relative hover:bg-slate-50/50 transition-colors cursor-pointer"
                    >
                      {slotTasks.map(task => (
                        <div 
                          key={task.id}
                          onClick={(e) => e.stopPropagation()}
                          className={`p-2 mb-1 rounded-lg text-[10px] leading-tight shadow-sm border ${
                            task.completed 
                              ? 'bg-emerald-50 border-emerald-100 text-emerald-700 opacity-60 grayscale' 
                              : task.priority === 'high' 
                                ? 'bg-rose-50 border-rose-200 text-rose-700' 
                                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          }`}
                        >
                          <div className="font-bold truncate">{task.title}</div>
                          <div className="flex justify-between mt-1 items-center">
                            <button onClick={() => onToggle(task.id)} className="hover:text-emerald-500">
                              <i className={`fas ${task.completed ? 'fa-check-circle' : 'fa-circle'}`}></i>
                            </button>
                            {task.priority === 'high' && <span className="text-[7px] font-bold bg-rose-500 text-white px-1 rounded">MAJOR</span>}
                            <button onClick={() => onDelete(task.id)} className="hover:text-rose-500">
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      {isActiveSlot ? (
                        <form onSubmit={handleAddSlotTask} onClick={(e) => e.stopPropagation()} className="absolute inset-0 z-10 p-2 bg-white shadow-lg rounded-lg border border-indigo-200 flex flex-col gap-1">
                          <input 
                            autoFocus
                            className="w-full text-[10px] p-1 border-b border-indigo-100 focus:outline-none"
                            placeholder="Add task..."
                            value={newSlotTaskTitle}
                            onChange={(e) => setNewSlotTaskTitle(e.target.value)}
                          />
                          <div className="flex gap-1">
                             <button 
                              type="button"
                              onClick={() => setNewSlotIsMajor(true)}
                              className={`flex-1 text-[7px] font-bold py-0.5 rounded transition-all ${newSlotIsMajor ? 'bg-rose-500 text-white shadow-sm' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}
                             >Major</button>
                             <button 
                              type="button"
                              onClick={() => setNewSlotIsMajor(false)}
                              className={`flex-1 text-[7px] font-bold py-0.5 rounded transition-all ${!newSlotIsMajor ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}
                             >Minor</button>
                          </div>
                          <div className="flex justify-between mt-1 px-1">
                            <button type="submit" className="text-[10px] text-indigo-500 font-bold">Add</button>
                            <button type="button" onClick={() => { setIsAddingToSlot(null); setNewSlotTaskTitle(''); }} className="text-[10px] text-slate-300">Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 pointer-events-none">
                          <i className="fas fa-plus text-indigo-200 text-xs"></i>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar for Unscheduled Tasks */}
      <aside className="w-full md:w-80 bg-white border-l border-slate-100 flex flex-col h-full shadow-2xl">
        <div className="p-6 border-b border-slate-50">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <i className="fas fa-seedling text-indigo-400"></i>
            Pending SmartDos
          </h3>
          <p className="text-xs text-slate-400 mt-1">Dictate when your seeds should grow.</p>
        </div>
        
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {unscheduledTasks.length === 0 ? (
            <div className="text-center py-12 opacity-30 px-4">
              <i className="fas fa-magic text-2xl mb-2 text-slate-300"></i>
              <p className="text-xs text-slate-500 italic">No floating tasks.</p>
            </div>
          ) : (
            unscheduledTasks.map(task => (
              <div 
                key={task.id} 
                className={`p-3 rounded-xl border transition-all hover:shadow-md group ${
                  task.completed ? 'opacity-50 grayscale' : task.priority === 'high' ? 'bg-rose-50/50 border-rose-100' : 'bg-emerald-50/50 border-emerald-100'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 pr-2">
                    <h4 className="text-xs font-semibold text-slate-700 leading-tight">{task.title}</h4>
                    <span className={`text-[8px] font-bold uppercase mt-1 inline-block ${task.priority === 'high' ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {task.priority === 'high' ? 'Major' : 'Minor'}
                    </span>
                  </div>
                  <button onClick={() => onDelete(task.id)} className="text-slate-300 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <i className="fas fa-times text-[10px]"></i>
                  </button>
                </div>

                {editingTaskId === task.id ? (
                  <div className="mt-2 space-y-2 animate-fade-in">
                    <input 
                      type="datetime-local" 
                      className="w-full p-1.5 text-[10px] border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-300"
                      onChange={(e) => onUpdate(task.id, { dueDate: e.target.value })}
                    />
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => setEditingTaskId(null)}
                        className="text-[9px] text-slate-400 font-bold px-2 py-1 rounded hover:bg-slate-100"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between mt-2">
                    <button onClick={() => onToggle(task.id)} className={`text-[10px] font-bold ${task.completed ? 'text-emerald-500' : 'text-slate-400 hover:text-indigo-500'}`}>
                      {task.completed ? 'Done' : 'Complete'}
                    </button>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => {
                          const today = new Date();
                          today.setHours(9, 0, 0, 0);
                          onUpdate(task.id, { dueDate: today.toISOString() });
                        }}
                        className="text-[9px] bg-white/80 border border-slate-200 px-2 py-1 rounded-md text-slate-600 hover:bg-white hover:border-slate-300 transition-all shadow-sm"
                        title="Quick 9AM"
                      >
                        Today 9AM
                      </button>
                      <button 
                        onClick={() => setEditingTaskId(task.id)}
                        className="text-[9px] bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-md text-indigo-600 hover:bg-indigo-100 transition-all shadow-sm"
                      >
                        <i className="fas fa-clock mr-1"></i>
                        Pick Date
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100">
          <form onSubmit={handleAddPendingTask} className="flex flex-col gap-3">
            {/* Preferred Time - Moved to Top */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Preferred Time (Optional)</label>
              <input 
                type="datetime-local"
                className="w-full p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all bg-white"
                value={newPendingDate}
                onChange={(e) => setNewPendingDate(e.target.value)}
              />
            </div>

            {/* Major/Minor Toggles */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Severity</label>
              <div className="flex gap-1">
                 <button 
                  type="button"
                  onClick={() => setIsMajorPending(true)}
                  className={`flex-1 text-[8px] font-bold py-2 rounded-lg transition-all ${isMajorPending ? 'bg-rose-500 text-white shadow-md border-rose-600' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}
                 >MAJOR</button>
                 <button 
                  type="button"
                  onClick={() => setIsMajorPending(false)}
                  className={`flex-1 text-[8px] font-bold py-2 rounded-lg transition-all ${!isMajorPending ? 'bg-emerald-500 text-white shadow-md border-emerald-600' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}
                 >MINOR</button>
              </div>
            </div>

            {/* Task Title Input */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Task Description</label>
              <input 
                type="text"
                placeholder="What needs to happen?"
                className="w-full p-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all bg-white shadow-sm"
                value={newPendingTitle}
                onChange={(e) => setNewPendingTitle(e.target.value)}
              />
            </div>

            <button 
              type="submit"
              disabled={!newPendingTitle.trim()}
              className="w-full py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold shadow-lg hover:bg-slate-900 disabled:bg-slate-300 disabled:shadow-none transition-all mt-1"
            >
              Plant SmartDo
            </button>
          </form>
        </div>
      </aside>
    </div>
  );
};

export default CalendarView;
