import type { FastifyInstance } from "fastify";

import { requireAuth } from "../../common/auth";
import { dataResponse } from "../../common/http";
import { resolveRequestSession } from "../auth";
import { RemindersService } from "./reminders.service";
import { SubtasksService } from "./subtasks.service";
import { TodosService } from "./todos.service";
import {
  dismissReminderSchema,
  dueRemindersQuerySchema,
  markReminderSentSchema,
  reminderIdParamsSchema,
  subtaskCreateSchema,
  subtaskIdParamsSchema,
  subtaskPatchSchema,
  todoCreateSchema,
  todoIdParamsSchema,
  todoPatchSchema,
  todoRestoreSchema,
  todosQuerySchema
} from "./todos.schemas";

export async function todosRoutes(app: FastifyInstance): Promise<void> {
  const todosService = new TodosService(app.prisma);
  const subtasksService = new SubtasksService(app.prisma);
  const remindersService = new RemindersService(app.prisma);

  app.addHook("onRequest", async (request) => {
    await resolveRequestSession(app.prisma, request);
  });

  app.get("/todos", async (request) => {
    const { userId } = requireAuth(request);
    const query = todosQuerySchema.parse(request.query);
    const todos = await todosService.listTodos(userId, query);

    return dataResponse(todos);
  });

  app.post("/todos", async (request, reply) => {
    const { userId } = requireAuth(request);
    const body = todoCreateSchema.parse(request.body);
    const todo = await todosService.createTodo(userId, body);

    reply.status(201).send(dataResponse({ todo }));
  });

  app.get("/todos/:todoId", async (request) => {
    const { userId } = requireAuth(request);
    const { todoId } = todoIdParamsSchema.parse(request.params);
    const todo = await todosService.getTodo(userId, todoId);

    return dataResponse({ todo });
  });

  app.patch("/todos/:todoId", async (request) => {
    const { userId } = requireAuth(request);
    const { todoId } = todoIdParamsSchema.parse(request.params);
    const body = todoPatchSchema.parse(request.body);
    const todo = await todosService.updateTodo(userId, todoId, body);

    return dataResponse({ todo });
  });

  app.delete("/todos/:todoId", async (request) => {
    const { userId } = requireAuth(request);
    const { todoId } = todoIdParamsSchema.parse(request.params);
    const todo = await todosService.deleteTodo(userId, todoId);

    return dataResponse({ todo });
  });

  app.post("/todos/:todoId/duplicate", async (request, reply) => {
    const { userId } = requireAuth(request);
    const { todoId } = todoIdParamsSchema.parse(request.params);
    const todo = await todosService.duplicateTodo(userId, todoId);

    reply.status(201).send(dataResponse({ todo }));
  });

  app.post("/todos/:todoId/complete", async (request) => {
    const { userId } = requireAuth(request);
    const { todoId } = todoIdParamsSchema.parse(request.params);
    const todo = await todosService.completeTodo(userId, todoId);

    return dataResponse({ todo });
  });

  app.post("/todos/:todoId/uncomplete", async (request) => {
    const { userId } = requireAuth(request);
    const { todoId } = todoIdParamsSchema.parse(request.params);
    const todo = await todosService.uncompleteTodo(userId, todoId);

    return dataResponse({ todo });
  });

  app.post("/todos/:todoId/cancel", async (request) => {
    const { userId } = requireAuth(request);
    const { todoId } = todoIdParamsSchema.parse(request.params);
    const todo = await todosService.cancelTodo(userId, todoId);

    return dataResponse({ todo });
  });

  app.post("/todos/:todoId/restore", async (request) => {
    const { userId } = requireAuth(request);
    const { todoId } = todoIdParamsSchema.parse(request.params);
    const body = todoRestoreSchema.parse(request.body ?? {});
    const todo = await todosService.restoreTodo(userId, todoId, body);

    return dataResponse({ todo });
  });

  app.post("/todos/:todoId/subtasks", async (request, reply) => {
    const { userId } = requireAuth(request);
    const { todoId } = todoIdParamsSchema.parse(request.params);
    const body = subtaskCreateSchema.parse(request.body);
    const result = await subtasksService.createSubtask(userId, todoId, body);

    reply.status(201).send(dataResponse(result));
  });

  app.patch("/todos/:todoId/subtasks/:subtaskId", async (request) => {
    const { userId } = requireAuth(request);
    const { todoId, subtaskId } = subtaskIdParamsSchema.parse(request.params);
    const body = subtaskPatchSchema.parse(request.body);
    const result = await subtasksService.updateSubtask(userId, todoId, subtaskId, body);

    return dataResponse(result);
  });

  app.delete("/todos/:todoId/subtasks/:subtaskId", async (request) => {
    const { userId } = requireAuth(request);
    const { todoId, subtaskId } = subtaskIdParamsSchema.parse(request.params);
    const result = await subtasksService.deleteSubtask(userId, todoId, subtaskId);

    return dataResponse(result);
  });

  app.get("/reminders/due", async (request) => {
    const { userId } = requireAuth(request);
    const query = dueRemindersQuerySchema.parse(request.query);
    const reminders = await remindersService.listDueReminders(
      userId,
      query.before ? new Date(query.before) : new Date()
    );

    return dataResponse(reminders);
  });

  app.post("/todos/:todoId/reminders/:reminderId/mark-sent", async (request) => {
    const { userId } = requireAuth(request);
    const { todoId, reminderId } = reminderIdParamsSchema.parse(request.params);
    const body = markReminderSentSchema.parse(request.body ?? {});
    const reminder = await remindersService.markReminderSent(
      userId,
      todoId,
      reminderId,
      body.sentAt ? new Date(body.sentAt) : new Date()
    );

    return dataResponse({ reminder });
  });

  app.post("/todos/:todoId/reminders/:reminderId/dismiss", async (request) => {
    const { userId } = requireAuth(request);
    const { todoId, reminderId } = reminderIdParamsSchema.parse(request.params);
    const body = dismissReminderSchema.parse(request.body ?? {});
    const reminder = await remindersService.dismissReminder(
      userId,
      todoId,
      reminderId,
      body.dismissedAt ? new Date(body.dismissedAt) : new Date()
    );

    return dataResponse({ reminder });
  });
}

export default todosRoutes;
