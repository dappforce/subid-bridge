import { Storage } from "@acala-network/sdk/utils/storage";
import { AnyApi, FixedPointNumber as FN } from "@acala-network/sdk-core";
import { combineLatest, map, Observable } from "rxjs";

import { SubmittableExtrinsic } from "@polkadot/api/types";
import { DeriveBalancesAll } from "@polkadot/api-derive/balances/types";
import { ISubmittableResult } from "@polkadot/types/types";
import { BN } from "@polkadot/util";

import { BalanceAdapter, BalanceAdapterConfigs } from "../balance-adapter";
import { BaseCrossChainAdapter } from "../base-chain-adapter";
import { ChainId, chains } from "../configs";
import { ApiNotFound, TokenNotFound } from "../errors";
import {
  BalanceData,
  BasicToken,
  RouteConfigs,
  TransferParams,
} from "../types";

export const statemineRoutersConfig: Omit<RouteConfigs, "from">[] = [
  {
    to: "kusama",
    token: "KSM",
    xcm: {
      fee: { token: "KSM", amount: "106666660" },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "karura",
    token: "RMRK",
    xcm: {
      fee: { token: "RMRK", amount: "6400000" },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "karura",
    token: "ARIS",
    xcm: {
      fee: { token: "ARIS", amount: "6400000" },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "karura",
    token: "USDT",
    xcm: { fee: { token: "USDT", amount: "640" }, weightLimit: "Unlimited" },
  },
  {
    to: "moonriver",
    token: "USDT",
    xcm: {
      fee: {
        token: "USDT",
        amount: "20000",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "bifrostKusama",
    token: "USDT",
    xcm: {
      fee: {
        token: "USDT",
        amount: "7",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "heiko",
    token: "USDT",
    xcm: {
      fee: {
        token: "USDT",
        amount: "18000",
      },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "basilisk",
    token: "USDT",
    xcm: {
      fee: {
        token: "USDT",
        amount: "2981",
      },
      weightLimit: "Unlimited",
    },
  },
];

export const statemintRoutersConfig: Omit<RouteConfigs, "from">[] = [
  {
    to: "polkadot",
    token: "DOT",
    xcm: {
      fee: {
        token: "DOT-Statemint",
        amount: "421434140",
      },
      weightLimit: "Unlimited",
    },
  },
];

export const statemineTokensConfig: Record<
  string,
  Record<string, BasicToken>
> = {
  statemine: {
    KSM: { name: "KSM", symbol: "KSM", decimals: 12, ed: "79999999" },
    RMRK: { name: "RMRK", symbol: "RMRK", decimals: 10, ed: "100000000" },
    ARIS: { name: "ARIS", symbol: "ARIS", decimals: 8, ed: "10000000" },
    USDT: { name: "USDT", symbol: "USDT", decimals: 6, ed: "1000" },
  },
  statemint: {
    DOT: {
      name: "DOT-Statemint",
      symbol: "DOT-Statemint",
      decimals: 10,
    },
  },
};

const SUPPORTED_TOKENS: Record<string, Record<string, BN>> = {
  statemine: {
    KSM: new BN(1234),
    RMRK: new BN(8),
    ARIS: new BN(16),
    USDT: new BN(1984),
  },
  statemint: {
    DOT: new BN(3),
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
    assets: (assetId: BN, address: string) =>
      Storage.create<any>({
        api,
        path: "query.assets.account",
        params: [assetId, address],
      }),
    assetsMeta: (assetId: BN) =>
      Storage.create<any>({
        api,
        path: "query.assets.metadata",
        params: [assetId],
      }),
    assetsInfo: (assetId: BN) =>
      Storage.create<any>({
        api,
        path: "query.assets.asset",
        params: [assetId],
      }),
  };
};

class StatemintBalanceAdapter extends BalanceAdapter {
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

    const assetId =
      SUPPORTED_TOKENS[chainId || ("statemine" as ChainId)][token];

    if (assetId === undefined) {
      throw new TokenNotFound(token);
    }

    return combineLatest({
      meta: this.storages.assetsMeta(assetId).observable,
      balance: this.storages.assets(assetId, address).observable,
    }).pipe(
      map(({ balance, meta }) => {
        const amount = FN.fromInner(
          balance.unwrapOrDefault()?.balance?.toString() || "0",
          meta.decimals?.toNumber()
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

class BaseStatemintAdapter extends BaseCrossChainAdapter {
  private balanceAdapter?: StatemintBalanceAdapter;

  public async init(api: AnyApi) {
    this.api = api;

    await api.isReady;

    const chain = this.chain.id as ChainId;

    this.balanceAdapter = new StatemintBalanceAdapter({
      api,
      chain,
      tokens: statemineTokensConfig[chain],
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

    const accountId = this.api?.createType("AccountId32", address).toHex();

    // to relay chain
    if (to === "kusama" || to === "polkadot") {
      if (token !== this.balanceAdapter?.nativeToken) {
        throw new TokenNotFound(token);
      }

      const dst = { interior: "Here", parents: 1 };
      const acc = {
        interior: { X1: { AccountId32: { id: accountId, network: null } } },
        parents: 0,
      };
      const ass = [
        {
          fun: { Fungible: amount.toChainData() },
          id: { Concrete: { interior: "Here", parents: 1 } },
        },
      ];

      return this.api?.tx.polkadotXcm.limitedTeleportAssets(
        { V3: dst },
        { V3: acc },
        { V3: ass },
        0,
        this.getDestWeight(token, to)?.toString()
      );
    }

    const chainId = this.chain.id;

    // to karura/acala
    const assetId = SUPPORTED_TOKENS[chainId][token];

    if (!assetId) {
      throw new TokenNotFound(token);
    }

    if (to === "acala" || to === "karura") {
      const dst = {
        parents: 1,
        interior: {
          X1: {
            Parachain: toChain.paraChainId,
          },
        },
      };

      const acc = {
        parents: 0,
        interior: {
          X1: {
            AccountId32: {
              network: null,
              id: accountId,
            },
          },
        },
      };

      const ass = [
        {
          id: {
            Concrete: {
              parents: 0,
              interior: {
                X2: [
                  {
                    PalletInstance: 50,
                  },
                  {
                    GeneralIndex: assetId,
                  },
                ],
              },
            },
          },
          fun: {
            Fungible: amount.toChainData(),
          },
        },
      ];

      return this.api.tx.polkadotXcm.limitedReserveTransferAssets(
        { V3: dst },
        { V3: acc },
        { V3: ass },
        0,
        "Unlimited"
      );
    }

    const dst = { X2: ["Parent", { Parachain: toChain.paraChainId }] };
    const acc = { X1: { AccountId32: { id: accountId, network: "Any" } } };
    const ass = [
      {
        ConcreteFungible: {
          id: { X2: [{ PalletInstance: 50 }, { GeneralIndex: assetId }] },
          amount: amount.toChainData(),
        },
      },
    ];

    return this.api?.tx.polkadotXcm.limitedReserveTransferAssets(
      { V0: dst },
      { V0: acc },
      { V0: ass },
      0,
      this.getDestWeight(token, to)?.toString()
    );
  }
}

export class StatemineAdapter extends BaseStatemintAdapter {
  constructor() {
    super(
      chains.statemine,
      statemineRoutersConfig,
      statemineTokensConfig.statemine
    );
  }
}

export class StatemintAdapter extends BaseStatemintAdapter {
  constructor() {
    super(
      chains.statemint,
      statemintRoutersConfig,
      statemineTokensConfig.statemint
    );
  }
}
