import type { TestInfo } from '@playwright/test'

/**
 * Поля тест-кейса в формате, требуемом учебным ТЗ (отчёт о тестировании).
 * Аннотации попадают в HTML-отчёт Playwright (вкладка/секция Annotations).
 */
export interface TzCaseMeta {
  /** Номер из docs/TEST_CASES.md или внутренний идентификатор */
  tcId: string
  /** Раздел отчёта: авторизация | роли | CRUD | отчёты | ошибки */
  reportSection: string
  /** Тестируемая функция / объект */
  testedFunction: string
  /** Входные данные (учётки, поля форм, запросы API) */
  inputs: string
  /** Ожидаемые результаты */
  expected: string
  /** Пояснение к сценарию (необязательно) */
  comment?: string
}

export function annotateTzCase(info: TestInfo, m: TzCaseMeta) {
  info.annotations.push(
    { type: 'ТЗ: идентификатор', description: m.tcId },
    { type: 'ТЗ: раздел отчёта', description: m.reportSection },
    { type: 'Тестируемая функция', description: m.testedFunction },
    { type: 'Входные данные', description: m.inputs },
    { type: 'Ожидаемые результаты', description: m.expected }
  )
  if (m.comment) {
    info.annotations.push({ type: 'Комментарий', description: m.comment })
  }
}

/** Вызывать после успешных проверок в конце теста */
export function annotateTzPassed(info: TestInfo) {
  info.annotations.push({
    type: 'Фактический результат',
    description:
      'Тест пройден: все проверки (assertions) выполнены. Поведение ИС соответствует ожидаемому в полях выше.',
  })
}
