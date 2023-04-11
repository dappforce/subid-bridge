import { Storage } from "@acala-network/sdk/utils/storage";
import { AnyApi, FixedPointNumber as FN } from "@acala-network/sdk-core";
import { combineLatest, map, Observable } from "rxjs";

import { SubmittableExtrinsic } from "@polkadot/api/types";
import { ISubmittableResult } from "@polkadot/types/types";

import { BalanceAdapter, BalanceAdapterConfigs } from "../balance-adapter";
import { BaseCrossChainAdapter } from "../base-chain-adapter";
import { ChainId, chains } from "../configs";
import { isChainEqual } from "../utils/is-chain-equal";
import {
  xTokensTransferToReleayChain,
  xTokensTransferToEVMChain,
  xTokensTransferToStatemine,
  xTokensTransferToOtherChain,
} from "../utils/transfers/xTokensUtils";
import { ApiNotFound, TokenNotFound } from "../errors";
import {
  BalanceData,
  BasicToken,
  RouteConfigs,
  TransferParams,
} from "../types";

const DEST_WEIGHT = "5000000000";

export const interlayRoutersConfig: Omit<RouteConfigs, "from">[] = [
  {
    to: "acala",
    token: "INTR",
    xcm: {
      fee: { token: "INTR", amount: "92696000" },
      weightLimit: DEST_WEIGHT,
    },
  },
  {
    to: "acala",
    token: "IBTC",
    xcm: { fee: { token: "IBTC", amount: "9" }, weightLimit: DEST_WEIGHT },
  },
  {
    to: "moonbeam",
    token: "INTR",
    xcm: {
      fee: {
        token: "INTR",
        amount: "2823423118",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "parallel",
    token: "INTR",
    xcm: {
      fee: {
        token: "INTR",
        amount: "6535947712",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "moonbeam",
    token: "IBTC",
    xcm: {
      fee: {
        token: "IBTC",
        amount: "93",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "parallel",
    token: "IBTC",
    xcm: {
      fee: {
        token: "IBTC",
        amount: "103",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "acala",
    token: "DOT",
    xcm: {
      fee: {
        token: "DOT",
        amount: "2311673",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "polkadot",
    token: "DOT",
    xcm: {
      fee: {
        token: "DOT",
        amount: "421434140",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "moonbeam",
    token: "DOT",
    xcm: {
      fee: {
        token: "DOT",
        amount: "26455026",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "parallel",
    token: "DOT",
    xcm: {
      fee: {
        token: "DOT",
        amount: "32226877",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "astar",
    token: "DOT",
    xcm: {
      fee: {
        token: "DOT",
        amount: "4000000",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "bifrostPolkadot",
    token: "DOT",
    xcm: {
      fee: {
        token: "DOT",
        amount: "8082400",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "hydra",
    token: "DOT",
    xcm: {
      fee: {
        token: "DOT",
        amount: "12000000",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "pendulum",
    token: "DOT",
    xcm: {
      fee: {
        token: "DOT",
        amount: "480000000",
      },
      weightLimit: "Unlimited",
    },
  },
];

export const kintsugiRoutersConfig: Omit<RouteConfigs, "from">[] = [
  {
    to: "karura",
    token: "KINT",
    xcm: {
      fee: { token: "KINT", amount: "170666666" },
      weightLimit: DEST_WEIGHT,
    },
  },
  {
    to: "karura",
    token: "KBTC",
    xcm: { fee: { token: "KBTC", amount: "85" }, weightLimit: DEST_WEIGHT },
  },
  {
    to: "karura",
    token: "LKSM",
    xcm: {
      fee: { token: "LKSM", amount: "647055467" },
      weightLimit: DEST_WEIGHT,
    },
  },
  {
    to: "moonriver",
    token: "KINT",
    xcm: {
      fee: {
        token: "KINT",
        amount: "9615384615",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "kusama",
    token: "KSM",
    xcm: {
      fee: {
        token: "KSM",
        amount: "140191500",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "moonriver",
    token: "KSM",
    xcm: {
      fee: {
        token: "KSM",
        amount: "409165302",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "heiko",
    token: "KSM",
    xcm: {
      fee: {
        token: "KSM",
        amount: "486973459",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "karura",
    token: "KSM",
    xcm: {
      fee: {
        token: "KSM",
        amount: "57160209",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "bifrostKusama",
    token: "KSM",
    xcm: {
      fee: {
        token: "KSM",
        amount: "80824000",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "mangata",
    token: "KSM",
    xcm: {
      fee: {
        token: "KSM",
        amount: "527700000",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "basilisk",
    token: "KSM",
    xcm: {
      fee: {
        token: "KSM",
        amount: "101577722",
      },
      weightLimit: "Unlimited",
    },
  },
];

export const interlayTokensConfig: Record<
  string,
  Record<string, BasicToken>
> = {
  interlay: {
    INTR: { name: "INTR", symbol: "INTR", decimals: 10, ed: "0" },
    IBTC: { name: "IBTC", symbol: "IBTC", decimals: 8, ed: "0" },
    DOT: {
      name: "DOT",
      symbol: "DOT",
      decimals: 10,
      ed: "500000000",
    },
  },
  kintsugi: {
    KINT: { name: "KINT", symbol: "KINT", decimals: 12, ed: "0" },
    KBTC: { name: "KBTC", symbol: "KBTC", decimals: 8, ed: "0" },
    LKSM: { name: "LKSM", symbol: "LKSM", decimals: 12, ed: "0" },
    KSM: {
      name: "KSM",
      symbol: "KSM",
      decimals: 12,
    },
  },
};

const SUPPORTED_TOKENS: Record<string, unknown> = {
  KINT: { Token: "KINT" },
  KBTC: { Token: "KBTC" },
  INTR: { Token: "INTR" },
  IBTC: { Token: "IBTC" },
  LKSM: { ForeignAsset: 2 },
  DOT: { Token: "DOT" },
  KSM: { Token: "KSM" },
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const createBalanceStorages = (api: AnyApi) => {
  return {
    assets: (address: string, token: unknown) =>
      Storage.create<any>({
        api,
        path: "query.tokens.accounts",
        params: [address, token],
      }),
  };
};

class InterlayBalanceAdapter extends BalanceAdapter {
  private storages: ReturnType<typeof createBalanceStorages>;

  constructor({ api, chain, tokens }: BalanceAdapterConfigs) {
    super({ api, chain, tokens });
    this.storages = createBalanceStorages(api);
  }

  public subscribeBalance(
    token: string,
    address: string
  ): Observable<BalanceData> {
    const tokenId = SUPPORTED_TOKENS[token];

    if (tokenId === undefined) {
      throw new TokenNotFound(token);
    }

    return this.storages.assets(address, tokenId).observable.pipe(
      map((balance) => {
        const amount = FN.fromInner(
          balance.free?.toString() || "0",
          this.getToken(token).decimals
        );

        return {
          free: amount,
          locked: new FN(0),
          reserved: new FN(0),
          available: amount,
        };
      })
    );
  }
}

class BaseInterlayAdapter extends BaseCrossChainAdapter {
  private balanceAdapter?: InterlayBalanceAdapter;

  public async init(api: AnyApi) {
    this.api = api;

    await api.isReady;

    const chain = this.chain.id as ChainId;

    this.balanceAdapter = new InterlayBalanceAdapter({
      chain,
      api,
      tokens: interlayTokensConfig[chain],
    });
  }

  public subscribeTokenBalance(
    token: string,
    address: string
  ): Observable<BalanceData> {
    if (!this.balanceAdapter) {
      throw new ApiNotFound(this.chain.id);
    }

    return this.balanceAdapter.subscribeBalance(token, address);
  }

  public subscribeMaxInput(
    token: string,
    address: string,
    to: ChainId
  ): Observable<FN> {
    if (!this.balanceAdapter) {
      throw new ApiNotFound(this.chain.id);
    }

    return combineLatest({
      txFee:
        token === this.balanceAdapter?.nativeToken
          ? this.estimateTxFee({
              amount: FN.ZERO,
              to,
              token,
              address,
              signer: address,
            })
          : "0",
      balance: this.balanceAdapter
        .subscribeBalance(token, address)
        .pipe(map((i) => i.available)),
    }).pipe(
      map(({ balance, txFee }) => {
        const tokenMeta = this.balanceAdapter?.getToken(token);
        const feeFactor = 1.2;
        const fee: any = FN.fromInner(txFee, tokenMeta?.decimals).mul(
          new FN(feeFactor)
        );

        // always minus ed
        return balance
          .minus(fee)
          .minus(FN.fromInner(tokenMeta?.ed || "0", tokenMeta?.decimals));
      })
    );
  }

  public createTx(
    params: TransferParams
  ):
    | SubmittableExtrinsic<"promise", ISubmittableResult>
    | SubmittableExtrinsic<"rxjs", ISubmittableResult> {
    if (this.api === undefined) {
      throw new ApiNotFound(this.chain.id);
    }

    const { address, amount, to, token } = params;
    const toChain = chains[to];
    const destFee = this.getCrossChainFee(token, to);

    const tokenId = SUPPORTED_TOKENS[token];

    if (tokenId === undefined) {
      throw new TokenNotFound(token);
    }

    const commonProps = {
      api: this.api,
      amount,
      address,
      tokenObj: tokenId,
    };

    if (isChainEqual(toChain, "polkadot") || isChainEqual(toChain, "kusama")) {
      return xTokensTransferToReleayChain({
        ...commonProps,
      });
    }

    if (
      isChainEqual(toChain, "moonbeam") ||
      isChainEqual(toChain, "moonriver")
    ) {
      return xTokensTransferToEVMChain({
        ...commonProps,
        token,
        to,
        destFee,
      });
    }

    if (
      isChainEqual(toChain, "statemine") ||
      isChainEqual(toChain, "statemint")
    ) {
      return xTokensTransferToStatemine({
        ...commonProps,
        to,
        destFee,
      });
    }

    return xTokensTransferToOtherChain({
      ...commonProps,
      to,
    });
  }
}

export class InterlayAdapter extends BaseInterlayAdapter {
  constructor() {
    super(
      chains.interlay,
      interlayRoutersConfig,
      interlayTokensConfig.interlay
    );
  }
}

export class KintsugiAdapter extends BaseInterlayAdapter {
  constructor() {
    super(
      chains.kintsugi,
      kintsugiRoutersConfig,
      interlayTokensConfig.kintsugi
    );
  }
}
