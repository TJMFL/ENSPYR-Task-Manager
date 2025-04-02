import React, { useState, useCallback } from 'react';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';
import { 
  ClipboardList, 
  Zap, 
  CheckCheck, 
  BarChart, 
  Plus 
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useTaskManager } from '@/hooks/useTaskManager';
import { TaskStatus, TaskStats } from '@/lib/types';
import StatCard from '@/components/StatCard';
import TaskColumn from '@/components/TaskColumn';
import NewTaskDialog from '@/components/NewTaskDialog';
import DashboardAIAssistant from '@/components/DashboardAIAssistant';

const Dashboard: React.FC = () => {
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  
  const { 
    todoTasks,
    inProgressTasks,
    completedTasks,
    aiGeneratedTasks,
    stats,
    isLoading,
    selectedTask,
    setSelectedTask,
    createTask,
    updateTask,
    moveTask,
    isPending
  } = useTaskManager();

  // Handle task dialog open/close
  const openTaskDialog = () => setIsTaskDialogOpen(true);
  const closeTaskDialog = () => {
    setIsTaskDialogOpen(false);
    setSelectedTask(null);
  };

  // Handle task click to edit
  const handleTaskClick = (task: any) => {
    setSelectedTask(task);
    setIsTaskDialogOpen(true);
  };

  // Handle form submission for creating/updating tasks
  const handleTaskSubmit = (data: any) => {
    if (selectedTask) {
      updateTask({ id: selectedTask.id, data });
    } else {
      createTask({ ...data, status: TaskStatus.TODO });
    }
    closeTaskDialog();
  };

  // Handle drag and drop
  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    
    // Return if dropped outside a droppable area or in the same position
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) return;
    
    const taskId = parseInt(draggableId);
    let newStatus;
    
    // Determine the new status based on the destination
    switch (destination.droppableId) {
      case 'todo':
        newStatus = TaskStatus.TODO;
        break;
      case 'in-progress':
        newStatus = TaskStatus.IN_PROGRESS;
        break;
      case 'completed':
        newStatus = TaskStatus.COMPLETED;
        break;
      default:
        return;
    }
    
    // Update the task's status
    moveTask(taskId, newStatus);
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div 
      className="p-6 bg-cover bg-center min-h-screen" 
      style={{ backgroundImage: 'url(https://img.freepik.com/free-photo/modern-futuristic-sci-fi-background_35913-2150.jpg?t=st=1743583506~exp=1743587106~hmac=2648ad2f89ec4888e80b4b6f1088539932749f1dfa5b0a1dfec04f07cff52303&w=996)' }}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold mb-2 md:mb-0 bg-gradient-to-r from-blue-400 to-pink-500 text-transparent bg-clip-text">Task Manager Dashboard</h1>
        <Button onClick={openTaskDialog} className="bg-primary hover:bg-blue-600">
          <Plus className="h-5 w-5 mr-2" />
          New Task
        </Button>
      </div>

      {/* Stats Cards */}
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    <div className="transform transition-all duration-300 ease-in-out group/card hover:scale-105 hover:shadow-xl">
    <StatCard 
      title="Total Tasks" 
      value={stats ? stats.total : 0} 
      icon={<ClipboardList className="h-6 w-6" />} 
      iconBgColor="bg-blue-100" 
      iconColor="text-primary" 
      className="bg-blue-200 bg-opacity-30" // Dark transparent background
    />
  </div>
  
  <div className="transform transition-all duration-300 ease-in-out group/card hover:scale-105 hover:shadow-xl">
    <StatCard 
      title="In Progress" 
      value={stats ? stats.inProgress : 0} 
      icon={<Zap className="h-6 w-6" />} 
      iconBgColor="bg-amber-100" 
      iconColor="text-amber-500" 
      className="bg-blue-200 bg-opacity-30" // Dark transparent background
    />
  </div>
  
  <div className="transform transition-all duration-300 ease-in-out group/card hover:scale-105 hover:shadow-xl">
    <StatCard 
      title="Completed" 
      value={stats ? stats.completed : 0} 
      icon={<CheckCheck className="h-6 w-6" />} 
      iconBgColor="bg-green-100" 
      iconColor="text-green-500" 
      className="bg-blue-200 bg-opacity-30" // Dark transparent background
    />
  </div>
  
  <div className="transform transition-all duration-300 ease-in-out group/card hover:scale-105 hover:shadow-xl">
    <StatCard 
      title="Completion Rate" 
      value={`${stats ? stats.completionRate : 0}%`} 
      icon={<BarChart className="h-6 w-6" />} 
      iconBgColor="bg-violet-100" 
      iconColor="text-violet-500" 
      className="bg-blue-200 bg-opacity-30" // Dark transparent background
    />
  </div>
</div>

      
      {/* Main Content Sections */}
<div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
  {/* Kanban Board (3 cols wide) */}
  <div className="lg:col-span-3">
    <div className="bg-blue-700 bg-opacity-30 rounded-lg shadow p-5">
      <h2 className="text-white font-bold mb-4">Tasks</h2>
      
      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TaskColumn 
            id="todo" 
            title="To Do" 
            tasks={todoTasks} 
            colorIndicator="bg-blue-500" 
            onTaskClick={handleTaskClick} 
          />
          
          <TaskColumn 
            id="in-progress" 
            title="In Progress" 
            tasks={inProgressTasks} 
            colorIndicator="bg-amber-500" 
            onTaskClick={handleTaskClick} 
          />
          
          <TaskColumn 
            id="completed" 
            title="Completed" 
            tasks={completedTasks} 
            colorIndicator="bg-green-500" 
            onTaskClick={handleTaskClick} 
          />
        </div>
      </DragDropContext>
    </div>
  </div>
        
        {/* AI Assistant (2 cols wide) */}
        <div className="lg:col-span-2">
          <DashboardAIAssistant onTasksAdded={() => {}} />
        </div>
      </div>

      {/* Task Dialog */}
      <NewTaskDialog 
        isOpen={isTaskDialogOpen} 
        onClose={closeTaskDialog} 
        onSubmit={handleTaskSubmit}
        editTask={selectedTask}
        isSubmitting={isPending}
      />
    </div>
  );
};

export default Dashboard;
