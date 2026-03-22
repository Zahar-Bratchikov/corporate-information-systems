import { describe, it, expect } from 'vitest'
import { endpoints } from './endpoints'

describe('endpoints', () => {
  it('authentication.signIn points to login API', () => {
    expect(endpoints.authentication.signIn).toBe('/api/authentication/login')
  })

  it('projects.byId interpolates id', () => {
    expect(endpoints.projects.byId(7)).toBe('/api/projects/7')
  })

  it('tasks.list builds optional projectId query', () => {
    expect(endpoints.tasks.list()).toBe('/api/tasks')
    expect(endpoints.tasks.list({ projectId: 3 })).toBe('/api/tasks?projectId=3')
  })

  it('referenceData uses semantic prefix', () => {
    expect(endpoints.referenceData.taskTypes).toBe('/api/reference-data/task-types')
    expect(endpoints.referenceData.usersForSelect).toBe('/api/reference-data/users')
  })

  it('reports.tasksByAssignee includes assignee and format', () => {
    expect(endpoints.reports.tasksByAssignee(5, 'pdf')).toBe(
      '/api/reports/tasks-by-assignee?assigneeId=5&format=pdf'
    )
  })

  it('reports.teamAssigneeWorkload adds sprintId when set', () => {
    expect(endpoints.reports.teamAssigneeWorkload('xlsx')).toBe(
      '/api/reports/team-assignee-workload?format=xlsx'
    )
    expect(endpoints.reports.teamAssigneeWorkload('docx', '12')).toBe(
      '/api/reports/team-assignee-workload?format=docx&sprintId=12'
    )
  })
})
