import { screen } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import SignPanel from './SignPanel.vue'
import type { DocumentItem } from '@/lib/types'
import { mockApi, renderWithPlugins } from '@/test/utils'

const doc: DocumentItem = {
  id: 'doc1',
  title: 'NDA',
  description: '',
  sender: 'Ayşe',
  senderId: 'u1',
  createdAt: '2026-11-01T10:00:00Z',
  dueDate: '2026-12-01T00:00:00Z',
  pages: 1,
  status: 'pending',
  content: [],
  file: null,
  editable: true,
  signers: [{ id: 'me', name: 'Ben', title: '', email: 'ben@x.com', status: 'waiting' }],
}

describe('SignPanel', () => {
  it('enables rejecting only after a 10+ character reason', async () => {
    const api = mockApi()
    api.onPost('/documents/doc1/reject').reply(200, { document: { ...doc, status: 'rejected' } })
    const { emitted } = renderWithPlugins(SignPanel, { doc })

    await userEvent.click(screen.getByRole('tab', { name: 'Reddet' }))
    const submit = screen.getByRole('button', { name: 'Belgeyi Reddet' })
    expect(submit).toBeDisabled()

    await userEvent.type(screen.getByLabelText('Red gerekçesi'), 'kısa')
    expect(submit).toBeDisabled()

    await userEvent.type(screen.getByLabelText('Red gerekçesi'), ' ama artık yeterli')
    expect(submit).toBeEnabled()
    await userEvent.click(submit)

    expect(JSON.parse(api.history.post[0]!.data)).toEqual({ reason: 'kısa ama artık yeterli' })
    expect(emitted().done?.[0]).toEqual([expect.objectContaining({ status: 'rejected' }), 'detail.successRejected'])
  })

  it('runs the mobile signature flow: phone -> code -> sign', async () => {
    const api = mockApi()
    api.onPost('/documents/doc1/otp').reply(200, { maskedPhone: '0555 *** ** 67', demoCode: '123456' })
    api.onPost('/documents/doc1/sign').reply(200, { document: { ...doc, status: 'signed' } })
    const { emitted } = renderWithPlugins(SignPanel, { doc })

    await userEvent.click(screen.getByRole('tab', { name: 'Mobil İmza' }))
    await userEvent.type(screen.getByLabelText('Cep telefonu'), '0555 123 45 67')
    await userEvent.click(screen.getByRole('button', { name: 'Doğrulama Kodu Gönder' }))

    // leading 0 and spaces are stripped before sending
    expect(JSON.parse(api.history.post[0]!.data)).toEqual({ phone: '5551234567' })
    expect(await screen.findByText('123456')).toBeInTheDocument()

    const submit = screen.getByRole('button', { name: 'Onayla ve İmzala' })
    expect(submit).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Doğrulama kodu'), '12a3456') // letters are ignored
    expect(screen.getByLabelText('Doğrulama kodu')).toHaveValue('123456')
    await userEvent.click(submit)

    expect(JSON.parse(api.history.post[1]!.data)).toEqual({ method: 'mobile', code: '123456' })
    expect(emitted().done?.[0]).toEqual([expect.objectContaining({ status: 'signed' }), 'detail.successMobile'])
  })

  it('shows the backend error message', async () => {
    mockApi().onPost('/documents/doc1/otp').reply(422, { message: 'Geçerli bir cep telefonu numarası girin.' })
    renderWithPlugins(SignPanel, { doc })

    await userEvent.click(screen.getByRole('tab', { name: 'Mobil İmza' }))
    await userEvent.type(screen.getByLabelText('Cep telefonu'), '123')
    await userEvent.click(screen.getByRole('button', { name: 'Doğrulama Kodu Gönder' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Geçerli bir cep telefonu numarası girin.')
  })
})
