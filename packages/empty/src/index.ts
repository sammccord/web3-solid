import { Connector } from '@web3-solid/types'

export class Empty extends Connector {
  /** {@inheritdoc Connector.provider} */
  declare provider: undefined

  /**
   * No-op. May be called if it simplifies application code.
   */
  public activate() {
    void 0
  }
}

export const EMPTY = new Empty({
  startActivation: () => () => {},
  update: () => {},
  resetState: () => {}
})
