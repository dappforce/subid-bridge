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
  transferNativeToken,
  transferToRelayChain,
  transferToOtherParachains,
} from "../utils/transfers/polkadotXcm";
import {
  BalanceData,
  BasicToken,
  RouteConfigs,
  TransferParams,
} from "../types";

export const moonbeamRoutersConfig: Omit<RouteConfigs, "from">[] = [
  {
    to: "acala",
    token: "ACA",
    xcm: {
      fee: {
        token: "ACA",
        amount: "8082400000",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "parallel",
    token: "ACA",
    xcm: {
      fee: {
        token: "ACA",
        amount: "117647058823.5294",
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
        amount: "421434140.38",
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
        amount: "32226877.215",
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
        amount: "16245354.0536",
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
        amount: "2311673.7936",
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
    to: "parallel",
    token: "GLMR",
    xcm: {
      fee: {
        token: "GLMR",
        amount: "44033465433729636",
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
    to: "parallel",
    token: "PARA",
    xcm: {
      fee: {
        token: "PARA",
        amount: "1129943502824.8584",
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
        amount: "21660472.0712",
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
    to: "parallel",
    token: "INTR",
    xcm: {
      fee: {
        token: "INTR",
        amount: "6535947712.4178",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "interlay",
    token: "iBTC",
    xcm: {
      fee: {
        token: "iBTC",
        amount: "71.692",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "acala",
    token: "iBTC",
    xcm: {
      fee: {
        token: "iBTC",
        amount: "8.0824",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "parallel",
    token: "iBTC",
    xcm: {
      fee: {
        token: "iBTC",
        amount: "103.5462",
      },
      weightLimit: "Unlimited",
    },
  },
];

export const moonriverRoutersConfig: Omit<RouteConfigs, "from">[] = [
  {
    to: "karura",
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
    to: "heiko",
    token: "KAR",
    xcm: {
      fee: {
        token: "KAR",
        amount: "74074074074.0736",
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
        amount: "140191500.192",
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
        amount: "57160209.4224",
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
    to: "heiko",
    token: "KSM",
    xcm: {
      fee: {
        token: "KSM",
        amount: "486973459.9464",
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
    to: "basilisk",
    token: "KSM",
    xcm: {
      fee: {
        token: "KSM",
        amount: "101577722.4524",
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
    to: "heiko",
    token: "MOVR",
    xcm: {
      fee: {
        token: "MOVR",
        amount: "1895734597156398.18",
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
        amount: "266666666666400",
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
        amount: "80824000000000",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "karura",
    token: "BNC",
    xcm: {
      fee: {
        token: "BNC",
        amount: "20863595398.6776",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "bifrostKusama",
    token: "BNC",
    xcm: {
      fee: {
        token: "BNC",
        amount: "6465920000",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "heiko",
    token: "HKO",
    xcm: {
      fee: {
        token: "HKO",
        amount: "291545189504.373",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "karura",
    token: "HKO",
    xcm: {
      fee: {
        token: "HKO",
        amount: "8082400000",
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
    to: "kintsugi",
    token: "KINT",
    xcm: {
      fee: {
        token: "KINT",
        amount: "215530666.6616",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "karura",
    token: "KINT",
    xcm: {
      fee: {
        token: "KINT",
        amount: "215530666.6944",
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
  {
    to: "basilisk",
    token: "XRT",
    xcm: {
      fee: {
        token: "XRT",
        amount: "439646.0792",
      },
      weightLimit: "Unlimited",
    },
  },
];

export const moonbeamTokensConfig: Record<string, BasicToken> = {
  GLMR: {
    name: "GLMR",
    symbol: "GLMR",
    decimals: 18,
    ed: "100000000000000000",
  },
  ACA: { name: "ACA", symbol: "ACA", decimals: 12, ed: "100000000000" },
  AUSD: { name: "AUSD", symbol: "AUSD", decimals: 12, ed: "100000000000" },
  DOT: {
    name: "DOT",
    symbol: "DOT",
    decimals: 10,
  },
  PARA: {
    name: "PARA",
    symbol: "PARA",
    decimals: 12,
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
};

export const moonriverTokensConfig: Record<string, BasicToken> = {
  MOVR: { name: "MOVR", symbol: "MOVR", decimals: 18, ed: "1000000000000000" },
  KAR: { name: "KAR", symbol: "KAR", decimals: 12, ed: "0" },
  KUSD: { name: "KUSD", symbol: "KUSD", decimals: 12, ed: "0" },
  KSM: {
    name: "KSM",
    symbol: "KSM",
    decimals: 12,
  },
  BNC: {
    name: "BNC",
    symbol: "BNC",
    decimals: 12,
    ed: "8000000000",
  },
  HKO: {
    name: "HKO",
    symbol: "HKO",
    decimals: 12,
  },
  KINT: {
    name: "KINT",
    symbol: "KINT",
    decimals: 12,
    ed: "0",
  },
  USDT: {
    name: "USDT",
    symbol: "USDT",
    decimals: 6,
  },
  XRT: {
    name: "XRT",
    symbol: "XRT",
    decimals: 9,
  },
};

const SUPPORTED_TOKENS: Record<string, Record<string, string>> = {
  moonbeam: {
    PARA: "32615670524745285411807346420584982855",
    INTR: "101170542313601871197860408087030232491",
    IBTC: "120637696315203257380661607956669368914",
    ACA: "224821240862170613278369189818311486111",
    AUSD: "110021739665376159354538090254163045594",
  },
  moonriver: {
    KAR: "10810581592933651521121702237638664357",
    BNC: "319623561105283008236062145480775032445",
    HKO: "76100021443485661246318545281171740067",
    KINT: "175400718394635817552109270754364440562",
    USDT: "311091173110107856861649819128533077277",
    XRT: "108036400430056508975016746969135344601",
  },
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
    assets: (tokenId: string, address: string) =>
      Storage.create<any>({
        api,
        path: "query.assets.account",
        params: [tokenId, address],
      }),
  };
};

class MoonbeamBalanceAdapter extends BalanceAdapter {
  private storages: ReturnType<typeof createBalanceStorages>;

  constructor({ api, chain, tokens }: BalanceAdapterConfigs) {
    super({ api, chain, tokens });
    this.storages = createBalanceStorages(api);
  }

  public subscribeBalance(
    token: string,
    address: string,
    chainId?: ChainId
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

    const tokenId = SUPPORTED_TOKENS[chainId || ("moonbeam" as ChainId)][token];

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

class BaseMoonbeamAdapter extends BaseCrossChainAdapter {
  private balanceAdapter?: MoonbeamBalanceAdapter;

  public async init(api: AnyApi) {
    this.api = api;

    await api.isReady;

    const chain = this.chain.id as ChainId;

    this.balanceAdapter = new MoonbeamBalanceAdapter({
      chain,
      api,
      tokens: this.tokens,
    });
  }

  public subscribeTokenBalance(
    token: string,
    address: string
  ): Observable<BalanceData> {
    if (!this.balanceAdapter) {
      throw new ApiNotFound(this.chain.id);
    }

    const chainId = this.chain.id;

    return this.balanceAdapter.subscribeBalance(token, address, chainId);
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

    const chainId = this.chain.id;

    const commonProps = {
      api: this.api,
      amount,
      address,
    };

    if (token === this.balanceAdapter?.nativeToken) {
      return transferNativeToken({
        ...commonProps,
        toChain,
      });
    }

    const tokenId = SUPPORTED_TOKENS[chainId][token];

    if (isChainEqual(toChain, "polkadot")) {
      return transferToRelayChain(commonProps);
    }

    if (tokenId === undefined) {
      throw new TokenNotFound(token);
    }

    return transferToOtherParachains({
      ...commonProps,
      toChain,
    });
  }
}

export class MoonbeamAdapter extends BaseMoonbeamAdapter {
  constructor() {
    super(chains.moonbeam, moonbeamRoutersConfig, moonbeamTokensConfig);
  }
}

export class MoonriverAdapter extends BaseMoonbeamAdapter {
  constructor() {
    super(chains.moonriver, moonriverRoutersConfig, moonriverTokensConfig);
  }
}
