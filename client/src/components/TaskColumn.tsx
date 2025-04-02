import React from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import TaskCard from './TaskCard';
import { Task } from '@/lib/types';

interface TaskColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  colorIndicator: string;
  onTaskClick: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
}

const TaskColumn: React.FC<TaskColumnProps> = ({ 
  id, 
  title, 
  tasks, 
  colorIndicator, 
  onTaskClick, 
  onDeleteTask 
}) => {
  return (
    <div className="kanban-column bg-blue-100 bg-opacity-40 rounded-lg p-4">
      <h3 className="font-medium text-white mb-3 flex items-center">
        <span className={`w-3 h-3 rounded-full ${colorIndicator} mr-2`}></span>
        {title} ({tasks.length})
      </h3>
      
      <Droppable droppableId={id}>
        {(provided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="min-h-[300px]"
          >
            {tasks.map((task, index) => (
              <Draggable 
                key={task.id.toString()} 
                draggableId={task.id.toString()} 
                index={index}
              >
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                  >
                    <TaskCard 
                      task={task} 
                      onClick={onTaskClick}
                      onDelete={onDeleteTask}
                      isDragging={snapshot.isDragging}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default TaskColumn;
