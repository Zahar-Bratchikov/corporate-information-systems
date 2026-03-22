import { useState, useEffect } from 'react'
import { api, apiBlob } from '../api'
import { endpoints } from '../api/endpoints'
import { useAuth } from '../AuthContext'
import './Reports.css'

interface User { id: number; fullName: string; roleName: string }
interface Sprint { id: number; name: string }

export default function Reports() {
  const { user } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    (async () => {
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

  return (
    <div className="reports upzit-page upzit-page--reports" data-testid="upzit-reports-page">
      <h1 className="upzit-page-title">Отчёты</h1>
      {message && (
        <div className="reports-error upzit-reports-error" role="alert" data-testid="upzit-reports-message">
          {message}
        </div>
      )}
      {loading && (
        <div className="reports-loading upzit-reports-loading" data-testid="upzit-reports-loading">
          Формирование отчёта…
        </div>
      )}

      <section className="report-block upzit-report-block" data-testid="upzit-report-block-it-projects-summary">
        <h2>1. Сводный отчёт по IT-проектам</h2>
        <p>По каждому проекту: наименование, код, даты, ответственный; количество задач всего и по типам (фича, баг, техническая задача).</p>
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
      </section>

      <section className="report-block upzit-report-block" data-testid="upzit-report-block-tasks-by-assignee">
        <h2>2. Отчёт по задачам исполнителя</h2>
        <p>Список задач выбранного исполнителя с итогами: всего, в работе, выполнено, доля выполненных.</p>
        <AssigneeReportForm users={users} onDownload={download} currentUserId={user?.userId} />
      </section>

      <section className="report-block upzit-report-block" data-testid="upzit-report-block-overdue-tasks">
        <h2>3. Просроченные задачи</h2>
        <p>Задачи с просроченным сроком, количество дней просрочки, сводка по проектам.</p>
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
      </section>

      <section className="report-block upzit-report-block" data-testid="upzit-report-block-team-workload">
        <h2>4. Сводка по загрузке команды</h2>
        <p>По каждому исполнителю: ФИО, роль; задачи по статусам; доля завершённых. Опционально — фильтр по спринту.</p>
        <TeamWorkloadForm sprints={sprints} onDownload={download} />
      </section>

      <section className="report-block upzit-report-block" data-testid="upzit-report-block-it-projects-status">
        <h2>5. Отчёт по статусам IT-проектов</h2>
        <p>По каждому проекту: общее число задач, выполнено, в работе, просрочено, процент выполнения.</p>
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
      </section>
    </div>
  )
}

function AssigneeReportForm({ users, onDownload, currentUserId }: { users: User[]; onDownload: (path: string) => void; currentUserId?: number }) {
  const [assigneeId, setAssigneeId] = useState(currentUserId?.toString() ?? '')
  const [format, setFormat] = useState<'xlsx' | 'docx' | 'pdf'>('xlsx')

  const handleDownload = () => {
    const id = assigneeId || currentUserId || (users.find(u => u.roleName?.includes('Разработчик') || u.roleName?.includes('QA'))?.id ?? users[0]?.id)
    if (!id) return
    onDownload(endpoints.reports.tasksByAssignee(Number(id), format))
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
          {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
        </select>
      </label>
      <label className="upzit-field">
        Формат
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
      <button type="button" onClick={handleDownload} data-testid="upzit-report-assignee-download">
        Скачать
      </button>
    </div>
  )
}

function TeamWorkloadForm({ sprints, onDownload }: { sprints: Sprint[]; onDownload: (path: string) => void }) {
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
          {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      <label className="upzit-field">
        Формат
        <select
          value={format}
          onChange={e => setFormat(e.target.value as 'xlsx' | 'docx')}
          data-testid="upzit-report-select-team-format"
        >
          <option value="xlsx">Excel</option>
          <option value="docx">Word</option>
        </select>
      </label>
      <button type="button" onClick={handleDownload} data-testid="upzit-report-team-workload-download">
        Скачать
      </button>
    </div>
  )
}
