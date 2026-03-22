/**
 * Единая карта HTTP API для фронтенда и e2e-тестов.
 * Семантика путей совпадает с `docs/API.md` и ASP.NET-маршрутами.
 */
export const endpoints = {
  /** Вход в систему (JWT). */
  authentication: {
    /** POST — тело `{ login, password }` */
    signIn: '/api/authentication/login',
  },

  /** IT-проекты. */
  projects: {
    list: '/api/projects',
    byId: (id: number) => `/api/projects/${id}`,
  },

  /** Задачи (work items). */
  tasks: {
    list: (params?: { projectId?: number }) => {
      const q = params?.projectId != null ? `?projectId=${params.projectId}` : ''
      return `/api/tasks${q}`
    },
    create: '/api/tasks',
    byId: (id: number) => `/api/tasks/${id}`,
  },

  /** Пользователи (админ/менеджер). */
  users: {
    list: '/api/users',
    create: '/api/users',
    byId: (id: number) => `/api/users/${id}`,
  },

  /** Спринты. */
  sprints: {
    list: (params?: { projectId?: number }) => {
      const q = params?.projectId != null ? `?projectId=${params.projectId}` : ''
      return `/api/sprints${q}`
    },
    create: '/api/sprints',
    byId: (id: number) => `/api/sprints/${id}`,
  },

  /** Справочники для форм (роли, типы задач, статусы, приоритеты, список пользователей). */
  referenceData: {
    roles: '/api/reference-data/roles',
    taskTypes: '/api/reference-data/task-types',
    taskStatuses: '/api/reference-data/task-statuses',
    priorities: '/api/reference-data/priorities',
    /** Краткий список пользователей для селектов */
    usersForSelect: '/api/reference-data/users',
  },

  /** Экспорт отчётов (бинарный ответ, query `format`). */
  reports: {
    /** 1. Сводный отчёт по IT-проектам */
    itProjectsSummary: (format: 'xlsx' | 'pdf') =>
      `/api/reports/it-projects-summary?format=${format}`,
    /** 2. Задачи выбранного исполнителя + итоги */
    tasksByAssignee: (assigneeId: number, format: 'xlsx' | 'docx' | 'pdf') =>
      `/api/reports/tasks-by-assignee?assigneeId=${assigneeId}&format=${format}`,
    /** 3. Просроченные задачи */
    overdueTasks: (format: 'xlsx' | 'pdf') =>
      `/api/reports/overdue-tasks?format=${format}`,
    /** 4. Загрузка команды по статусам; опционально sprintId (значение из select) */
    teamAssigneeWorkload: (format: 'xlsx' | 'docx', sprintId?: string) => {
      const base = `/api/reports/team-assignee-workload?format=${format}`
      return sprintId ? `${base}&sprintId=${sprintId}` : base
    },
    /** 5. Метрики статусов задач по IT-проектам */
    itProjectsStatusOverview: (format: 'docx' | 'pdf') =>
      `/api/reports/it-projects-status-overview?format=${format}`,
  },
} as const
