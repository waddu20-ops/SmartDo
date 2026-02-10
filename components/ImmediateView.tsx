
import React from 'react';
import { Task } from '../types';
import TaskItem from './TaskItem';

interface ImmediateViewProps {
  tasks: Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onAddSubtasks: (taskId: string, steps: string[]) => void;
  onClose: () => void;
}

const ImmediateView: React.FC<ImmediateViewProps> = ({ 
  tasks, onToggle, onDelete, onUpdate, onToggleSubtask, onAddSubtasks, onClose 
}) => {
  return (
    <div className="fixed inset-0 z-40 bg-white/95 backdrop-blur-xl animate-fade-in p-4 md:p-8 overflow-auto">
      <div className="max-w-2xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-800">Daily Flow</h2>
            <p className="text-rose-500 font-medium flex items-center gap-2 mt-1">
              <i className="fas fa-bolt"></i>
              Immediate focus for a beautiful day
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </header>

        <div className="space-y-4">
          {tasks.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <i className="fas fa-feather-alt text-4xl text-slate-300 mb-4"></i>
              <p className="text-slate-400">Nothing pressing right now. Breathe deep.</p>
            </div>
          ) : (
            tasks.map(task => (
              <TaskItem 
                key={task.id} 
                task={task} 
                onToggle={onToggle} 
                onDelete={onDelete}
                onUpdate={onUpdate}
                onToggleSubtask={onToggleSubtask}
                onAddSubtasks={onAddSubtasks}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ImmediateView;
