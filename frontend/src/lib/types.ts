export type Address = {
  city?: string
  district?: string
  postalCode?: string
  detail?: string
}

export type User = {
  _id: string
  name: string
  email: string
  title : string
  role: 'user' | 'admin'
  phone?: string
  address?: Address
}

export type SignerStatus = 'waiting' | 'signed' | 'rejected'
export type DocumentStatus = 'pending' | 'signed' | 'rejected'

export type Signer = {
  id: string
  name: string
  title: string
  email: string
  status: SignerStatus
  signedAt?: string
  method?: 'draw' | 'mobile'
  signature?: string
  note?: string
}

export type DocumentFileInfo = {
  name: string
  size: number
  sha256: string
}

export type DocumentItem = {
  id: string
  title: string
  description: string
  sender: string
  senderId: string
  createdAt: string
  dueDate: string
  pages: number
  status: DocumentStatus
  content: string[]
  file: DocumentFileInfo | null
  /** pending and nobody has signed yet: the sender may edit or delete it */
  editable: boolean
  signers: Signer[]
}

export type AuditEntry = {
  id: string
  documentId: string
  documentTitle: string
  actor: string
  action: 'created' | 'updated' | 'signed' | 'rejected'
  date: string
  note?: string
}

export const MAX_PDF_SIZE = 10 * 1024 * 1024
