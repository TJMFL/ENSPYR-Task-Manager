var __defProp = Object.defineProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express3 from "express";

// server/routes.ts
import express from "express";
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  TaskPriority: () => TaskPriority,
  TaskStatus: () => TaskStatus,
  aiMessages: () => aiMessages,
  insertAiMessageSchema: () => insertAiMessageSchema,
  insertTaskSchema: () => insertTaskSchema,
  insertUserSchema: () => insertUserSchema,
  taskValidator: () => taskValidator,
  tasks: () => tasks,
  users: () => users
});
import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var TaskStatus = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed"
};
var TaskPriority = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high"
};
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});
var tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default(TaskStatus.TODO),
  priority: text("priority").notNull().default(TaskPriority.MEDIUM),
  dueDate: timestamp("due_date"),
  category: text("category"),
  createdAt: timestamp("created_at").defaultNow(),
  isAiGenerated: integer("is_ai_generated").default(0),
  source: text("source"),
  userId: integer("user_id").references(() => users.id)
});
var baseInsertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true
});
var insertTaskSchema = baseInsertTaskSchema.extend({
  dueDate: z.union([z.string(), z.date(), z.null()]).optional()
});
var aiMessages = pgTable("ai_messages", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  userId: integer("user_id").references(() => users.id)
});
var insertAiMessageSchema = createInsertSchema(aiMessages).omit({
  id: true,
  timestamp: true
});
var taskValidator = insertTaskSchema.extend({
  status: z.enum([TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED]),
  priority: z.enum([TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH])
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, desc } from "drizzle-orm";
var DatabaseStorage = class {
  // User operations
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  // Task operations
  async getAllTasks() {
    return await db.select().from(tasks);
  }
  async getTaskById(id) {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }
  async getTasksByStatus(status) {
    return await db.select().from(tasks).where(eq(tasks.status, status));
  }
  async createTask(taskData) {
    const processedData = { ...taskData };
    if (processedData.dueDate && typeof processedData.dueDate === "string") {
      processedData.dueDate = new Date(processedData.dueDate);
    }
    const [task] = await db.insert(tasks).values(processedData).returning();
    return task;
  }
  async updateTask(id, taskData) {
    const processedData = { ...taskData };
    if (processedData.dueDate && typeof processedData.dueDate === "string") {
      processedData.dueDate = new Date(processedData.dueDate);
    }
    const [updatedTask] = await db.update(tasks).set(processedData).where(eq(tasks.id, id)).returning();
    return updatedTask;
  }
  async deleteTask(id) {
    const result = await db.delete(tasks).where(eq(tasks.id, id));
    return !!result;
  }
  // AI Message operations
  async getAIMessages(limit) {
    const query = db.select().from(aiMessages).orderBy(desc(aiMessages.timestamp));
    if (limit) {
      query.limit(limit);
    }
    return await query;
  }
  async createAIMessage(message) {
    const [aiMessage] = await db.insert(aiMessages).values(message).returning();
    return aiMessage;
  }
};
var storage = new DatabaseStorage();

// server/ai.ts
import OpenAI from "openai";
import { z as z2 } from "zod";
var groqClient = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1"
});
var extractedTaskSchema = z2.object({
  title: z2.string().min(1, "Task title is required"),
  description: z2.string().optional(),
  dueDate: z2.string().optional(),
  priority: z2.enum([TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH]),
  category: z2.string().optional()
});
async function extractTasksFromText(text2) {
  try {
    const today = /* @__PURE__ */ new Date();
    const currentDate = today.toISOString().split("T")[0];
    const response = await groqClient.chat.completions.create({
      model: "llama3-70b-8192",
      // Using Groq's LLaMA 3 model
      messages: [
        {
          role: "system",
          content: `You are an AI assistant that helps extract actionable tasks from text and intelligently prioritizes them.
          Today's date is ${currentDate}.
          
          YOUR TASK:
          1. Identify clear tasks from the user's message
          2. For each task, determine:
             - A concise task title
             - A brief description if appropriate (include reasoning for priority in the description)
             - Most importantly: Convert relative dates (like "tomorrow", "next week", "Friday") to actual YYYY-MM-DD format dates
             - Intelligently assign a priority (low/medium/high) with advanced reasoning
             - Assign a logical category if possible
          
          PRIORITY REASONING RULES:
          1. HIGH priority tasks meet any of these criteria:
             - Due within 2 days
             - Contains urgent language ("ASAP", "urgent", "critical", "immediately")
             - Involves high-value clients or management
             - Blocks other people's work
             - Has financial or legal implications
             - Contains words like "deadline" or "overdue"
          
          2. MEDIUM priority tasks meet any of these criteria:
             - Due within 1 week
             - Important but not urgent
             - Mentioned with moderate urgency language
             - Required for planned work to continue
             - Customer-facing but not on critical path
             
          3. LOW priority tasks meet any of these criteria:
             - Due dates more than 1 week away
             - No specific deadline mentioned
             - "Nice to have" improvements
             - Internal or personal tasks with little impact
             - No dependencies from other tasks

          RULES FOR DATE HANDLING:
          - Always convert relative dates to absolute YYYY-MM-DD format
          - "tomorrow" = the day after the current date (${new Date(today.getTime() + 864e5).toISOString().split("T")[0]})
          - "next week" = 7 days from today
          - Specific days of the week (like "Monday") should be the next occurrence of that day
          - If a specific date is mentioned (e.g., "March 15"), use that
          - If no date is mentioned, do not include a dueDate field
          
          Respond with a JSON object containing a 'tasks' array with the following structure:
          {
            "tasks": [
              {
                "title": "Brief task title",
                "description": "Description including priority reasoning: [reason for priority level]",
                "dueDate": "YYYY-MM-DD", (based on current date context)
                "priority": "low", "medium", or "high" (based on intelligent analysis),
                "category": "Optional category/tag for the task"
              }
            ]
          }`
        },
        {
          role: "user",
          content: text2
        }
      ],
      response_format: { type: "json_object" }
    });
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content in Groq AI response");
    }
    const parsedContent = JSON.parse(content);
    if (!parsedContent.tasks || !Array.isArray(parsedContent.tasks)) {
      throw new Error("Invalid response format from AI");
    }
    const validatedTasks = [];
    for (const task of parsedContent.tasks) {
      try {
        const validatedTask = extractedTaskSchema.parse(task);
        validatedTasks.push(validatedTask);
      } catch (error) {
        console.error("Task validation error:", error);
      }
    }
    return validatedTasks;
  } catch (error) {
    console.error("Error extracting tasks:", error);
    throw new Error("Failed to extract tasks from text: " + error.message);
  }
}

// server/routes.ts
import { ZodError } from "zod";
import bcrypt from "bcrypt";
var isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};
async function registerRoutes(app2) {
  const apiRouter = express.Router();
  apiRouter.get("/tasks", async (req, res) => {
    try {
      const tasks2 = await storage.getAllTasks();
      res.json(tasks2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks", error: error.message });
    }
  });
  apiRouter.get("/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }
      const task = await storage.getTaskById(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task", error: error.message });
    }
  });
  apiRouter.post("/tasks", async (req, res) => {
    try {
      console.log("Task data received:", req.body);
      const validatedData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(validatedData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error("Validation error:", error.errors);
        res.status(400).json({
          message: "Invalid task data",
          error: error.errors.map((e) => e.message).join(", ")
        });
      } else {
        res.status(500).json({ message: "Failed to create task", error: error.message });
      }
    }
  });
  apiRouter.patch("/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }
      const task = await storage.getTaskById(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      const validData = insertTaskSchema.partial().parse(req.body);
      const updatedTask = await storage.updateTask(id, validData);
      res.json(updatedTask);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          message: "Invalid task data",
          error: error.errors.map((e) => e.message).join(", ")
        });
      } else {
        res.status(500).json({ message: "Failed to update task", error: error.message });
      }
    }
  });
  apiRouter.delete("/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }
      const success = await storage.deleteTask(id);
      if (!success) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task", error: error.message });
    }
  });
  apiRouter.get("/task-stats", async (_req, res) => {
    try {
      const allTasks = await storage.getAllTasks();
      const todoTasks = allTasks.filter((task) => task.status === TaskStatus.TODO);
      const inProgressTasks = allTasks.filter((task) => task.status === TaskStatus.IN_PROGRESS);
      const completedTasks = allTasks.filter((task) => task.status === TaskStatus.COMPLETED);
      const completionRate = allTasks.length > 0 ? Math.round(completedTasks.length / allTasks.length * 100) : 0;
      res.json({
        total: allTasks.length,
        todo: todoTasks.length,
        inProgress: inProgressTasks.length,
        completed: completedTasks.length,
        completionRate
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task statistics", error: error.message });
    }
  });
  apiRouter.get("/ai-messages", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : void 0;
      const messages = await storage.getAIMessages(limit);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch AI messages", error: error.message });
    }
  });
  apiRouter.post("/ai-messages", async (req, res) => {
    try {
      const messageData = insertAiMessageSchema.parse(req.body);
      const message = await storage.createAIMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          message: "Invalid message data",
          error: error.errors.map((e) => e.message).join(", ")
        });
      } else {
        res.status(500).json({ message: "Failed to create message", error: error.message });
      }
    }
  });
  apiRouter.post("/extract-tasks", async (req, res) => {
    try {
      const { text: text2 } = req.body;
      if (!text2 || typeof text2 !== "string") {
        return res.status(400).json({ message: "Text content is required" });
      }
      const extractedTasks = await extractTasksFromText(text2);
      res.json({ tasks: extractedTasks });
    } catch (error) {
      res.status(500).json({ message: "Failed to extract tasks", error: error.message });
    }
  });
  apiRouter.post("/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      req.session.userId = user.id;
      req.session.username = user.username;
      res.status(201).json({
        id: user.id,
        username: user.username
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          message: "Invalid user data",
          error: error.errors.map((e) => e.message).join(", ")
        });
      } else {
        res.status(500).json({ message: "Failed to register user", error: error.message });
      }
    }
  });
  apiRouter.post("/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      req.session.userId = user.id;
      req.session.username = user.username;
      res.json({
        id: user.id,
        username: user.username
      });
    } catch (error) {
      res.status(500).json({ message: "Login failed", error: error.message });
    }
  });
  apiRouter.post("/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout", error: err.message });
      }
      res.status(200).json({ message: "Logged out successfully" });
    });
  });
  apiRouter.get("/auth/user", (req, res) => {
    if (req.session.userId) {
      return res.json({
        id: req.session.userId,
        username: req.session.username
      });
    }
    res.status(401).json({ message: "Not authenticated" });
  });
  apiRouter.use(["/tasks", "/task-stats", "/ai-messages", "/extract-tasks"], isAuthenticated);
  app2.use("/api", apiRouter);
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express2 from "express";
import fs from "fs";
import path2, { dirname as dirname2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var cartographerPlugin = [];
if (process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0) {
  cartographerPlugin = [__require("@replit/vite-plugin-cartographer").cartographer()];
}
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...cartographerPlugin
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets")
    }
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "../server/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = dirname2(__filename2);
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        __dirname2,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(__dirname2, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
var app = express3();
app.use(express3.json());
app.use(express3.urlencoded({ extended: false }));
var PgSession = connectPgSimple(session);
app.use(session({
  store: new PgSession({
    pool,
    tableName: "session"
  }),
  secret: process.env.SESSION_SECRET || "ai-task-manager-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1e3,
    // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === "production"
  }
}));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = process.env.PORT || 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    // Ensure it's accessible externally
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
