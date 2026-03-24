import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { api, apiBlob } from '../api'
import { endpoints } from '../api/endpoints'
import { useAuth } from '../AuthContext'
import './Crud.css'
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

type ReportPreviewModal =
  | { kind: 'closed' }
  | { kind: 'it-summary'; data: ItProjectsSummaryPreview }
  | { kind: 'assignee'; data: AssigneeTasksPreview }
  | { kind: 'overdue'; data: OverdueTasksPreview }
  | { kind: 'team'; data: TeamWorkloadPreview }
  | { kind: 'status'; data: ProjectStatusesPreview }

const modalTitles: Record<Exclude<ReportPreviewModal['kind'], 'closed'>, string> = {
  'it-summary': 'Сводный отчёт по IT-проектам',
  assignee: 'Отчёт по задачам исполнителя',
  overdue: 'Просроченные задачи',
  team: 'Сводка по загрузке команды',
  status: 'Статусы IT-проектов',
}

export default function Reports() {
  const { user } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [loading, setLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [previewModal, setPreviewModal] = useState<ReportPreviewModal>({ kind: 'closed' })

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

  useEffect(() => {
    if (previewModal.kind === 'closed') return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewModal({ kind: 'closed' })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [previewModal.kind])

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

  const closePreviewModal = () => setPreviewModal({ kind: 'closed' })

  const loadPreview = async <T,>(
    key: string,
    url: string,
    open: (data: T) => ReportPreviewModal
  ) => {
    setPreviewLoading(key)
    setMessage('')
    const res = await api<T>(url)
    setPreviewLoading(null)
    if (res.error) {
      setMessage(res.error)
      return
    }
    if (res.data != null) setPreviewModal(open(res.data))
  }

  const modalKind = previewModal.kind
  const modalTitle = modalKind !== 'closed' ? modalTitles[modalKind] : ''

  return (
    <div className="reports upzit-page upzit-page--reports" data-testid="upzit-reports-page">
      <h1 className="upzit-page-title">Отчёты</h1>
      <p className="reports-intro">
        Данные для каждого отчёта можно <strong>посмотреть в модальном окне</strong> (кнопка «Показать в приложении») или выгрузить в файл — набор полей совпадает с экспортом. Скрыть превью: кнопка «Скрыть превью» в блоке отчёта, пока окно открыто; в шапке модального окна — «Скрыть»; клик по затемнению вокруг окна; клавиша Esc.
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
            onClick={() =>
              void loadPreview('it-summary', endpoints.reports.previews.itProjectsSummary, d => ({
                kind: 'it-summary',
                data: d as ItProjectsSummaryPreview,
              }))
            }
            data-testid="upzit-report-preview-it-projects-summary"
          >
            {previewLoading === 'it-summary' ? 'Загрузка…' : 'Показать в приложении'}
          </button>
          {previewModal.kind === 'it-summary' && (
            <button
              type="button"
              className="report-btn-hide-preview"
              onClick={closePreviewModal}
              data-testid="upzit-report-hide-preview-it-projects-summary"
            >
              Скрыть превью
            </button>
          )}
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
      </section>

      <section className="report-block upzit-report-block" data-testid="upzit-report-block-tasks-by-assignee">
        <h2>2. Отчёт по задачам исполнителя</h2>
        <p>Список задач выбранного исполнителя с итогами: всего, в работе, выполнено, доля выполненных.</p>
        <AssigneeReportForm
          users={users}
          onDownload={download}
          currentUserId={user?.userId}
          previewLoading={previewLoading === 'assignee'}
          previewVisible={previewModal.kind === 'assignee'}
          onHidePreview={closePreviewModal}
          onPreview={assigneeId =>
            void loadPreview(
              'assignee',
              endpoints.reports.previews.tasksByAssignee(assigneeId),
              d => ({ kind: 'assignee', data: d as AssigneeTasksPreview })
            )
          }
        />
      </section>

      <section className="report-block upzit-report-block" data-testid="upzit-report-block-overdue-tasks">
        <h2>3. Просроченные задачи</h2>
        <p>Задачи с просроченным сроком, количество дней просрочки, сводка по проектам.</p>
        <div className="report-actions-row upzit-report-actions-row">
          <button
            type="button"
            className="report-btn-secondary"
            disabled={previewLoading === 'overdue'}
            onClick={() =>
              void loadPreview('overdue', endpoints.reports.previews.overdueTasks, d => ({
                kind: 'overdue',
                data: d as OverdueTasksPreview,
              }))
            }
            data-testid="upzit-report-preview-overdue-tasks"
          >
            {previewLoading === 'overdue' ? 'Загрузка…' : 'Показать в приложении'}
          </button>
          {previewModal.kind === 'overdue' && (
            <button
              type="button"
              className="report-btn-hide-preview"
              onClick={closePreviewModal}
              data-testid="upzit-report-hide-preview-overdue"
            >
              Скрыть превью
            </button>
          )}
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
      </section>

      <section className="report-block upzit-report-block" data-testid="upzit-report-block-team-workload">
        <h2>4. Сводка по загрузке команды</h2>
        <p>По каждому исполнителю: ФИО, роль; задачи по статусам; доля завершённых. Опционально — фильтр по спринту.</p>
        <TeamWorkloadForm
          sprints={sprints}
          onDownload={download}
          previewLoading={previewLoading === 'team'}
          previewVisible={previewModal.kind === 'team'}
          onHidePreview={closePreviewModal}
          onPreview={sprintId =>
            void loadPreview(
              'team',
              endpoints.reports.previews.teamAssigneeWorkload(sprintId || undefined),
              d => ({ kind: 'team', data: d as TeamWorkloadPreview })
            )
          }
        />
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
                d => ({ kind: 'status', data: d as ProjectStatusesPreview })
              )
            }
            data-testid="upzit-report-preview-it-projects-status"
          >
            {previewLoading === 'status' ? 'Загрузка…' : 'Показать в приложении'}
          </button>
          {previewModal.kind === 'status' && (
            <button
              type="button"
              className="report-btn-hide-preview"
              onClick={closePreviewModal}
              data-testid="upzit-report-hide-preview-it-projects-status"
            >
              Скрыть превью
            </button>
          )}
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
      </section>

      {previewModal.kind !== 'closed' &&
        createPortal(
          <div
            className="modal-overlay upzit-modal-overlay upzit-report-modal-overlay"
            data-testid="upzit-report-preview-modal-overlay"
            onClick={closePreviewModal}
            role="presentation"
          >
          <div
            className="modal modal-wide report-preview-modal upzit-modal upzit-report-preview-modal"
            data-testid="upzit-report-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="upzit-report-preview-modal-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="report-preview-modal-head">
              <h2 id="upzit-report-preview-modal-title" data-testid="upzit-report-preview-modal-title">
                {modalTitle}
              </h2>
              <button
                type="button"
                className="upzit-btn upzit-btn--secondary report-preview-modal-close"
                data-testid="upzit-report-preview-modal-close"
                onClick={closePreviewModal}
              >
                Скрыть
              </button>
            </div>
            <div className="report-preview-modal-body" data-testid="upzit-report-preview-modal-body">
              {previewModal.kind === 'it-summary' && (
                <div data-testid="upzit-report-preview-panel-it-projects-summary">
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
                      {previewModal.data.rows.map((row, i) => (
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
              {previewModal.kind === 'assignee' && (
                <div data-testid="upzit-report-preview-panel-assignee">
                  <p className="report-preview-caption">
                    <strong>{previewModal.data.assigneeName}</strong>
                    {previewModal.data.assigneeRole ? ` — ${previewModal.data.assigneeRole}` : ''}
                  </p>
                  <p className="report-preview-summary">
                    Всего: {previewModal.data.total}, в работе: {previewModal.data.inProgress}, выполнено:{' '}
                    {previewModal.data.completed}, доля выполненных: {previewModal.data.completedPct.toFixed(1)}%
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
                      {previewModal.data.tasks.map((t, i) => (
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
              {previewModal.kind === 'overdue' && (
                <div data-testid="upzit-report-preview-panel-overdue">
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
                      {previewModal.data.tasks.map((t, i) => (
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
                      {previewModal.data.byProject.map((b, i) => (
                        <tr key={`${b.project}-${i}`}>
                          <td>{b.project}</td>
                          <td>{b.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {previewModal.kind === 'team' && (
                <div data-testid="upzit-report-preview-panel-team">
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
                      {previewModal.data.rows.map((r, i) => (
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
              {previewModal.kind === 'status' && (
                <div data-testid="upzit-report-preview-panel-it-projects-status">
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
                      {previewModal.data.rows.map((r, i) => (
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
            </div>
          </div>
        </div>,
          document.body
        )}
    </div>
  )
}

function AssigneeReportForm({
  users,
  onDownload,
  currentUserId,
  onPreview,
  previewLoading,
  previewVisible,
  onHidePreview,
}: {
  users: User[]
  onDownload: (path: string) => void
  currentUserId?: number
  onPreview: (assigneeId: number) => void
  previewLoading: boolean
  previewVisible: boolean
  onHidePreview: () => void
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
        {previewVisible && (
          <button
            type="button"
            className="report-btn-hide-preview"
            onClick={onHidePreview}
            data-testid="upzit-report-hide-preview-assignee"
          >
            Скрыть превью
          </button>
        )}
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
  previewVisible,
  onHidePreview,
}: {
  sprints: Sprint[]
  onDownload: (path: string) => void
  onPreview: (sprintId: string) => void
  previewLoading: boolean
  previewVisible: boolean
  onHidePreview: () => void
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
        {previewVisible && (
          <button
            type="button"
            className="report-btn-hide-preview"
            onClick={onHidePreview}
            data-testid="upzit-report-hide-preview-team"
          >
            Скрыть превью
          </button>
        )}
        <button type="button" onClick={handleDownload} data-testid="upzit-report-team-workload-download">
          Скачать
        </button>
      </div>
    </div>
  )
}
