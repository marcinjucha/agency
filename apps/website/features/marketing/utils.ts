import type { LandingBlock } from '@agency/database'

export function findBlock<T extends LandingBlock>(blocks: LandingBlock[], type: T['type']): T | undefined {
  return blocks.find((b) => b.type === type) as T | undefined
}

export function hasNewBlockTypes(blocks: LandingBlock[]): boolean {
  const requiredTypes = ['identification', 'process', 'results']
  return requiredTypes.every((type) => blocks.some((b) => b.type === type))
}
