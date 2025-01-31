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
  xcmPalletTransferToStatemine,
  xcmPalletTransferToEVMChain,
  xcmPalletTransferToOtherChain,
} from "../utils/transfers/xcmPalletUtils";
import {
  BalanceData,
  BasicToken,
  RouteConfigs,
  TransferParams,
} from "../types";

export const polkadotRoutersConfig: Omit<RouteConfigs, "from">[] = [
  {
    to: "acala",
    token: "DOT",
    xcm: { fee: { token: "DOT", amount: "3549633" }, weightLimit: "Unlimited" },
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
    to: "statemint",
    token: "DOT",
    xcm: {
      fee: {
        token: "DOT",
        amount: "15836598",
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

// TODO: should remove after kusama upgrade
export const kusamaRoutersConfig: Omit<RouteConfigs, "from">[] = [
  {
    to: "karura",
    token: "KSM",
    xcm: {
      fee: { token: "KSM", amount: "71927964" },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "basilisk",
    token: "KSM",
    xcm: {
      fee: { token: "KSM", amount: "101577722" },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "statemine",
    token: "KSM",
    xcm: {
      fee: { token: "KSM", amount: "4000000000" },
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
];

export const V3KusamaRoutersConfig: Omit<RouteConfigs, "from">[] = [
  {
    to: "karura",
    token: "KSM",
    xcm: {
      fee: { token: "KSM", amount: "44163610" },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "basilisk",
    token: "KSM",
    xcm: {
      fee: { token: "KSM", amount: "72711796" },
      weightLimit: "Unlimited",
    },
  },
  {
    to: "statemine",
    token: "KSM",
    xcm: {
      fee: { token: "KSM", amount: "34368318" },
      weightLimit: "Unlimited",
    },
  },
];

const polkadotTokensConfig: Record<string, Record<string, BasicToken>> = {
  polkadot: {
    DOT: { name: "DOT", symbol: "DOT", decimals: 10, ed: "10000000000" },
  },
  kusama: {
    KSM: { name: "KSM", symbol: "KSM", decimals: 12, ed: "79999999" },
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
  };
};

class PolkadotBalanceAdapter extends BalanceAdapter {
  private storages: ReturnType<typeof createBalanceStorages>;

  constructor({ api, chain, tokens }: BalanceAdapterConfigs) {
    super({ chain, api, tokens });

    this.storages = createBalanceStorages(api);
  }

  public subscribeBalance(
    token: string,
    address: string
  ): Observable<BalanceData> {
    const storage = this.storages.balances(address);

    if (token !== this.nativeToken) {
      throw new TokenNotFound(token);
    }

    return storage.observable.pipe(
      map((data) => ({
        free: FN.fromInner(data.freeBalance.toString(), this.decimals),
        locked: FN.fromInner(data.lockedBalance.toString(), this.decimals),
        reserved: FN.fromInner(data.reservedBalance.toString(), this.decimals),
        available: FN.fromInner(
          data.availableBalance.toString(),
          this.decimals
        ),
      }))
    );
  }
}

class BasePolkadotAdapter extends BaseCrossChainAdapter {
  private balanceAdapter?: PolkadotBalanceAdapter;

  public async init(api: AnyApi) {
    this.api = api;

    await api.isReady;

    const chain = this.chain.id as ChainId;

    this.balanceAdapter = new PolkadotBalanceAdapter({
      chain,
      api,
      tokens: polkadotTokensConfig[chain],
    });

    // TODO: should remove after kusama upgrade
    // update routers config when the chain is not support V0, V1 xcm message
    if (!this.isV0V1 && chain === "kusama") {
      this.routers = V3KusamaRoutersConfig;
    }
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
      txFee: this.estimateTxFee({
        amount: FN.ZERO,
        to,
        token,
        address,
        signer: address,
      }),
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

  // TODO: should remove after kusama upgrade
  private get isV0V1() {
    try {
      const keys = (this.api?.createType("XcmVersionedMultiLocation") as any)
        .defKeys as string[];

      return keys.includes("V0");
    } catch (e) {
      // ignore error
    }

    return false;
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

    if (token !== this.balanceAdapter?.nativeToken) {
      throw new TokenNotFound(token);
    }

    const isV0V1Support = this.isV0V1;

    const commonProps = {
      api: this.api,
      amount,
      address,
      toChain,
    };

    // to statemine
    if (to === "statemine" || to === "statemint") {
      return xcmPalletTransferToStatemine(commonProps);
    }

    if (
      isChainEqual(toChain, "moonbeam") ||
      isChainEqual(toChain, "moonriver")
    ) {
      return xcmPalletTransferToEVMChain(commonProps);
    }

    if (isV0V1Support) {
      return xcmPalletTransferToOtherChain(commonProps);
    } else {
      const dst = {
        parents: 0,
        interior: { X1: { Parachain: toChain.paraChainId } },
      };
      const acc = {
        parents: 0,
        interior: {
          X1: { AccountId32: { id: address } },
        },
      };
      const ass = [
        {
          id: { Concrete: { parents: 0, interior: "Here" } },
          fun: { Fungible: amount.toChainData() },
        },
      ];

      return this.api?.tx.xcmPallet.limitedReserveTransferAssets(
        { V3: dst },
        { V3: acc },
        { V3: ass },
        0,
        this.getDestWeight(token, to)?.toString()
      );
    }
  }
}

export class PolkadotAdapter extends BasePolkadotAdapter {
  constructor() {
    super(
      chains.polkadot,
      polkadotRoutersConfig,
      polkadotTokensConfig.polkadot
    );
  }
}

export class KusamaAdapter extends BasePolkadotAdapter {
  constructor() {
    super(chains.kusama, kusamaRoutersConfig, polkadotTokensConfig.kusama);
  }
}
