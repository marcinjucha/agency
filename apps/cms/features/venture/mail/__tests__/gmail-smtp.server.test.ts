import { describe, it, expect, vi, beforeEach } from 'vitest'

const sendMailMock = vi.fn()
const createTransportMock = vi.fn(() => ({ sendMail: sendMailMock }))

vi.mock('nodemailer', () => ({
  default: {
    createTransport: (...args: unknown[]) => createTransportMock(...args),
  },
}))

import { createGmailSmtpSender } from '../gmail-smtp.server'

describe('createGmailSmtpSender', () => {
  beforeEach(() => {
    sendMailMock.mockReset()
    createTransportMock.mockClear()
  })

  it('sends via nodemailer with correct from/to/subject/html', async () => {
    sendMailMock.mockResolvedValue({ messageId: 'abc' })

    const sender = createGmailSmtpSender({
      address: 'client@gmail.com',
      appPassword: 'abcd efgh ijkl mnop',
    })

    await sender.send({
      to: 'lead@example.com',
      subject: 'Twoje bonusy',
      html: '<p>Hello</p>',
    })

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user: 'client@gmail.com', pass: 'abcd efgh ijkl mnop' },
      }),
    )
    expect(sendMailMock).toHaveBeenCalledWith({
      from: 'client@gmail.com',
      to: 'lead@example.com',
      subject: 'Twoje bonusy',
      html: '<p>Hello</p>',
    })
  })

  it('propagates errors from sendMail instead of swallowing them', async () => {
    sendMailMock.mockRejectedValue(new Error('SMTP auth failed'))

    const sender = createGmailSmtpSender({
      address: 'client@gmail.com',
      appPassword: 'bad-password',
    })

    await expect(
      sender.send({ to: 'lead@example.com', subject: 'x', html: '<p>x</p>' }),
    ).rejects.toThrow('SMTP auth failed')
  })
})
