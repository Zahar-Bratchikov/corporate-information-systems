import { useState, useEffect } from 'react'
import { api, apiBlob } from '../api'
import { endpoints } from '../api/endpoints'
import { useAuth } from '../AuthContext'
import './Reports.css'

interface User { id: number; fullName: string; roleName: string }
interface Sprint { id: number; name: string }

interface ItProjectsSummaryPreview {
  rows: Array<{
    name: string
    code: string
    releaseDate: string
    responsibleName: string
    totalTasks: number
    featureCount: number
    bugCount: number
    techTaskCount: number
  }>
}

interface AssigneeTasksPreview {
  assigneeName: string
  assigneeRole: string
  tasks: Array<{
    title: string
    typeName: string
    projectName: string
    dueDate: string
    statusName: string
    priorityName: string
  }>
  total: number
  inProgress: number
  completed: number
  completedPct: number
}

interface OverdueTasksPreview {
  tasks: Array<{
    title: string
    typeName: string
    projectName: string
    assigneeName: string
    dueDate: string
    statusName: string
    daysOverdue: number
  }>
  byProject: Array<{ project: string; count: number }>
}

interface TeamWorkloadPreview {
  rows: Array<{
    fullName: string
    roleName: string
    newTasks: number
    inProgress: number
    inTest: number
    done: number
    postponed: number
    total: number
    completedPct: number
  }>
}

interface ProjectStatusesPreview {
  rows: Array<{
    name: string
    code: string
    responsibleName: string
    total: number
    done: number
    inWork: number
    overdue: number
    donePct: number
  }>
}

export default function Reports() {
  const { user } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [loading, setLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const [itSummaryPreview, setItSummaryPreview] = useState<ItProjectsSummaryPreview | null>(null)
  const [assigneePreview, setAssigneePreview] = useState<AssigneeTasksPreview | null>(null)
  const [overduePreview, setOverduePreview] = useState<OverdueTasksPreview | null>(null)
  const [teamPreview, setTeamPreview] = useState<TeamWorkloadPreview | null>(null)
  const [statusPreview, setStatusPreview] = useState<ProjectStatusesPreview | null>(null)

  useEffect(() => {
    void (async () => {
      const [r1, r2] = await Promise.all([
        api<User[]>(endpoints.referenceData.usersForSelect),
        api<Sprint[]>(endpoints.sprints.list())
      ])
      if (r1.data) setUsers(r1.data)
      if (r2.data) setSprints(r2.data)
    })()
  }, [])

  const download = async (path: string) => {
    setLoading(true)
    setMessage('')
    const { blob, filename, error } = await apiBlob(path)
    setLoading(false)
    if (error) {
      setMessage(error)
      return
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const loadPreview = async <T,>(key: string, url: string, setData: (d: T | null) => void) => {
    setPreviewLoading(key)
    setMessage('')
    const res = await api<T>(url)
    setPreviewLoading(null)
    if (res.error) {
      setMessage(res.error)
      setData(null)
      return
    }
    setData(res.data ?? null)
  }

  return (
    <div className="reports upzit-page upzit-page--reports" data-testid="upzit-reports-page">
      <h1 className="upzit-page-title">Отчёты</h1>
      <p className="reports-intro">
        Данные для каждого отчёта можно <strong>посмотреть в браузере</strong> (кнопка «Показать в приложении») или выгрузить в файл — набор полей совпадает с экспортом.
      </p>
      {message && (
        <div className="reports-error upzit-reports-error" role="alert" data-testid="upzit-reports-message">
          {message}
        </div>
      )}
      {loading && (
        <div className="reports-loading upzit-reports-loading" data-testid="upzit-reports-loading">
          Формирование файла…
        </div>
      )}

      <section className="report-block upzit-report-block" data-testid="upzit-report-block-it-projects-summary">
        <h2>1. Сводный отчёт по IT-проектам</h2>
        <p>По каждому проекту: наименование, код, даты, ответственный; количество задач всего и по типам (фича, баг, техническая задача).</p>
        <div className="report-actions-row upzit-report-actions-row">
          <button
            type="button"
            className="report-btn-secondary"
            disabled={previewLoading === 'it-summary'}
            onClick={() => void loadPreview('it-summary', endpoints.reports.previews.itProjectsSummary, setItSummaryPreview)}
            data-testid="upzit-report-preview-it-projects-summary"
          >
            {previewLoading === 'it-summary' ? 'Загрузка…' : 'Показать в приложении'}
          </button>
          <div className="report-actions upzit-report-actions">
            <button
              type="button"
              onClick={() => download(endpoints.reports.itProjectsSummary('xlsx'))}
              data-testid="upzit-report-it-projects-summary-xlsx"
            >
              Скачать Excel
            </button>
            <button
              type="button"
              onClick={() => download(endpoints.reports.itProjectsSummary('pdf'))}
              data-testid="upzit-report-it-projects-summary-pdf"
            >
              Скачать PDF
            </button>
          </div>
        </div>
        {itSummaryPreview && (
          <div className="report-preview" data-testid="upzit-report-preview-panel-it-projects-summary">
            <table className="report-preview-table">
              <thead>
                <tr>
                  <th>Проект</th>
                  <th>Код</th>
                  <th>Релиз</th>
                  <th>Ответственный</th>
                  <th>Всего</th>
                  <th>Фича</th>
                  <th>Баг</th>
                  <th>Техн.</th>
                </tr>
              </thead>
              <tbody>
                {itSummaryPreview.rows.map((row, i) => (
                  <tr key={`${row.code}-${i}`}>
                    <td>{row.name}</td>
                    <td>{row.code}</td>
                    <td>{row.releaseDate || '—'}</td>
                    <td>{row.responsibleName || '—'}</td>
                    <td>{row.totalTasks}</td>
                    <td>{row.featureCount}</td>
                    <td>{row.bugCount}</td>
                    <td>{row.techTaskCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="report-block upzit-report-block" data-testid="upzit-report-block-tasks-by-assignee">
        <h2>2. Отчёт по задачам исполнителя</h2>
        <p>Список задач выбранного исполнителя с итогами: всего, в работе, выполнено, доля выполненных.</p>
        <AssigneeReportForm
          users={users}
          onDownload={download}
          currentUserId={user?.userId}
          previewLoading={previewLoading === 'assignee'}
          onPreview={assigneeId =>
            void loadPreview(
              'assignee',
              endpoints.reports.previews.tasksByAssignee(assigneeId),
              setAssigneePreview
            )
          }
        />
        {assigneePreview && (
          <div className="report-preview" data-testid="upzit-report-preview-panel-assignee">
            <p className="report-preview-caption">
              <strong>{assigneePreview.assigneeName}</strong>
              {assigneePreview.assigneeRole ? ` — ${assigneePreview.assigneeRole}` : ''}
            </p>
            <p className="report-preview-summary">
              Всего: {assigneePreview.total}, в работе: {assigneePreview.inProgress}, выполнено: {assigneePreview.completed}, доля
              выполненных: {assigneePreview.completedPct.toFixed(1)}%
            </p>
            <table className="report-preview-table">
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Тип</th>
                  <th>Проект</th>
                  <th>Срок</th>
                  <th>Статус</th>
                  <th>Приоритет</th>
                </tr>
              </thead>
              <tbody>
                {assigneePreview.tasks.map((t, i) => (
                  <tr key={`${t.title}-${i}`}>
                    <td>{t.title}</td>
                    <td>{t.typeName}</td>
                    <td>{t.projectName}</td>
                    <td>{t.dueDate || '—'}</td>
                    <td>{t.statusName}</td>
                    <td>{t.priorityName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="report-block upzit-report-block" data-testid="upzit-report-block-overdue-tasks">
        <h2>3. Просроченные задачи</h2>
        <p>Задачи с просроченным сроком, количество дней просрочки, сводка по проектам.</p>
        <div className="report-actions-row upzit-report-actions-row">
          <button
            type="button"
            className="report-btn-secondary"
            disabled={previewLoading === 'overdue'}
            onClick={() => void loadPreview('overdue', endpoints.reports.previews.overdueTasks, setOverduePreview)}
            data-testid="upzit-report-preview-overdue-tasks"
          >
            {previewLoading === 'overdue' ? 'Загрузка…' : 'Показать в приложении'}
          </button>
          <div className="report-actions upzit-report-actions">
            <button
              type="button"
              onClick={() => download(endpoints.reports.overdueTasks('xlsx'))}
              data-testid="upzit-report-overdue-tasks-xlsx"
            >
              Скачать Excel
            </button>
            <button
              type="button"
              onClick={() => download(endpoints.reports.overdueTasks('pdf'))}
              data-testid="upzit-report-overdue-tasks-pdf"
            >
              Скачать PDF
            </button>
          </div>
        </div>
        {overduePreview && (
          <div className="report-preview" data-testid="upzit-report-preview-panel-overdue">
            <h3 className="report-preview-subtitle">Задачи</h3>
            <table className="report-preview-table">
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Тип</th>
                  <th>Проект</th>
                  <th>Исполнитель</th>
                  <th>Дедлайн</th>
                  <th>Статус</th>
                  <th>Дней просрочки</th>
                </tr>
              </thead>
              <tbody>
                {overduePreview.tasks.map((t, i) => (
                  <tr key={`${t.title}-${i}`}>
                    <td>{t.title}</td>
                    <td>{t.typeName}</td>
                    <td>{t.projectName}</td>
                    <td>{t.assigneeName || '—'}</td>
                    <td>{t.dueDate}</td>
                    <td>{t.statusName}</td>
                    <td>{t.daysOverdue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3 className="report-preview-subtitle">Сводка по проектам</h3>
            <table className="report-preview-table report-preview-table--compact">
              <thead>
                <tr>
                  <th>Проект</th>
                  <th>Просрочено</th>
                </tr>
              </thead>
              <tbody>
                {overduePreview.byProject.map((b, i) => (
                  <tr key={`${b.project}-${i}`}>
                    <td>{b.project}</td>
                    <td>{b.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="report-block upzit-report-block" data-testid="upzit-report-block-team-workload">
        <h2>4. Сводка по загрузке команды</h2>
        <p>По каждому исполнителю: ФИО, роль; задачи по статусам; доля завершённых. Опционально — фильтр по спринту.</p>
        <TeamWorkloadForm
          sprints={sprints}
          onDownload={download}
          previewLoading={previewLoading === 'team'}
          onPreview={sprintId =>
            void loadPreview(
              'team',
              endpoints.reports.previews.teamAssigneeWorkload(sprintId || undefined),
              setTeamPreview
            )
          }
        />
        {teamPreview && (
          <div className="report-preview" data-testid="upzit-report-preview-panel-team">
            <table className="report-preview-table">
              <thead>
                <tr>
                  <th>ФИО</th>
                  <th>Роль</th>
                  <th>Новая</th>
                  <th>В работе</th>
                  <th>В тест.</th>
                  <th>Выполнена</th>
                  <th>Отложена</th>
                  <th>Всего</th>
                  <th>% заверш.</th>
                </tr>
              </thead>
              <tbody>
                {teamPreview.rows.map((r, i) => (
                  <tr key={`${r.fullName}-${i}`}>
                    <td>{r.fullName}</td>
                    <td>{r.roleName}</td>
                    <td>{r.newTasks}</td>
                    <td>{r.inProgress}</td>
                    <td>{r.inTest}</td>
                    <td>{r.done}</td>
                    <td>{r.postponed}</td>
                    <td>{r.total}</td>
                    <td>{r.completedPct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="report-block upzit-report-block" data-testid="upzit-report-block-it-projects-status">
        <h2>5. Отчёт по статусам IT-проектов</h2>
        <p>По каждому проекту: общее число задач, выполнено, в работе, просрочено, процент выполнения.</p>
        <div className="report-actions-row upzit-report-actions-row">
          <button
            type="button"
            className="report-btn-secondary"
            disabled={previewLoading === 'status'}
            onClick={() =>
              void loadPreview(
                'status',
                endpoints.reports.previews.itProjectsStatusOverview,
                setStatusPreview
              )
            }
            data-testid="upzit-report-preview-it-projects-status"
          >
            {previewLoading === 'status' ? 'Загрузка…' : 'Показать в приложении'}
          </button>
          <div className="report-actions upzit-report-actions">
            <button
              type="button"
              onClick={() => download(endpoints.reports.itProjectsStatusOverview('docx'))}
              data-testid="upzit-report-it-projects-status-docx"
            >
              Скачать Word
            </button>
            <button
              type="button"
              onClick={() => download(endpoints.reports.itProjectsStatusOverview('pdf'))}
              data-testid="upzit-report-it-projects-status-pdf"
            >
              Скачать PDF
            </button>
          </div>
        </div>
        {statusPreview && (
          <div className="report-preview" data-testid="upzit-report-preview-panel-it-projects-status">
            <table className="report-preview-table">
              <thead>
                <tr>
                  <th>Проект</th>
                  <th>Код</th>
                  <th>Ответственный</th>
                  <th>Всего</th>
                  <th>Выполнена</th>
                  <th>В работе</th>
                  <th>Просрочено</th>
                  <th>% выполн.</th>
                </tr>
              </thead>
              <tbody>
                {statusPreview.rows.map((r, i) => (
                  <tr key={`${r.code}-${i}`}>
                    <td>{r.name}</td>
                    <td>{r.code}</td>
                    <td>{r.responsibleName || '—'}</td>
                    <td>{r.total}</td>
                    <td>{r.done}</td>
                    <td>{r.inWork}</td>
                    <td>{r.overdue}</td>
                    <td>{r.donePct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function AssigneeReportForm({
  users,
  onDownload,
  currentUserId,
  onPreview,
  previewLoading,
}: {
  users: User[]
  onDownload: (path: string) => void
  currentUserId?: number
  onPreview: (assigneeId: number) => void
  previewLoading: boolean
}) {
  const [assigneeId, setAssigneeId] = useState(currentUserId?.toString() ?? '')
  const [format, setFormat] = useState<'xlsx' | 'docx' | 'pdf'>('xlsx')

  const resolveAssigneeId = (): number | null => {
    const id =
      assigneeId ||
      currentUserId?.toString() ||
      users.find(u => u.roleName?.includes('Разработчик') || u.roleName?.includes('QA'))?.id?.toString() ||
      users[0]?.id?.toString()
    if (!id) return null
    return Number(id)
  }

  const handleDownload = () => {
    const id = resolveAssigneeId()
    if (id == null) return
    onDownload(endpoints.reports.tasksByAssignee(id, format))
  }

  const handlePreview = () => {
    const id = resolveAssigneeId()
    if (id == null) return
    onPreview(id)
  }

  return (
    <div className="report-form upzit-report-form" data-testid="upzit-report-form-assignee">
      <label className="upzit-field">
        Исполнитель
        <select
          value={assigneeId}
          onChange={e => setAssigneeId(e.target.value)}
          data-testid="upzit-report-select-assignee"
        >
          <option value="">— Выберите —</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>
              {u.fullName}
            </option>
          ))}
        </select>
      </label>
      <label className="upzit-field">
        Формат файла
        <select
          value={format}
          onChange={e => setFormat(e.target.value as 'xlsx' | 'docx' | 'pdf')}
          data-testid="upzit-report-select-assignee-format"
        >
          <option value="xlsx">Excel</option>
          <option value="docx">Word</option>
          <option value="pdf">PDF</option>
        </select>
      </label>
      <div className="report-form-actions">
        <button
          type="button"
          className="report-btn-secondary"
          disabled={previewLoading}
          onClick={handlePreview}
          data-testid="upzit-report-assignee-preview"
        >
          {previewLoading ? 'Загрузка…' : 'Показать в приложении'}
        </button>
        <button type="button" onClick={handleDownload} data-testid="upzit-report-assignee-download">
          Скачать
        </button>
      </div>
    </div>
  )
}

function TeamWorkloadForm({
  sprints,
  onDownload,
  onPreview,
  previewLoading,
}: {
  sprints: Sprint[]
  onDownload: (path: string) => void
  onPreview: (sprintId: string) => void
  previewLoading: boolean
}) {
  const [sprintId, setSprintId] = useState('')
  const [format, setFormat] = useState<'xlsx' | 'docx'>('xlsx')

  const handleDownload = () => {
    onDownload(endpoints.reports.teamAssigneeWorkload(format, sprintId || undefined))
  }

  return (
    <div className="report-form upzit-report-form" data-testid="upzit-report-form-team-workload">
      <label className="upzit-field">
        Спринт (необязательно)
        <select
          value={sprintId}
          onChange={e => setSprintId(e.target.value)}
          data-testid="upzit-report-select-sprint-filter"
        >
          <option value="">Все</option>
          {sprints.map(s => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className="upzit-field">
        Формат файла
        <select
          value={format}
          onChange={e => setFormat(e.target.value as 'xlsx' | 'docx')}
          data-testid="upzit-report-select-team-format"
        >
          <option value="xlsx">Excel</option>
          <option value="docx">Word</option>
        </select>
      </label>
      <div className="report-form-actions">
        <button
          type="button"
          className="report-btn-secondary"
          disabled={previewLoading}
          onClick={() => onPreview(sprintId)}
          data-testid="upzit-report-team-workload-preview"
        >
          {previewLoading ? 'Загрузка…' : 'Показать в приложении'}
        </button>
        <button type="button" onClick={handleDownload} data-testid="upzit-report-team-workload-download">
          Скачать
        </button>
      </div>
    </div>
  )
}
