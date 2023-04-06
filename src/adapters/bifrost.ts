import { Storage } from "@acala-network/sdk/utils/storage";
import { AnyApi, FixedPointNumber as FN } from "@acala-network/sdk-core";
import { combineLatest, map, Observable } from "rxjs";

import { SubmittableExtrinsic } from "@polkadot/api/types";
import { ISubmittableResult } from "@polkadot/types/types";

import { BalanceAdapter, BalanceAdapterConfigs } from "../balance-adapter";
import { BaseCrossChainAdapter } from "../base-chain-adapter";
import { ChainId, chains } from "../configs";
import { ApiNotFound, TokenNotFound } from "../errors";
import { isChainEqual } from "../utils/is-chain-equal";
import {
  xTokensTransferToStatemine,
  xTokensTransferToOtherChain,
  xTokensTransferToReleayChain,
  xTokensTransferToEVMChain,
} from "../utils/transfers/xTokensUtils";
import {
  BalanceData,
  BasicToken,
  RouteConfigs,
  TransferParams,
} from "../types";

const DEST_WEIGHT = "Unlimited";

export const bifrostKusamaRoutersConfig: Omit<RouteConfigs, "from">[] = [
  {
    to: "karura",
    token: "BNC",
    xcm: {
      fee: { token: "BNC", amount: "5120000000" },
      weightLimit: DEST_WEIGHT,
    },
  },
  {
    to: "karura",
    token: "VSKSM",
    xcm: {
      fee: { token: "VSKSM", amount: "64000000" },
      weightLimit: DEST_WEIGHT,
    },
  },
  {
    to: "karura",
    token: "KSM",
    xcm: {
      fee: { token: "KSM", amount: "64000000" },
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
      fee: { token: "KUSD", amount: "10011896008" },
      weightLimit: DEST_WEIGHT,
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
    to: "moonriver",
    token: "BNC",
    xcm: {
      fee: {
        token: "BNC",
        amount: "105081753604.304",
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
    to: "moonriver",
    token: "KSM",
    xcm: {
      fee: {
        token: "KSM",
        amount: "409165302.7816",
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
        amount: "101577722.4524",
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
        amount: "39651778084.8584",
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
];

export const bifrostKusamaTokensConfig: Record<string, BasicToken> = {
  BNC: { name: "BNC", symbol: "BNC", decimals: 12, ed: "10000000000" },
  VSKSM: { name: "VSKSM", symbol: "VSKSM", decimals: 12, ed: "100000000" },
  KSM: { name: "KSM", symbol: "KSM", decimals: 12, ed: "100000000" },
  KAR: { name: "KAR", symbol: "KAR", decimals: 12, ed: "148000000" },
  KUSD: { name: "KUSD", symbol: "KUSD", decimals: 12, ed: "100000000" },
  MOVR: {
    name: "MOVR",
    symbol: "MOVR",
    decimals: 18,
  },
};

export const bifrostPolkadotRoutersConfig: Omit<RouteConfigs, "from">[] = [
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
    to: "moonbeam",
    token: "DOT",
    xcm: {
      fee: {
        token: "DOT",
        amount: "26455026.4544",
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

export const bifrostPolkadotTokensConfig: Record<string, BasicToken> = {
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
};

const SUPPORTED_TOKENS: Record<string, Record<string, unknown>> = {
  bifrostKusama: {
    KUSD: { Stable: "KUSD" },
    AUSD: { Stable: "AUSD" },
    BNC: { Native: "BNC" },
    VSKSM: { VSToken: "KSM" },
    KSM: { Token: "KSM" },
    KAR: { Token: "KAR" },
    MOVR: { Token: "MOVR" },
  },
  bifrostPolkadot: {
    GLMRL: { Token: "GLMR" },
    DOT: { Token: "DOT" },
  },
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const createBalanceStorages = (api: AnyApi) => {
  return {
    balances: (address: string) =>
      Storage.create<any>({
        api,
        path: "query.system.account",
        params: [address],
      }),
    assets: (address: string, token: unknown) =>
      Storage.create<any>({
        api,
        path: "query.tokens.accounts",
        params: [address, token],
      }),
  };
};

class BifrostBalanceAdapter extends BalanceAdapter {
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
        map(({ data }) => ({
          free: FN.fromInner(data.free.toString(), this.decimals),
          locked: FN.fromInner(data.miscFrozen.toString(), this.decimals),
          reserved: FN.fromInner(data.reserved.toString(), this.decimals),
          available: FN.fromInner(
            data.free.sub(data.miscFrozen).toString(),
            this.decimals
          ),
        }))
      );
    }

    const tokenId = SUPPORTED_TOKENS[chainId || "bifrostKusama"][token];

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

class BaseBifrostAdapter extends BaseCrossChainAdapter {
  private balanceAdapter?: BifrostBalanceAdapter;

  public async init(api: AnyApi) {
    this.api = api;

    await api.isReady;

    this.balanceAdapter = new BifrostBalanceAdapter({
      chain: this.chain.id as ChainId,
      api,
      tokens: bifrostKusamaTokensConfig,
    });
  }

  public subscribeTokenBalance(
    token: string,
    address: string,
    chainId?: ChainId
  ): Observable<BalanceData> {
    if (!this.balanceAdapter) {
      throw new ApiNotFound(this.chain.id);
    }

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
        .subscribeBalance(token, address, this.chain.id)
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

    const tokenId = SUPPORTED_TOKENS[chainId][token];

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

export class BifrostKusamaAdapter extends BaseBifrostAdapter {
  constructor() {
    super(
      chains.bifrostKusama,
      bifrostKusamaRoutersConfig,
      bifrostKusamaTokensConfig
    );
  }
}

export class BifrostPolkadotAdapter extends BaseBifrostAdapter {
  constructor() {
    super(
      chains.bifrostPolkadot,
      bifrostPolkadotRoutersConfig,
      bifrostKusamaTokensConfig
    );
  }
}
