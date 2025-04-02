import React, { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SendHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import ChatMessage from '@/components/ChatMessage';
import { ExtractedTask, TaskInput, TaskStatus } from '@/lib/types';
import { useTaskManager } from '@/hooks/useTaskManager';
import { apiRequest } from '@/lib/queryClient';
import NewTaskDialog from '@/components/NewTaskDialog';

// Type for chat messages
interface Message {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  extractedTasks?: ExtractedTask[];
}

interface DashboardAIAssistantProps {
  onTasksAdded?: () => void;
}

const DashboardAIAssistant: React.FC<DashboardAIAssistantProps> = ({ onTasksAdded }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ExtractedTask | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { createTask, isPending } = useTaskManager();

  // Fetch previous messages on component mount
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await apiRequest('GET', '/api/ai-messages', null);
        const data = await response.json();
        setMessages(data);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Save AI message to server
  const saveAIMessage = async (message: { role: 'user' | 'assistant' | 'system'; content: string }) => {
    try {
      const response = await apiRequest('POST', '/api/ai-messages', message);
      return await response.json();
    } catch (error) {
      console.error('Error saving message:', error);
      throw error;
    }
  };

  // Process task extraction from text
  const processTaskExtraction = async (text: string) => {
    try {
      setIsExtracting(true);
      
      // Add loading message
      const loadingMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Processing your message and extracting tasks...',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, loadingMessage]);
      
      // Extract tasks from text
      const response = await apiRequest('POST', '/api/extract-tasks', { text });
      const extractedTasks = await response.json();
      
      console.log('Extracted tasks:', extractedTasks);
      
      const result = extractedTasks.tasks || [];
      console.log('Task extraction successful:', extractedTasks);
      
      // Create AI response with extracted tasks
      const aiResponse: Message = {
        id: Date.now() + 2,
        role: 'assistant',
        content: result.length > 0 
          ? "I've identified the following tasks from your text and intelligently assigned priorities based on context, deadlines, and importance:" 
          : "I couldn't identify any specific tasks in your message. Could you provide more details or a clearer description of the tasks?",
        timestamp: new Date(),
        extractedTasks: result,
      };
      
      // Save AI response to server
      await saveAIMessage({
        role: 'assistant',
        content: aiResponse.content,
      });
      
      // Update messages state, removing loading message
      setMessages(prev => {
        return prev.filter(msg => msg.id !== loadingMessage.id).concat(aiResponse);
      });
    } catch (error) {
      console.error('Error extracting tasks:', error);
      
      // Show error message
      const errorMessage: Message = {
        id: Date.now() + 2,
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your message. Please try again.',
        timestamp: new Date(),
      };
      
      // Save error message to server
      saveAIMessage({
        role: 'assistant',
        content: errorMessage.content,
      });
      
      // Update messages state, removing loading message
      setMessages(prev => {
        return prev.filter(msg => msg.id !== prev[prev.length - 1].id).concat(errorMessage);
      });
    } finally {
      setIsExtracting(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const currentInput = input.trim();
    
    // Add user message to UI
    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: currentInput,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    try {
      // Save user message to server
      await saveAIMessage({
        role: 'user',
        content: currentInput,
      });
      
      // Process task extraction
      await processTaskExtraction(currentInput);
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Show error message if overall process fails
      const errorMessage: Message = {
        id: Date.now() + 2,
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your message. Please try again.',
        timestamp: new Date(),
      };
      
      // Save error message to server
      saveAIMessage({
        role: 'assistant',
        content: errorMessage.content,
      });
      
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // Handle adding a single task
  const handleAddTask = (task: ExtractedTask) => {
    const taskInput: TaskInput = {
      ...task,
      status: TaskStatus.TODO,
      isAiGenerated: 1,
      source: 'AI Assistant'
    };
    
    createTask(taskInput);
    if (onTasksAdded) onTasksAdded();
    
    // Refresh task lists
    queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    queryClient.invalidateQueries({ queryKey: ['/api/task-stats'] });
  };

  // Handle adding all tasks
  const handleAddAllTasks = (tasks: ExtractedTask[]) => {
    tasks.forEach(task => {
      const taskInput: TaskInput = {
        ...task,
        status: TaskStatus.TODO,
        isAiGenerated: 1,
        source: 'AI Assistant'
      };
      
      createTask(taskInput);
    });
    
    if (onTasksAdded) onTasksAdded();
    
    // Refresh task lists
    queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    queryClient.invalidateQueries({ queryKey: ['/api/task-stats'] });
  };

  // Handle editing a task
  const handleEditTask = (task: ExtractedTask) => {
    setEditingTask(task);
    setIsTaskDialogOpen(true);
  };

  // Handle task dialog close
  const handleCloseTaskDialog = () => {
    setIsTaskDialogOpen(false);
    setEditingTask(null);
  };

  // Handle edited task submission
  const handleTaskSubmit = (data: TaskInput) => {
    const taskInput: TaskInput = {
      ...data,
      status: TaskStatus.TODO,
      isAiGenerated: 1,
      source: 'AI Assistant'
    };
    
    createTask(taskInput);
    handleCloseTaskDialog();
    
    if (onTasksAdded) onTasksAdded();
    
    // Refresh task lists
    queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    queryClient.invalidateQueries({ queryKey: ['/api/task-stats'] });
  };

  return (
    <div className="bg-white rounded-lg shadow flex flex-col" style={{ height: "450px" }}>
      <div className="p-3 border-b border-gray-200">
        <h2 className="text-lg font-semibold flex items-center">
          <SendHorizontal className="h-5 w-5 mr-2 text-accent" />
          ENSPYR AI Task Manager
        </h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-3" id="dashboardChatMessages">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-5">
            <p>Welcome to the Task Manager.</p>
            <p className="text-sm mt-2">Send a message to extract tasks from your text.</p>
          </div>
        ) : (
          messages.slice(-6).map((message) => (
            <ChatMessage 
              key={message.id}
              role={message.role}
              content={message.content}
              extractedTasks={message.extractedTasks}
              onAddTask={handleAddTask}
              onAddAllTasks={handleAddAllTasks}
              onEditTask={handleEditTask}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-3 border-t border-gray-200">
        <form className="flex items-center" onSubmit={handleSubmit}>
          <Textarea
            className="flex-1 border border-gray-300 rounded-lg px-3 py-1 mr-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Describe your tasks here..."
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isExtracting}
          />
          <Button 
            type="submit" 
            className="bg-primary hover:bg-blue-600 p-2 rounded-lg"
            disabled={isExtracting || !input.trim()}
          >
            <SendHorizontal className="h-5 w-5" />
          </Button>
        </form>
      </div>
      
      {/* Edit Task Dialog */}
      {editingTask && (
        <NewTaskDialog 
          isOpen={isTaskDialogOpen} 
          onClose={handleCloseTaskDialog} 
          onSubmit={handleTaskSubmit}
          editTask={{
            id: 0,
            title: editingTask.title,
            description: editingTask.description,
            priority: editingTask.priority,
            dueDate: editingTask.dueDate ? new Date(editingTask.dueDate) : undefined,
            category: editingTask.category,
            status: TaskStatus.TODO,
            createdAt: new Date()
          }}
          isSubmitting={isPending}
        />
      )}
    </div>
  );
};

export default DashboardAIAssistant;
