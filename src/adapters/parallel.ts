import { Storage } from "@acala-network/sdk/utils/storage";
import { AnyApi, FixedPointNumber as FN } from "@acala-network/sdk-core";
import { combineLatest, map, Observable } from "rxjs";

import { SubmittableExtrinsic } from "@polkadot/api/types";
import { DeriveBalancesAll } from "@polkadot/api-derive/balances/types";
import { ISubmittableResult } from "@polkadot/types/types";

import { BalanceAdapter, BalanceAdapterConfigs } from "../balance-adapter";
import { BaseCrossChainAdapter } from "../base-chain-adapter";
import { ChainId, chains } from "../configs";
import { ApiNotFound, TokenNotFound } from "../errors";
import { isChainEqual } from "../utils/is-chain-equal";
import {
  BalanceData,
  BasicToken,
  RouteConfigs,
  TransferParams,
} from "../types";
import {
  xTokensTransferToEVMChain,
  xTokensTransferToOtherChain,
  xTokensTransferToReleayChain,
  xTokensTransferToStatemine,
} from "../utils/transfers/xTokensUtils";

const DEST_WEIGHT = "Unlimited";

export const parallelRoutersConfig: Omit<RouteConfigs, "from">[] = [
  {
    to: "acala",
    token: "PARA",
    xcm: {
      fee: { token: "PARA", amount: "6400000000" },
      weightLimit: DEST_WEIGHT,
    },
  },
  {
    to: "acala",
    token: "ACA",
    xcm: {
      fee: { token: "ACA", amount: "6400000000" },
      weightLimit: DEST_WEIGHT,
    },
  },
  {
    to: "acala",
    token: "AUSD",
    xcm: {
      fee: { token: "AUSD", amount: "3721109059" },
      weightLimit: DEST_WEIGHT,
    },
  },
  {
    to: "acala",
    token: "LDOT",
    xcm: {
      fee: { token: "LDOT", amount: "24037893" },
      weightLimit: DEST_WEIGHT,
    },
  },
  {
    to: "moonbeam",
    token: "GLMR",
    xcm: {
      fee: {
        token: "GLMR",
        amount: "4000000000000000",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "acala",
    token: "GLMR",
    xcm: {
      fee: {
        token: "GLMR",
        amount: "8082400000000000",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "bifrostPolkadot",
    token: "GLMR",
    xcm: {
      fee: {
        token: "GLMR",
        amount: "80824000000",
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
    to: "interlay",
    token: "DOT",
    xcm: {
      fee: {
        token: "DOT",
        amount: "16245354",
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
  {
    to: "moonbeam",
    token: "ACA",
    xcm: {
      fee: {
        token: "ACA",
        amount: "92427848510",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "moonbeam",
    token: "PARA",
    xcm: {
      fee: {
        token: "PARA",
        amount: "607902735562",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "interlay",
    token: "INTR",
    xcm: {
      fee: {
        token: "INTR",
        amount: "21660472",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "acala",
    token: "INTR",
    xcm: {
      fee: {
        token: "INTR",
        amount: "80824000",
      },
      weightLimit: "Unlimited",
    },
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
    to: "interlay",
    token: "IBTC",
    xcm: {
      fee: {
        token: "IBTC",
        amount: "71",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "acala",
    token: "IBTC",
    xcm: {
      fee: {
        token: "IBTC",
        amount: "8",
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
];

export const heikoRoutersConfig: Omit<RouteConfigs, "from">[] = [
  {
    to: "karura",
    token: "HKO",
    xcm: {
      fee: { token: "HKO", amount: "6400000000" },
      weightLimit: DEST_WEIGHT,
    },
  },
  {
    to: "karura",
    token: "KAR",
    xcm: {
      fee: { token: "KAR", amount: "6400000000" },
      weightLimit: DEST_WEIGHT,
    },
  },
  {
    to: "karura",
    token: "KUSD",
    xcm: {
      fee: { token: "KUSD", amount: "8305746640" },
      weightLimit: DEST_WEIGHT,
    },
  },
  {
    to: "karura",
    token: "LKSM",
    xcm: {
      fee: { token: "LKSM", amount: "589618748" },
      weightLimit: DEST_WEIGHT,
    },
  },
  {
    to: "turing",
    token: "HKO",
    xcm: {
      fee: {
        token: "HKO",
        amount: "19200000000",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "moonriver",
    token: "HKO",
    xcm: {
      fee: {
        token: "HKO",
        amount: "150375939849",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "khala",
    token: "HKO",
    xcm: {
      fee: {
        token: "HKO",
        amount: "64000000000",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "bifrostKusama",
    token: "KAR",
    xcm: {
      fee: {
        token: "KAR",
        amount: "8082400000",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "moonriver",
    token: "KAR",
    xcm: {
      fee: {
        token: "KAR",
        amount: "39651778084",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "turing",
    token: "KAR",
    xcm: {
      fee: {
        token: "KAR",
        amount: "32000000000",
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
    to: "kintsugi",
    token: "KSM",
    xcm: {
      fee: {
        token: "KSM",
        amount: "161648000",
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
  {
    to: "moonriver",
    token: "MOVR",
    xcm: {
      fee: {
        token: "MOVR",
        amount: "40000000000000",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "bifrostKusama",
    token: "MOVR",
    xcm: {
      fee: {
        token: "MOVR",
        amount: "215800080000000",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "karura",
    token: "MOVR",
    xcm: {
      fee: {
        token: "MOVR",
        amount: "101030000000000000",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "khala",
    token: "MOVR",
    xcm: {
      fee: {
        token: "MOVR",
        amount: "80824000000000",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "statemine",
    token: "USDT",
    xcm: {
      fee: {
        token: "USDT",
        amount: "1366",
      },
      weightLimit: "Unlimited",
    },
  },
];

export const parallelTokensConfig: Record<
  string,
  Record<string, BasicToken>
> = {
  parallel: {
    PARA: { name: "PARA", symbol: "PARA", decimals: 12, ed: "100000000000" },
    ACA: { name: "ACA", symbol: "ACA", decimals: 12, ed: "100000000000" },
    AUSD: { name: "AUSD", symbol: "AUSD", decimals: 12, ed: "100000000000" },
    LDOT: { name: "LDOT", symbol: "LDOT", decimals: 10, ed: "500000000" },
    GLMR: {
      name: "GLMR",
      symbol: "GLMR",
      decimals: 18,
    },
    DOT: {
      name: "DOT",
      symbol: "DOT",
      decimals: 10,
    },
    INTR: {
      name: "INTR",
      symbol: "INTR",
      decimals: 10,
      ed: "0",
    },
    IBTC: {
      name: "IBTC",
      symbol: "IBTC",
      decimals: 8,
      ed: "0",
    },
  },
  heiko: {
    HKO: { name: "HKO", symbol: "HKO", decimals: 12, ed: "100000000000" },
    KAR: { name: "KAR", symbol: "KAR", decimals: 12, ed: "0" },
    KUSD: { name: "KUSD", symbol: "KUSD", decimals: 12, ed: "0" },
    LKSM: { name: "LKSM", symbol: "LKSM", decimals: 12, ed: "0" },
    KSM: {
      name: "KSM",
      symbol: "KSM",
      decimals: 12,
    },
    MOVR: {
      name: "MOVR",
      symbol: "MOVR",
      decimals: 18,
    },
    USDT: {
      name: "USDT",
      symbol: "USDT",
      decimals: 6,
    },
  },
};

const SUPPORTED_TOKENS: Record<string, number> = {
  HKO: 0,
  KAR: 107,
  KUSD: 103,
  LKSM: 109,
  PARA: 1,
  ACA: 108,
  AUSD: 104,
  LDOT: 110,
  DOT: 101,
  GLMR: 114,
  INTR: 120,
  IBTC: 122,
  KSM: 100,
  MOVR: 113,
  USDT: 102,
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const createBalanceStorages = (api: AnyApi) => {
  return {
    balances: (address: string) =>
      Storage.create<DeriveBalancesAll>({
        api,
        path: "derive.balances.all",
        params: [address],
      }),
    assets: (tokenId: number, address: string) =>
      Storage.create<any>({
        api,
        path: "query.assets.account",
        params: [tokenId, address],
      }),
  };
};

class ParallelBalanceAdapter extends BalanceAdapter {
  private storages: ReturnType<typeof createBalanceStorages>;

  constructor({ api, chain, tokens }: BalanceAdapterConfigs) {
    super({ api, chain, tokens });
    this.storages = createBalanceStorages(api);
  }

  public subscribeBalance(
    token: string,
    address: string
  ): Observable<BalanceData> {
    const storage = this.storages.balances(address);

    if (token === this.nativeToken) {
      return storage.observable.pipe(
        map((data) => ({
          free: FN.fromInner(data.freeBalance.toString(), this.decimals),
          locked: FN.fromInner(data.lockedBalance.toString(), this.decimals),
          reserved: FN.fromInner(
            data.reservedBalance.toString(),
            this.decimals
          ),
          available: FN.fromInner(
            data.availableBalance.toString(),
            this.decimals
          ),
        }))
      );
    }

    const tokenId = SUPPORTED_TOKENS[token];

    if (tokenId === undefined) {
      throw new TokenNotFound(token);
    }

    return this.storages.assets(tokenId, address).observable.pipe(
      map((balance) => {
        const amount = FN.fromInner(
          balance.unwrapOrDefault()?.balance?.toString() || "0",
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

class BaseParallelAdapter extends BaseCrossChainAdapter {
  private balanceAdapter?: ParallelBalanceAdapter;

  public async init(api: AnyApi) {
    this.api = api;

    await api.isReady;

    const chain = this.chain.id as ChainId;

    this.balanceAdapter = new ParallelBalanceAdapter({
      chain,
      api,
      tokens: parallelTokensConfig[chain],
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
        const fee = FN.fromInner(txFee, tokenMeta?.decimals).mul(
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

    if (tokenId === undefined) {
      throw new TokenNotFound(token);
    }

    if (
      isChainEqual(toChain, "moonbeam") ||
      isChainEqual(toChain, "moonriver")
    ) {
      return xTokensTransferToEVMChain({
        ...commonProps,
        token,
        to,
        getCrossChainFee: this.getCrossChainFee,
      });
    }

    if (
      isChainEqual(toChain, "statemine") ||
      isChainEqual(toChain, "statemint")
    ) {
      return xTokensTransferToStatemine({
        ...commonProps,
        token,
        to,
        getCrossChainFee: this.getCrossChainFee,
      });
    }

    return xTokensTransferToOtherChain({
      ...commonProps,
      to,
    });
  }
}

export class HeikoAdapter extends BaseParallelAdapter {
  constructor() {
    super(chains.heiko, heikoRoutersConfig, parallelTokensConfig.heiko);
  }
}

export class ParallelAdapter extends BaseParallelAdapter {
  constructor() {
    super(
      chains.parallel,
      parallelRoutersConfig,
      parallelTokensConfig.parallel
    );
  }
}
