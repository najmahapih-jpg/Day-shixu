import { createPinia, type Pinia, type StoreDefinition } from 'pinia'

export const pinia = createPinia()

export function withDefaultPinia<TStore extends StoreDefinition>(
  useStore: TStore,
): TStore {
  return Object.assign(
    ((piniaInstance?: Pinia) => useStore(piniaInstance ?? pinia)) as TStore,
    useStore,
  )
}
