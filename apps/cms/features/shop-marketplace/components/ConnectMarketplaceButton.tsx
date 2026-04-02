'use client'

import { useMutation } from '@tanstack/react-query'
import { Button } from '@agency/ui'
import { Loader2 } from 'lucide-react'
import { messages } from '@/lib/messages'
import { connectMarketplace } from '../actions'
import type { MarketplaceId } from '../types'

type ConnectMarketplaceButtonProps = {
  marketplace: MarketplaceId
}

export function ConnectMarketplaceButton({ marketplace }: ConnectMarketplaceButtonProps) {
  const connect = useMutation({
    mutationFn: async () => {
      const result = await connectMarketplace({ marketplace })
      if (!result.success) throw new Error(result.error ?? messages.common.unknownError)
      return result
    },
    onSuccess: (result) => {
      // External OAuth redirect -- cannot use router.push for external URLs
      window.location.href = result.data.authUrl
    },
  })

  return (
    <>
      <Button
        variant="outline"
        onClick={() => connect.mutate()}
        disabled={connect.isPending}
        className="w-full"
      >
        {connect.isPending && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
        )}
        {messages.marketplace.connectButton}
      </Button>
      {connect.error && (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {connect.error instanceof Error ? connect.error.message : messages.common.unknownError}
        </p>
      )}
    </>
  )
}
