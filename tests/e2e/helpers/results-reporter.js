import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'

const RESULTS_FILE = resolve('test-results', 'test-results.json')

class ResultsReporter {
  constructor(options) {
    this.run = null
  }

  onBegin(config, suite) {
    const existing = existsSync(RESULTS_FILE)
      ? JSON.parse(readFileSync(RESULTS_FILE, 'utf-8'))
      : { runs: [] }

    this.run = {
      startedAt: new Date().toISOString(),
      completedAt: null,
      passed: 0,
      failed: 0,
      skipped: 0,
      timedOut: 0,
      duration: 0,
      tests: []
    }
    existing.runs.push(this.run)
    this._write(existing)
  }

  onTestEnd(test, result) {
    const status = result.status
    this.run.tests.push({
      id: test.title.match(/^([A-Z]+-\d+)/)?.[1] || null,
      title: test.title,
      file: test.location.file.split(/[/\\]/).pop(),
      line: test.location.line,
      status,
      durationMs: result.duration
    })
    if (status === 'passed') this.run.passed++
    else if (status === 'failed') this.run.failed++
    else if (status === 'skipped') this.run.skipped++
    else if (status === 'timedOut') this.run.timedOut++

    this.run.duration += result.duration

    const existing = JSON.parse(readFileSync(RESULTS_FILE, 'utf-8'))
    existing.runs[existing.runs.length - 1] = this.run
    this._write(existing)
  }

  onEnd(result) {
    this.run.total = this.run.tests.length
    this.run.completedAt = new Date().toISOString()
    const existing = JSON.parse(readFileSync(RESULTS_FILE, 'utf-8'))
    existing.runs[existing.runs.length - 1] = this.run
    this._write(existing)
  }

  _write(data) {
    const dir = dirname(RESULTS_FILE)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(RESULTS_FILE, JSON.stringify(data, null, 2), 'utf-8')
  }
}

export default ResultsReporter
