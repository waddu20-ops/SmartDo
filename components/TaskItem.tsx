
import React, { useState } from 'react';
import { Task } from '../types';
import { breakdownTask, getTaskWateringTip } from '../services/geminiService';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onAddSubtasks: (taskId: string, steps: string[]) => void;
  showCalendarOptions?: boolean;
}

const ZONE_ICONS = {
  self: 'fa-heart',
  work: 'fa-briefcase',
  home: 'fa-house-chimney',
  social: 'fa-user-group',
  other: 'fa-layer-group'
};

const TaskItem: React.FC<TaskItemProps> = ({ 
  task, 
  onToggle, 
  onDelete, 
  onUpdate,
  onToggleSubtask, 
  onAddSubtasks,
  showCalendarOptions = false
}) => {
  const [isBreakingDown, setIsBreakingDown] = useState(false);
  const [isWatering, setIsWatering] = useState(false);
  const [wateringTip, setWateringTip] = useState<string | null>(null);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleBreakdown = async () => {
    if (task.subtasks.length > 0) return;
    setIsBreakingDown(true);
    const steps = await breakdownTask(task.title);
    onAddSubtasks(task.id, steps);
    setIsBreakingDown(false);
  };

  const handleWaterTask = async () => {
    setIsWatering(true);
    const tip = await getTaskWateringTip(task.title);
    setWateringTip(tip);
    setIsWatering(false);
  };

  const isMajor = task.priority === 'high';
  
  const containerClasses = `p-4 mb-4 rounded-2xl transition-all duration-300 border-2 shadow-sm relative overflow-hidden ${
    task.completed 
      ? 'opacity-60 bg-white/30 grayscale-[0.5]' 
      : isMajor 
        ? 'bg-rose-50/80 border-rose-200' 
        : 'bg-emerald-50/80 border-emerald-200'
  } ${isExpanded ? 'shadow-lg -translate-y-1' : 'hover:shadow-md'}`;

  const priorityLabelClasses = `text-[9px] font-black px-2 py-0.5 rounded-full tracking-wider uppercase flex items-center gap-1 ${
    isMajor ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
  }`;

  return (
    <div className={containerClasses}>
      <div className="flex items-center gap-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <button 
          onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
            task.completed 
              ? 'bg-emerald-500 border-emerald-500' 
              : isMajor ? 'border-rose-300 hover:border-rose-500' : 'border-emerald-300 hover:border-emerald-500'
          }`}
        >
          {task.completed && <i className="fas fa-check text-white text-xs"></i>}
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs ${isMajor ? 'text-rose-400' : 'text-emerald-400'}`}>
              <i className={`fas ${ZONE_ICONS[task.zone || 'other']}`}></i>
            </span>
            <h3 className={`font-semibold text-lg truncate ${task.completed ? 'line-through text-gray-500' : 'text-slate-800'}`}>
              {task.title}
            </h3>
            <span className={priorityLabelClasses}>
              {isMajor ? 'Major' : 'Minor'}
            </span>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${task.energyLevel === 'high' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>
              <i className={`fas ${task.energyLevel === 'high' ? 'fa-bolt-lightning' : 'fa-mug-hot'} mr-1`}></i>
              {task.energyLevel === 'high' ? 'Power' : 'Chill'}
            </span>
          </div>
          {task.dueDate && (
            <div className={`flex items-center gap-2 text-xs font-medium mt-1 ${isMajor ? 'text-rose-600' : 'text-emerald-600'}`}>
              <i className="far fa-calendar"></i>
              {new Date(task.dueDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
            </div>
          )}
        </div>

        <div className="flex gap-2 shrink-0">
          <button 
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            className={`text-slate-400 hover:text-slate-600 p-2 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
          >
            <i className="fas fa-chevron-down"></i>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-200/50 animate-fade-in space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-[10px]">
            <div className="space-y-1">
              <span className="text-slate-400 font-bold uppercase tracking-tighter">Rooted</span>
              <p className="text-slate-700 font-medium">
                {new Date(task.createdAt).toLocaleString([], { dateStyle: 'long', timeStyle: 'short' })}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 font-bold uppercase tracking-tighter">Zone</span>
              <p className="text-slate-700 font-bold capitalize">
                 {task.zone || 'General'}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 font-bold uppercase tracking-tighter">Energy Need</span>
              <p className={`font-bold ${task.energyLevel === 'high' ? 'text-amber-600' : 'text-sky-600'}`}>
                {task.energyLevel === 'high' ? 'Focused Bloom' : 'Gentle Growth'}
              </p>
            </div>
          </div>

          {wateringTip && (
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl text-indigo-700 text-xs italic leading-relaxed animate-fade-in flex gap-3">
               <i className="fas fa-droplet text-indigo-300 mt-0.5"></i>
               <span>"{wateringTip}"</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <button 
              onClick={(e) => { e.stopPropagation(); handleWaterTask(); }}
              disabled={isWatering}
              className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors flex items-center gap-1 font-medium"
            >
              {isWatering ? <i className="fas fa-droplet animate-bounce"></i> : <i className="fas fa-droplet"></i>}
              Water Task
            </button>
            
            {showCalendarOptions && (
              <button 
                onClick={(e) => { e.stopPropagation(); setIsEditingSettings(!isEditingSettings); }}
                className="text-xs bg-white/50 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-full hover:bg-white transition-colors flex items-center gap-1 font-medium"
              >
                <i className="fas fa-clock"></i>
                Schedule
              </button>
            )}
            {!task.completed && task.subtasks.length === 0 && (
              <button 
                onClick={(e) => { e.stopPropagation(); handleBreakdown(); }}
                disabled={isBreakingDown}
                className="text-xs bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition-colors flex items-center gap-1 font-medium"
              >
                {isBreakingDown ? <i className="fas fa-sparkles animate-spin"></i> : <i className="fas fa-magic"></i>}
                AI Breakdown
              </button>
            )}
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
              className="text-xs bg-rose-50 text-rose-600 px-3 py-1.5 rounded-full hover:bg-rose-100 transition-colors flex items-center gap-1 font-medium ml-auto"
            >
              <i className="far fa-trash-alt"></i>
              Delete
            </button>
          </div>

          {isEditingSettings && (
            <div className="mt-4 p-4 bg-white/40 rounded-xl space-y-4 animate-fade-in border border-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Zone</label>
                  <select 
                    value={task.zone}
                    onChange={(e) => onUpdate(task.id, { zone: e.target.value as any })}
                    className="w-full bg-white border border-slate-100 rounded-lg p-2 text-sm focus:outline-none"
                  >
                    <option value="other">General</option>
                    <option value="self">Self-Care</option>
                    <option value="work">Professional</option>
                    <option value="home">Home & Sanctuary</option>
                    <option value="social">Connection</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Energy Required</label>
                  <div className="flex gap-2">
                    <button 
                       onClick={() => onUpdate(task.id, { energyLevel: 'low' })}
                       className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${task.energyLevel === 'low' ? 'bg-sky-500 text-white' : 'bg-white border border-slate-100 text-slate-400'}`}
                    >Chill</button>
                    <button 
                       onClick={() => onUpdate(task.id, { energyLevel: 'high' })}
                       className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${task.energyLevel === 'high' ? 'bg-amber-500 text-white' : 'bg-white border border-slate-100 text-slate-400'}`}
                    >Power</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {task.subtasks.length > 0 && (
            <div className={`mt-3 border-l-2 ${isMajor ? 'border-rose-200' : 'border-emerald-200'} pl-4 space-y-2`}>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Guided Steps</h4>
              {task.subtasks.map((sub) => (
                <div key={sub.id} className="flex items-center gap-3 group">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onToggleSubtask(task.id, sub.id); }}
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      sub.completed ? 'bg-emerald-400 border-emerald-400' : 'border-gray-300 hover:border-indigo-400'
                    }`}
                  >
                    {sub.completed && <i className="fas fa-check text-white text-[8px]"></i>}
                  </button>
                  <span className={`text-sm ${sub.completed ? 'line-through text-gray-400' : 'text-slate-600'}`}>
                    {sub.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskItem;
