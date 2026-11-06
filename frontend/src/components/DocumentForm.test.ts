import { fireEvent, screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import DocumentForm from './DocumentForm.vue'
import type { DocumentItem } from '@/lib/types'
import { mockApi, renderWithPlugins } from '@/test/utils'

const fillRequired = async () => {
  await userEvent.type(screen.getByLabelText('Başlık'), 'Kira Sözleşmesi')
  await fireEvent.update(screen.getByLabelText('Son imza tarihi'), '2030-01-15')
}

describe('DocumentForm (create)', () => {
  it('requires at least one signer', async () => {
    const api = mockApi()
    renderWithPlugins(DocumentForm)
    await fillRequired()
    await userEvent.click(screen.getByRole('button', { name: 'Belgeyi Oluştur ve Gönder' }))

    expect(screen.getByRole('alert')).toHaveTextContent('En az bir imzacı ekleyin.')
    expect(api.history.post).toHaveLength(0)
  })

  it('rejects a non-PDF file', async () => {
    renderWithPlugins(DocumentForm)
    const image = new File(['x'], 'foto.png', { type: 'image/png' })
    await userEvent.upload(screen.getByTestId('pdf-input'), image, { applyAccept: false })

    expect(screen.getByRole('alert')).toHaveTextContent('Yalnızca PDF dosyası seçebilirsiniz.')
  })

  it('creates the document, uploads the PDF and opens it', async () => {
    const api = mockApi()
    api.onPost('/documents').reply(201, { document: { id: 'new1' } })
    api.onPut('/documents/new1/file').reply(200, { id: 'new1' })
    const { push } = renderWithPlugins(DocumentForm)

    await fillRequired()
    await userEvent.type(screen.getByLabelText('İçerik (her satır bir madde)'), 'Madde 1{enter}{enter}Madde 2')
    await userEvent.type(screen.getByLabelText('İmzacılar 1'), 'ayse@demo.com')
    const pdf = new File(['%PDF-1.7'], 'kira.pdf', { type: 'application/pdf' })
    await userEvent.upload(screen.getByTestId('pdf-input'), pdf)
    expect(screen.getByText('kira.pdf')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Belgeyi Oluştur ve Gönder' }))

    await waitFor(() => expect(push).toHaveBeenCalledWith('/documents/new1'))
    expect(JSON.parse(api.history.post[0]!.data)).toMatchObject({
      title: 'Kira Sözleşmesi',
      dueDate: '2030-01-15',
      content: ['Madde 1', 'Madde 2'], // empty lines are dropped
      signers: ['ayse@demo.com'],
    })
    expect(api.history.put[0]!.data).toBe(pdf)
  })

  it('adds, reorders and removes signers', async () => {
    const api = mockApi()
    api.onPost('/documents').reply(201, { document: { id: 'new2' } })
    renderWithPlugins(DocumentForm)

    await fillRequired()
    await userEvent.type(screen.getByLabelText('İmzacılar 1'), 'a@demo.com')
    await userEvent.click(screen.getByRole('button', { name: '+ İmzacı ekle' }))
    await userEvent.type(screen.getByLabelText('İmzacılar 2'), 'b@demo.com')
    await userEvent.click(screen.getAllByRole('button', { name: 'Yukarı taşı' })[1]!) // b goes first
    await userEvent.click(screen.getByRole('button', { name: '+ İmzacı ekle' }))
    await userEvent.click(screen.getAllByRole('button', { name: 'Kaldır' })[2]!) // drop the empty third row
    await userEvent.click(screen.getByRole('button', { name: 'Belgeyi Oluştur ve Gönder' }))

    await waitFor(() => expect(api.history.post).toHaveLength(1))
    expect(JSON.parse(api.history.post[0]!.data).signers).toEqual(['b@demo.com', 'a@demo.com'])
  })
})

describe('DocumentForm (edit)', () => {
  const doc: DocumentItem = {
    id: 'd1',
    title: 'Eski Başlık',
    description: '',
    sender: 'Ben',
    senderId: 'me',
    createdAt: '2026-11-01T10:00:00Z',
    dueDate: '2026-12-01T00:00:00Z',
    pages: 2,
    status: 'pending',
    content: ['Paragraf'],
    file: { name: 'eski.pdf', size: 1000, sha256: 'x' },
    editable: true,
    signers: [{ id: 's1', name: 'Ayşe', title: '', email: 'ayse@demo.com', status: 'waiting' }],
  }

  it('saves changes, removes the PDF and keeps signers read-only', async () => {
    const api = mockApi()
    api.onPut('/documents/d1').reply(200, {})
    api.onDelete('/documents/d1/file').reply(200, {})
    const { push } = renderWithPlugins(DocumentForm, { initial: doc })

    expect(screen.getByLabelText('Başlık')).toHaveValue('Eski Başlık')
    expect(screen.getByText('İmzacılar belge oluşturulduktan sonra değiştirilemez.')).toBeInTheDocument()
    expect(screen.queryByLabelText('İmzacılar 1')).not.toBeInTheDocument()

    await userEvent.clear(screen.getByLabelText('Başlık'))
    await userEvent.type(screen.getByLabelText('Başlık'), 'Yeni Başlık')
    await userEvent.click(screen.getByRole('button', { name: 'Kaldır' }))
    await userEvent.click(screen.getByRole('button', { name: 'Değişiklikleri Kaydet' }))

    await waitFor(() => expect(push).toHaveBeenCalledWith('/documents/d1'))
    expect(JSON.parse(api.history.put[0]!.data)).toMatchObject({ title: 'Yeni Başlık' })
    expect(api.history.delete).toHaveLength(1)
  })
})
