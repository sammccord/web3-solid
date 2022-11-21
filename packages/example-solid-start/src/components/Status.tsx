import type { Web3SolidHooks } from '@web3-solid/core'

export function Status(props: {
  isActivating: ReturnType<Web3SolidHooks['useIsActivating']>
  isActive: ReturnType<Web3SolidHooks['useIsActive']>
  error?: Error
}) {
  return (
    <div>
      {props.error ? (
        <>
          🔴 {props.error.name ?? 'Error'}
          {props.error.message ? `: ${props.error.message}` : null}
        </>
      ) : props.isActivating ? (
        <>🟡 Connecting</>
      ) : props.isActive ? (
        <>🟢 Connected</>
      ) : (
        <>⚪️ Disconnected</>
      )}
    </div>
  )
}
