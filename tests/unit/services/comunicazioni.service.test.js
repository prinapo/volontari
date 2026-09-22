import { beforeEach, describe, expect, it, vi } from 'vitest'
import { comunicazioniService } from 'src/services/comunicazioni.service'

const { apiMock } = vi.hoisted(() => ({ apiMock: { get: vi.fn(), post: vi.fn() } }))

vi.mock('src/services/api', () => ({ default: apiMock }))

describe('comunicazioniService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMock.get.mockResolvedValue({ data: { data: [] } })
    apiMock.post.mockResolvedValue({ data: {} })
  })

  it('getStoricoByContatto usa il filtro Contatto e i fields corretti', () => {
    comunicazioniService.getStoricoByContatto('X')
    const [url, config] = apiMock.get.mock.calls[0]
    expect(url).toBe('/items/Comunicazioni_Contatti')
    expect(config.params['filter[Contatto][_eq]']).toBe('X')
    expect(config.params.fields).toContain('Comunicazione.id')
    expect(config.params.fields).not.toContain('Comunicazione.Id')
  })

  it('getStoricoByFamiglia usa il filtro Famiglia', () => {
    comunicazioniService.getStoricoByFamiglia('F')
    const [, config] = apiMock.get.mock.calls[0]
    expect(config.params['filter[Famiglia][_eq]']).toBe('F')
  })

  it('countRecipients e send chiamano gli endpoint dedicati', () => {
    comunicazioniService.countRecipients({ audience: 'contatti' })
    expect(apiMock.post).toHaveBeenCalledWith('/communications/recipients', { audience: 'contatti' })

    comunicazioniService.send({ audience: 'contatti', subject: 's', body: 'b' })
    expect(apiMock.post).toHaveBeenCalledWith('/communications/send', {
      audience: 'contatti',
      subject: 's',
      body: 'b'
    })
  })
})
