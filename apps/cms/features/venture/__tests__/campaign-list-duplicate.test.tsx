import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { messages } from '@/lib/messages'

const navigate = vi.fn()
// A full stub, NOT importOriginal: the real module needs a RouterProvider and
// blows up on `isServer` outside one.
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ navigate }),
  useNavigate: () => navigate,
  useSearch: () => ({}),
  useLocation: () => ({ pathname: '/' }),
  useRouterState: () => '/',
  Link: ({ children }: { children: unknown }) => children,
}))

vi.mock('../admin', () => ({
  duplicateCampaignFn: vi.fn(),
  listCampaignsFn: vi.fn(),
  listClientsFn: vi.fn(),
}))
// Not under test; it renders a Radix portal that the jsdom setup does not need.
vi.mock('../components/DuplicateCampaignDialog', () => ({
  DuplicateCampaignDialog: ({ campaign }: { campaign: { id: string } | null }) =>
    campaign ? <div data-testid="dialog">{campaign.id}</div> : null,
}))

import { VentureCampaignList } from '../components/VentureCampaignList'

const campaign = {
  id: 'camp-1',
  client_id: 'client-1',
  slug: 'warsztaty',
  display_name: 'Warsztaty',
  published: true,
} as never

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useQuery).mockImplementation(
    (opts: never) =>
      ({
        // clients query resolves first in the component; both shapes are arrays.
        data: (opts as { queryKey: unknown[] }).queryKey.includes('clients')
          ? [{ id: 'client-1', name: 'Kacper' }]
          : [campaign],
        isLoading: false,
        error: null,
      }) as never,
  )
  vi.mocked(useMutation).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  } as never)
})

describe('VentureCampaignList — duplicate action', () => {
  it('opens the confirmation instead of duplicating straight away', () => {
    render(<VentureCampaignList />)
    fireEvent.click(screen.getByLabelText(messages.venture.duplicateAction))

    // The contract dialog is the point — no silent copy.
    expect(screen.getByTestId('dialog')).toHaveProperty('textContent', 'camp-1')
  })

  it('does not let the card swallow Enter aimed at the action button', () => {
    render(<VentureCampaignList />)
    const button = screen.getByLabelText(messages.venture.duplicateAction)
    // Bubbles to the card's onKeyDown. Without the target guard the card would
    // preventDefault() the button's native click-on-Enter and navigate instead.
    fireEvent.keyDown(button, { key: 'Enter', bubbles: true })

    expect(navigate).not.toHaveBeenCalled()
  })

  it('does not navigate the card when the action is clicked', () => {
    render(<VentureCampaignList />)
    fireEvent.click(screen.getByLabelText(messages.venture.duplicateAction))

    expect(navigate).not.toHaveBeenCalled()
  })
})
