import React from 'react';
import { ExtractedTask } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  extractedTasks?: ExtractedTask[];
  onAddTask?: (task: ExtractedTask) => void;
  onAddAllTasks?: (tasks: ExtractedTask[]) => void;
  onEditTask?: (task: ExtractedTask) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  role, 
  content, 
  extractedTasks, 
  onAddTask, 
  onAddAllTasks,
  onEditTask 
}) => {
  if (role === 'user') {
    return (
      <div className="flex items-start justify-end">
        <div className="bg-primary text-white rounded-lg py-3 px-4 max-w-md">
          <p className="text-sm">{content}</p>
        </div>
        <div className="ml-3 flex-shrink-0 h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-white">
          JD
        </div>
      </div>
    );
  }

  if (role === 'system') {
    return (
      <div className="flex items-start">
        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-accent flex items-center justify-center text-white">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="ml-3 bg-gray-100 rounded-lg py-3 px-4 max-w-md">
          <p className="text-sm">{content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start">
      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-accent flex items-center justify-center text-white">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <div className="ml-3 bg-gray-100 rounded-lg py-3 px-4 max-w-md">
        <p className="text-sm mb-3">{content}</p>
        
        {extractedTasks && extractedTasks.length > 0 && (
          <div className="space-y-3">
            {extractedTasks.map((task, idx) => (
              <Card key={idx} className="bg-white p-3 rounded border border-gray-200">
                <h4 className="font-medium text-sm">{task.title}</h4>
                <div className="flex items-center mt-2 text-sm">
                  <div className="mr-3">
                    <span className="text-xs text-gray-500">Due date:</span>
                    <p className="font-medium">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Priority:</span>
                    <p className={`font-medium ${
                      task.priority === 'high' ? 'text-red-500' : 
                      task.priority === 'medium' ? 'text-amber-500' : 
                      'text-blue-500'
                    }`}>
                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                    </p>
                  </div>
                </div>
                <div className="flex mt-2">
                  <Button 
                    className="text-xs mr-2" 
                    size="sm" 
                    onClick={() => onAddTask?.(task)}
                  >
                    Add Task
                  </Button>
                  <Button 
                    className="text-xs" 
                    variant="outline" 
                    size="sm"
                    onClick={() => onEditTask?.(task)}
                  >
                    Edit
                  </Button>
                </div>
              </Card>
            ))}
            
            {extractedTasks.length > 1 && (
              <Button 
                className="w-full text-sm mt-2" 
                onClick={() => onAddAllTasks?.(extractedTasks)}
              >
                Add All Tasks
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
