import React, { useState } from 'react';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';
import { Plus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useTaskManager } from '@/hooks/useTaskManager';
import { TaskStatus, TaskPriority } from '@/lib/types';
import TaskColumn from '@/components/TaskColumn';
import NewTaskDialog from '@/components/NewTaskDialog';

const TaskBoard: React.FC = () => {
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    showLow: true,
    showMedium: true,
    showHigh: true,
  });
  
  const { 
    tasks,
    todoTasks,
    inProgressTasks,
    completedTasks,
    isLoading,
    selectedTask,
    setSelectedTask,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    isPending
  } = useTaskManager();
  
  const [taskToDelete, setTaskToDelete] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Apply filters to tasks
  const applyFilters = (taskList: any[]) => {
    return taskList.filter(task => {
      if (task.priority === TaskPriority.LOW && !filters.showLow) return false;
      if (task.priority === TaskPriority.MEDIUM && !filters.showMedium) return false;
      if (task.priority === TaskPriority.HIGH && !filters.showHigh) return false;
      return true;
    });
  };

  const filteredTodoTasks = applyFilters(todoTasks);
  const filteredInProgressTasks = applyFilters(inProgressTasks);
  const filteredCompletedTasks = applyFilters(completedTasks);

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
  
  // Handle task deletion
  const handleTaskDelete = (task: any) => {
    setTaskToDelete(task);
    setIsDeleteDialogOpen(true);
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
      className="p-6 min-h-screen bg-cover bg-center"
      style={{ 
        backgroundImage: "url('https://img.freepik.com/free-photo/cyberpunk-neon-tunnel-with-blue-pink-glowing-lights_23-2151966357.jpg?t=st=1743615797~exp=1743619397~hmac=019e3ed73ceb1b8c3a8ebac35586cccd3ec8437608f82bb6581aa2c929bffd1c&w=1060')" 
      }}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold mb-2 md:mb-0">Task Board</h1>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuCheckboxItem
                checked={filters.showLow}
                onCheckedChange={(checked) => setFilters(prev => ({ ...prev, showLow: checked }))}
              >
                Low Priority
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.showMedium}
                onCheckedChange={(checked) => setFilters(prev => ({ ...prev, showMedium: checked }))}
              >
                Medium Priority
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.showHigh}
                onCheckedChange={(checked) => setFilters(prev => ({ ...prev, showHigh: checked }))}
              >
                High Priority
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button onClick={openTaskDialog} className="bg-primary hover:bg-blue-600">
            <Plus className="h-5 w-5 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      <div className="bg-white/90 bg-opacity-80 rounded-lg shadow p-5">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TaskColumn 
              id="todo" 
              title="To Do" 
              tasks={filteredTodoTasks} 
              colorIndicator="bg-blue-500" 
              onTaskClick={handleTaskClick}
              onDeleteTask={handleTaskDelete}
            />
            
            <TaskColumn 
              id="in-progress" 
              title="In Progress" 
              tasks={filteredInProgressTasks} 
              colorIndicator="bg-amber-500" 
              onTaskClick={handleTaskClick}
              onDeleteTask={handleTaskDelete}
            />
            
            <TaskColumn 
              id="completed" 
              title="Completed" 
              tasks={filteredCompletedTasks} 
              colorIndicator="bg-green-500" 
              onTaskClick={handleTaskClick}
              onDeleteTask={handleTaskDelete}
            />
          </div>
        </DragDropContext>
      </div>

      {/* Task Dialog */}
      <NewTaskDialog 
        isOpen={isTaskDialogOpen} 
        onClose={closeTaskDialog} 
        onSubmit={handleTaskSubmit}
        editTask={selectedTask}
        isSubmitting={isPending}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the task
              and remove it from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-500 hover:bg-red-600" 
              onClick={() => {
                if (taskToDelete) {
                  deleteTask(taskToDelete.id);
                  setTaskToDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TaskBoard;
