import { screen } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import ProfileView from './ProfileView.vue'
import { mockApi, renderWithPlugins } from '@/test/utils'

const user = {
  _id: 'u1',
  name: 'Ayşe Yılmaz',
  email: 'ayse@demo.com',
  title: 'Genel Müdür',
  phone: '5551234567',
  address: { city: 'Ankara', district: 'Çankaya', postalCode: '06000', detail: '' },
  role: 'user',
}

describe('ProfileView', () => {
  it('updates every profile field, including the job title', async () => {
    const api = mockApi()
    api.onGet('/users/profile').reply(200, { user })
    api.onPut('/users/profile').reply(200, { message: 'Profil güncellendi.', user: { ...user, title: 'CTO' } })
    renderWithPlugins(ProfileView)

    const title = await screen.findByLabelText('Unvan')
    expect(title).toHaveValue('Genel Müdür')
    await userEvent.clear(title)
    await userEvent.type(title, 'CTO')
    await userEvent.click(screen.getByRole('button', { name: 'Kaydet' }))

    expect(await screen.findByText('Profil güncellendi.')).toBeInTheDocument()
    const body = JSON.parse(api.history.put[0]!.data)
    expect(body).toEqual({
      name: 'Ayşe Yılmaz',
      title: 'CTO',
      email: 'ayse@demo.com',
      phone: '5551234567',
      address: { city: 'Ankara', district: 'Çankaya', postalCode: '06000', detail: '' },
    })
    // no password fields unless the user is changing it; role is never sent
    expect(body).not.toHaveProperty('newPassword')
    expect(body).not.toHaveProperty('role')
  })

  it('changes the password only with the current password and a matching confirmation', async () => {
    const api = mockApi()
    api.onGet('/users/profile').reply(200, { user })
    api.onPut('/users/profile').reply(200, { message: 'Profil güncellendi.', user })
    renderWithPlugins(ProfileView)

    await userEvent.type(await screen.findByLabelText('Yeni şifre'), 'YeniSifre123')
    await userEvent.click(screen.getByRole('button', { name: 'Kaydet' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Şifrenizi değiştirmek için mevcut şifrenizi girin.')

    await userEvent.type(screen.getByLabelText('Mevcut şifre'), 'EskiSifre123')
    await userEvent.type(screen.getByLabelText('Yeni şifre (tekrar)'), 'Farkli123')
    await userEvent.click(screen.getByRole('button', { name: 'Kaydet' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Şifreler eşleşmiyor.')
    expect(api.history.put).toHaveLength(0)

    await userEvent.clear(screen.getByLabelText('Yeni şifre (tekrar)'))
    await userEvent.type(screen.getByLabelText('Yeni şifre (tekrar)'), 'YeniSifre123')
    await userEvent.click(screen.getByRole('button', { name: 'Kaydet' }))

    expect(await screen.findByText('Profil güncellendi.')).toBeInTheDocument()
    expect(JSON.parse(api.history.put[0]!.data)).toMatchObject({
      currentPassword: 'EskiSifre123',
      newPassword: 'YeniSifre123',
    })
    expect(screen.getByLabelText('Yeni şifre')).toHaveValue('') // cleared after saving
  })
})
