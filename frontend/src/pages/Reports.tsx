import { useState, useEffect } from 'react'
import { api, apiBlob } from '../api'
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
        api<User[]>('/api/dictionaries/users'),
        api<Sprint[]>('/api/sprints')
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
    <div className="reports">
      <h1>Отчёты</h1>
      {message && <div className="reports-error">{message}</div>}
      {loading && <div className="reports-loading">Формирование отчёта…</div>}

      <section className="report-block">
        <h2>1. Сводный отчёт по IT-проектам</h2>
        <p>По каждому проекту: наименование, код, даты, ответственный; количество задач всего и по типам (фича, баг, техническая задача).</p>
        <div className="report-actions">
          <button type="button" onClick={() => download('/api/reports/projects-summary?format=xlsx')}>Скачать Excel</button>
          <button type="button" onClick={() => download('/api/reports/projects-summary?format=pdf')}>Скачать PDF</button>
        </div>
      </section>

      <section className="report-block">
        <h2>2. Отчёт по задачам исполнителя</h2>
        <p>Список задач выбранного исполнителя с итогами: всего, в работе, выполнено, доля выполненных.</p>
        <AssigneeReportForm users={users} onDownload={download} currentUserId={user?.userId} />
      </section>

      <section className="report-block">
        <h2>3. Просроченные задачи</h2>
        <p>Задачи с просроченным сроком, количество дней просрочки, сводка по проектам.</p>
        <div className="report-actions">
          <button type="button" onClick={() => download('/api/reports/overdue-tasks?format=xlsx')}>Скачать Excel</button>
          <button type="button" onClick={() => download('/api/reports/overdue-tasks?format=pdf')}>Скачать PDF</button>
        </div>
      </section>

      <section className="report-block">
        <h2>4. Сводка по загрузке команды</h2>
        <p>По каждому исполнителю: ФИО, роль; задачи по статусам; доля завершённых. Опционально — фильтр по спринту.</p>
        <TeamWorkloadForm sprints={sprints} onDownload={download} />
      </section>

      <section className="report-block">
        <h2>5. Отчёт по статусам IT-проектов</h2>
        <p>По каждому проекту: общее число задач, выполнено, в работе, просрочено, процент выполнения.</p>
        <div className="report-actions">
          <button type="button" onClick={() => download('/api/reports/project-statuses?format=docx')}>Скачать Word</button>
          <button type="button" onClick={() => download('/api/reports/project-statuses?format=pdf')}>Скачать PDF</button>
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
    onDownload(`/api/reports/assignee-tasks?assigneeId=${id}&format=${format}`)
  }

  return (
    <div className="report-form">
      <label>Исполнитель
        <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
          <option value="">— Выберите —</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
        </select>
      </label>
      <label>Формат
        <select value={format} onChange={e => setFormat(e.target.value as 'xlsx' | 'docx' | 'pdf')}>
          <option value="xlsx">Excel</option>
          <option value="docx">Word</option>
          <option value="pdf">PDF</option>
        </select>
      </label>
      <button type="button" onClick={handleDownload}>Скачать</button>
    </div>
  )
}

function TeamWorkloadForm({ sprints, onDownload }: { sprints: Sprint[]; onDownload: (path: string) => void }) {
  const [sprintId, setSprintId] = useState('')
  const [format, setFormat] = useState<'xlsx' | 'docx'>('xlsx')

  const handleDownload = () => {
    const path = sprintId
      ? `/api/reports/team-workload?format=${format}&sprintId=${sprintId}`
      : `/api/reports/team-workload?format=${format}`
    onDownload(path)
  }

  return (
    <div className="report-form">
      <label>Спринт (необязательно)
        <select value={sprintId} onChange={e => setSprintId(e.target.value)}>
          <option value="">Все</option>
          {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      <label>Формат
        <select value={format} onChange={e => setFormat(e.target.value as 'xlsx' | 'docx')}>
          <option value="xlsx">Excel</option>
          <option value="docx">Word</option>
        </select>
      </label>
      <button type="button" onClick={handleDownload}>Скачать</button>
    </div>
  )
}
