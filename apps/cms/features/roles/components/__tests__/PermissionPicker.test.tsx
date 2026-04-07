import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'

import { PermissionPicker } from '../PermissionPicker'
import { type PermissionKey } from '@/lib/permissions'

// ---------------------------------------------------------------------------
// Page Object
// ---------------------------------------------------------------------------

type PermissionPickerProps = {
  value?: PermissionKey[]
  onChange?: (keys: PermissionKey[]) => void
  enabledFeatures?: PermissionKey[]
  disabled?: boolean
}

class PermissionPickerPage {
  private constructor() {}

  static render(props: PermissionPickerProps = {}): PermissionPickerPage {
    const { value = [], onChange = vi.fn(), ...rest } = props
    render(<PermissionPicker value={value} onChange={onChange} {...rest} />)
    return new PermissionPickerPage()
  }

  /** All group cards rendered on screen (role="group" with aria-labelledby) */
  private getGroupCards(): HTMLElement[] {
    return screen.queryAllByRole('group').filter((el) =>
      el.getAttribute('aria-labelledby')?.endsWith('-label'),
    )
  }

  /** Find a specific group card by its visible label text */
  private findGroupCard(groupLabel: string): HTMLElement | null {
    return (
      this.getGroupCards().find((card) => {
        const labelId = card.getAttribute('aria-labelledby')!
        const labelEl = card.querySelector(`#${CSS.escape(labelId)}`)
        return labelEl?.textContent?.includes(groupLabel)
      }) ?? null
    )
  }

  isGroupVisible(groupLabel: string): boolean {
    return this.findGroupCard(groupLabel) !== null
  }

  /** Returns visible child checkbox labels within a group */
  getVisibleChildren(groupLabel: string): string[] {
    const card = this.findGroupCard(groupLabel)
    if (!card) return []

    // Children live in a nested role="group" without aria-labelledby
    const childGroups = within(card).queryAllByRole('group').filter(
      (el) => !el.getAttribute('aria-labelledby'),
    )
    if (childGroups.length === 0) return []

    const childContainer = childGroups[0]
    return within(childContainer)
      .queryAllByRole('checkbox')
      .map((cb) => {
        const id = cb.getAttribute('id')
        if (!id) return ''
        const label = card.querySelector(`label[for="${CSS.escape(id)}"]`)
        return label?.textContent?.trim() ?? ''
      })
      .filter(Boolean)
  }

  isChildVisible(childLabel: string): boolean {
    return screen.queryByText(childLabel) !== null
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PermissionPicker', () => {
  describe('child filtering by enabledFeatures', () => {
    it('shows only enabled children under a group (content.media only)', () => {
      const page = PermissionPickerPage.render({
        enabledFeatures: ['content.media', 'dashboard'] as PermissionKey[],
      })

      expect(page.getVisibleChildren('Treść')).toEqual(['Media'])
      expect(page.isChildVisible('Landing Page')).toBe(false)
      expect(page.isChildVisible('Blog')).toBe(false)
      expect(page.isChildVisible('Strony prawne')).toBe(false)
    })

    it('shows all children when parent key is in enabledFeatures', () => {
      const page = PermissionPickerPage.render({
        enabledFeatures: ['shop', 'dashboard'] as PermissionKey[],
      })

      expect(page.getVisibleChildren('Sklep')).toEqual([
        'Produkty',
        'Kategorie',
        'Marketplace',
      ])
    })

    it('shows specific system children only (split into System + Zarządzanie)', () => {
      const page = PermissionPickerPage.render({
        enabledFeatures: [
          'system.users',
          'system.roles',
          'dashboard',
        ] as PermissionKey[],
      })

      // System card should be hidden (no enabled children: email_templates, settings)
      expect(page.isGroupVisible('System')).toBe(false)

      // Zarządzanie card shows only enabled children
      expect(page.getVisibleChildren('Zarządzanie')).toEqual([
        'Użytkownicy',
        'Role',
      ])
      expect(page.isChildVisible('Szablony email')).toBe(false)
      expect(page.isChildVisible('Ustawienia')).toBe(false)
      expect(page.isChildVisible('Organizacje')).toBe(false)
    })

    it('shows all groups and children when enabledFeatures is undefined', () => {
      const page = PermissionPickerPage.render()

      expect(page.isGroupVisible('Dashboard')).toBe(true)
      expect(page.isGroupVisible('Treść')).toBe(true)
      expect(page.isGroupVisible('Sklep')).toBe(true)
      expect(page.isGroupVisible('System')).toBe(true)
      expect(page.isGroupVisible('Zarządzanie')).toBe(true)

      expect(page.isChildVisible('Media')).toBe(true)
      expect(page.isChildVisible('Blog')).toBe(true)
      expect(page.isChildVisible('Produkty')).toBe(true)
      expect(page.isChildVisible('Użytkownicy')).toBe(true)
    })

    it('always shows dashboard (alwaysGranted) with all children', () => {
      const page = PermissionPickerPage.render({
        enabledFeatures: ['content.media'] as PermissionKey[],
      })

      expect(page.isGroupVisible('Dashboard')).toBe(true)
    })
  })

  describe('system/management display split', () => {
    it('splits system group into System and Zarządzanie display cards', () => {
      const page = PermissionPickerPage.render()

      // Both cards should exist
      expect(page.isGroupVisible('System')).toBe(true)
      expect(page.isGroupVisible('Zarządzanie')).toBe(true)

      // System card has email_templates + settings
      expect(page.getVisibleChildren('System')).toEqual([
        'Szablony email',
        'Ustawienia',
      ])

      // Zarządzanie card has users + roles + tenants
      expect(page.getVisibleChildren('Zarządzanie')).toEqual([
        'Użytkownicy',
        'Role',
        'Organizacje',
      ])
    })

    it('filters System and Zarządzanie children independently by enabledFeatures', () => {
      const page = PermissionPickerPage.render({
        enabledFeatures: [
          'system.users',
          'system.settings',
          'dashboard',
        ] as PermissionKey[],
      })

      // System card shows only Ustawienia
      expect(page.getVisibleChildren('System')).toEqual(['Ustawienia'])

      // Zarządzanie card shows only Użytkownicy
      expect(page.getVisibleChildren('Zarządzanie')).toEqual(['Użytkownicy'])
    })
  })
})
