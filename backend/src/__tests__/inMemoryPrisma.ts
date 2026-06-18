import type { PrismaClient } from "@prisma/client";

type Row = Record<string, any>;
type Where = Record<string, any>;
type QueryArgs = {
  where?: Where;
  data?: Row | Row[];
  create?: Row;
  update?: Row;
  select?: Row;
  include?: Row;
  orderBy?: Row | Row[];
  take?: number;
};

export interface InMemoryPrismaState {
  users: Row[];
  sessions: Row[];
  userSettings: Row[];
  projects: Row[];
  tags: Row[];
  todos: Row[];
  subtasks: Row[];
  reminders: Row[];
  attachments: Row[];
  todoTags: Row[];
  notificationEvents: Row[];
  webPushSubscriptions: Row[];
  undoRecords: Row[];
}

export type InMemoryPrisma = PrismaClient & {
  __state: InMemoryPrismaState;
};

const tableNames = [
  "users",
  "sessions",
  "userSettings",
  "projects",
  "tags",
  "todos",
  "subtasks",
  "reminders",
  "attachments",
  "todoTags",
  "notificationEvents",
  "webPushSubscriptions",
  "undoRecords"
] as const;

type TableName = (typeof tableNames)[number];

function createInitialState(): InMemoryPrismaState {
  return {
    users: [],
    sessions: [],
    userSettings: [],
    projects: [],
    tags: [],
    todos: [],
    subtasks: [],
    reminders: [],
    attachments: [],
    todoTags: [],
    notificationEvents: [],
    webPushSubscriptions: [],
    undoRecords: []
  };
}

function isRecord(value: unknown): value is Row {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  );
}

function compareValues(left: unknown, right: unknown): number {
  const leftValue =
    left instanceof Date ? left.getTime() : typeof left === "number" ? left : String(left ?? "");
  const rightValue =
    right instanceof Date
      ? right.getTime()
      : typeof right === "number"
        ? right
        : String(right ?? "");

  if (leftValue === rightValue) {
    return 0;
  }

  return leftValue > rightValue ? 1 : -1;
}

function applyData(row: Row, data: Row): void {
  for (const [key, value] of Object.entries(data)) {
    if (isRecord(value) && typeof value.increment === "number") {
      row[key] = (row[key] ?? 0) + value.increment;
      continue;
    }

    row[key] = value;
  }
}

function sortRows(rows: Row[], orderBy?: Row | Row[]): Row[] {
  if (!orderBy) {
    return rows;
  }

  const orderRules = Array.isArray(orderBy) ? orderBy : [orderBy];

  return [...rows].sort((left, right) => {
    for (const rule of orderRules) {
      const [field, direction] = Object.entries(rule)[0] ?? [];

      if (!field) {
        continue;
      }

      const compared = compareValues(left[field], right[field]);
      if (compared !== 0) {
        return direction === "desc" ? -compared : compared;
      }
    }

    return 0;
  });
}

function pickSelected(
  row: Row,
  select: Row | undefined,
  state: InMemoryPrismaState
): Row {
  if (!select) {
    return row;
  }

  const output: Row = {};

  for (const [key, value] of Object.entries(select)) {
    if (value === true) {
      output[key] = row[key];
      continue;
    }

    if (key === "user" && isRecord(value)) {
      const user = state.users.find((candidate) => candidate.id === row.userId);
      output.user = user ? pickSelected(user, value.select, state) : null;
    }
  }

  return output;
}

function matchesScalarCondition(actual: unknown, condition: Row): boolean {
  let matchedOperator = false;

  if ("in" in condition) {
    return Array.isArray(condition.in) && condition.in.includes(actual);
  }

  if ("notIn" in condition) {
    return Array.isArray(condition.notIn) && !condition.notIn.includes(actual);
  }

  if ("not" in condition) {
    if (condition.not === null) {
      return actual !== null && actual !== undefined;
    }

    return actual !== condition.not;
  }

  if ("lte" in condition) {
    matchedOperator = true;
    if (compareValues(actual, condition.lte) > 0) {
      return false;
    }
  }

  if ("lt" in condition) {
    matchedOperator = true;
    if (compareValues(actual, condition.lt) >= 0) {
      return false;
    }
  }

  if ("gte" in condition) {
    matchedOperator = true;
    if (compareValues(actual, condition.gte) < 0) {
      return false;
    }
  }

  if ("gt" in condition) {
    matchedOperator = true;
    if (compareValues(actual, condition.gt) <= 0) {
      return false;
    }
  }

  if ("contains" in condition) {
    const haystack = String(actual ?? "");
    const needle = String(condition.contains ?? "");
    return condition.mode === "insensitive"
      ? haystack.toLowerCase().includes(needle.toLowerCase())
      : haystack.includes(needle);
  }

  if (matchedOperator) {
    return true;
  }

  return condition === null ? actual === null || actual === undefined : actual === condition;
}

function matchesWhere(
  row: Row,
  where: Where | undefined,
  state: InMemoryPrismaState
): boolean {
  if (!where) {
    return true;
  }

  for (const [key, condition] of Object.entries(where)) {
    if (key === "OR") {
      if (!Array.isArray(condition) || !condition.some((item) => matchesWhere(row, item, state))) {
        return false;
      }
      continue;
    }

    if (key === "AND") {
      if (!Array.isArray(condition) || !condition.every((item) => matchesWhere(row, item, state))) {
        return false;
      }
      continue;
    }

    if (key === "todo" && isRecord(condition)) {
      const todo = state.todos.find((candidate) => candidate.id === row.todoId);
      if (!todo || !matchesWhere(todo, condition, state)) {
        return false;
      }
      continue;
    }

    if (key === "tag" && isRecord(condition)) {
      const tag = state.tags.find((candidate) => candidate.id === row.tagId);
      if (!tag || !matchesWhere(tag, condition, state)) {
        return false;
      }
      continue;
    }

    if (isRecord(condition)) {
      if (!matchesScalarCondition(row[key], condition)) {
        return false;
      }
      continue;
    }

    if (
      condition === null
        ? row[key] !== null && row[key] !== undefined
        : row[key] !== condition
    ) {
      return false;
    }
  }

  return true;
}

function decorateTodo(todo: Row, state: InMemoryPrismaState): Row {
  const active = { deletedAt: null };
  const todoTags = state.todoTags
    .filter((todoTag) => todoTag.todoId === todo.id)
    .map((todoTag): Row => ({
      ...todoTag,
      tag: state.tags.find((tag) => tag.id === todoTag.tagId) ?? null
    }))
    .filter((todoTag) => todoTag.tag?.deletedAt === null || todoTag.tag?.deletedAt === undefined)
    .sort((left, right) => compareValues(left["createdAt"], right["createdAt"]));

  return {
    ...todo,
    subtasks: sortRows(
      state.subtasks.filter((subtask) =>
        matchesWhere(subtask, { todoId: todo.id, ...active }, state)
      ),
      { position: "asc" }
    ),
    reminders: sortRows(
      state.reminders.filter((reminder) =>
        matchesWhere(reminder, { todoId: todo.id, ...active }, state)
      ),
      { remindAt: "asc" }
    ),
    attachments: sortRows(
      state.attachments.filter((attachment) =>
        matchesWhere(attachment, { todoId: todo.id, ...active }, state)
      ),
      { createdAt: "asc" }
    ),
    todoTags
  };
}

function applyResult(
  row: Row | null,
  args: QueryArgs | undefined,
  modelName: string,
  state: InMemoryPrismaState
): Row | null {
  if (!row) {
    return null;
  }

  const included =
    args?.include && modelName === "todo" ? decorateTodo(row, state) : row;

  if (args?.include && modelName === "reminder" && args.include.todo) {
    return {
      ...included,
      todo: state.todos.find((todo) => todo.id === row.todoId) ?? null
    };
  }

  return pickSelected(included, args?.select, state);
}

function createDelegate(
  state: InMemoryPrismaState,
  tableName: TableName,
  modelName: string
) {
  const table = state[tableName] as Row[];

  return {
    async findUnique(args: QueryArgs): Promise<Row | null> {
      const row = table.find((candidate) => matchesWhere(candidate, args.where, state)) ?? null;
      return applyResult(row, args, modelName, state);
    },
    async findFirst(args: QueryArgs = {}): Promise<Row | null> {
      const rows = sortRows(
        table.filter((candidate) => matchesWhere(candidate, args.where, state)),
        args.orderBy
      );
      return applyResult(rows[0] ?? null, args, modelName, state);
    },
    async findMany(args: QueryArgs = {}): Promise<Row[]> {
      const rows = sortRows(
        table.filter((candidate) => matchesWhere(candidate, args.where, state)),
        args.orderBy
      );
      const limited = args.take ? rows.slice(0, args.take) : rows;
      return limited.map((row) => applyResult(row, args, modelName, state) as Row);
    },
    async count(args: QueryArgs = {}): Promise<number> {
      return table.filter((candidate) => matchesWhere(candidate, args.where, state)).length;
    },
    async create(args: QueryArgs): Promise<Row> {
      const row = { ...(args.data as Row) };
      table.push(row);
      return applyResult(row, args, modelName, state) as Row;
    },
    async createMany(args: QueryArgs): Promise<{ count: number }> {
      const data = Array.isArray(args.data) ? args.data : [args.data as Row];
      table.push(...data.map((row) => ({ ...row })));
      return { count: data.length };
    },
    async update(args: QueryArgs): Promise<Row> {
      const row = table.find((candidate) => matchesWhere(candidate, args.where, state));

      if (!row) {
        throw new Error(`${modelName}.update target not found`);
      }

      applyData(row, args.data as Row);
      return applyResult(row, args, modelName, state) as Row;
    },
    async updateMany(args: QueryArgs): Promise<{ count: number }> {
      const rows = table.filter((candidate) => matchesWhere(candidate, args.where, state));
      for (const row of rows) {
        applyData(row, args.data as Row);
      }
      return { count: rows.length };
    },
    async deleteMany(args: QueryArgs = {}): Promise<{ count: number }> {
      const before = table.length;
      const kept = table.filter((candidate) => !matchesWhere(candidate, args.where, state));
      table.splice(0, table.length, ...kept);
      return { count: before - kept.length };
    }
  };
}

function createWebPushSubscriptionDelegate(state: InMemoryPrismaState) {
  const delegate = createDelegate(
    state,
    "webPushSubscriptions",
    "webPushSubscription"
  );

  return {
    ...delegate,
    async upsert(args: QueryArgs): Promise<Row> {
      const unique = args.where?.userId_endpoint;
      const existing = state.webPushSubscriptions.find(
        (subscription) =>
          subscription.userId === unique?.userId &&
          subscription.endpoint === unique?.endpoint
      );

      if (existing) {
        applyData(existing, args.update ?? {});
        return existing;
      }

      const row = { ...(args.create ?? {}) };
      state.webPushSubscriptions.push(row);
      return row;
    }
  };
}

function createUserSettingDelegate(state: InMemoryPrismaState) {
  const delegate = createDelegate(state, "userSettings", "userSetting");

  return {
    ...delegate,
    async upsert(args: QueryArgs): Promise<Row> {
      const userId = args.where?.userId;
      const existing = state.userSettings.find((settings) => settings.userId === userId);

      if (existing) {
        applyData(existing, args.update ?? {});
        return existing;
      }

      const row = { ...(args.create ?? {}) };
      state.userSettings.push(row);
      return row;
    }
  };
}

export function createInMemoryPrisma(): InMemoryPrisma {
  const state = createInitialState();
  const prisma: Row = {
    __state: state,
    user: createDelegate(state, "users", "user"),
    session: createDelegate(state, "sessions", "session"),
    userSetting: createUserSettingDelegate(state),
    project: createDelegate(state, "projects", "project"),
    tag: createDelegate(state, "tags", "tag"),
    todo: createDelegate(state, "todos", "todo"),
    subtask: createDelegate(state, "subtasks", "subtask"),
    reminder: createDelegate(state, "reminders", "reminder"),
    attachment: createDelegate(state, "attachments", "attachment"),
    todoTag: createDelegate(state, "todoTags", "todoTag"),
    notificationEvent: createDelegate(
      state,
      "notificationEvents",
      "notificationEvent"
    ),
    webPushSubscription: createWebPushSubscriptionDelegate(state),
    undoRecord: createDelegate(state, "undoRecords", "undoRecord"),
    async $transaction<T>(callback: (tx: InMemoryPrisma) => Promise<T>): Promise<T> {
      return callback(prisma as InMemoryPrisma);
    },
    async $disconnect(): Promise<void> {
      return undefined;
    }
  };

  return prisma as InMemoryPrisma;
}

export function createFakeRedis() {
  const values = new Map<string, string>();

  return {
    async set(
      key: string,
      value: string,
      _px?: string,
      _ttl?: number,
      nx?: string
    ): Promise<"OK" | null> {
      if (nx === "NX" && values.has(key)) {
        return null;
      }

      values.set(key, value);
      return "OK";
    },
    async eval(_script: string, _keyCount: number, key: string): Promise<number> {
      return values.delete(key) ? 1 : 0;
    },
    disconnect(): void {
      values.clear();
    }
  };
}
