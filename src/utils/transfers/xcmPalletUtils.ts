import { AnyApi, FixedPointNumber } from "@acala-network/sdk-core";
import { Chain } from "../../types";

type TransferProps = {
  api: AnyApi;
  amount: FixedPointNumber;
  address: string;
  toChain: Chain;
};

export const xcmPalletTransferToStatemine = ({
  api,
  address,
  amount,
  toChain,
}: TransferProps) => {
  const accountId = api?.createType("AccountId32", address).toHex();

  const dst = {
    interior: { X1: { ParaChain: toChain.paraChainId } },
    parents: 0,
  };
  const acc = {
    parents: 0,
    interior: {
      X1: {
        AccountId32: {
          id: accountId,
          network: "Any",
        },
      },
    },
  };
  const ass = [
    {
      fun: { Fungible: amount.toChainData() },
      id: { Concrete: { interior: "Here", parents: 0 } },
    },
  ];

  return api?.tx.xcmPallet.limitedTeleportAssets(
    { V1: dst },
    { V1: acc },
    { V1: ass },
    0,
    "Unlimited"
  );
};

export const xcmPalletTransferToOtherChain = ({
  api,
  amount,
  address,
  toChain,
}: TransferProps) => {
  const accountId = api?.createType("AccountId32", address).toHex();

  const dst = { X1: { Parachain: toChain.paraChainId } };
  const acc = {
    X1: { AccountId32: { id: accountId, network: "Any" } },
  };
  const ass = [{ ConcreteFungible: { amount: amount.toChainData() } }];

  return api?.tx.xcmPallet.reserveTransferAssets(
    { V0: dst },
    { V0: acc },
    { V0: ass },
    0
  );
};

export const xcmPalletTransferToEVMChain = ({
  api,
  amount,
  toChain,
  address,
}: TransferProps) => {
  const dst = {
    V1: {
      perents: 0,
      interior: {
        X1: { Parachain: toChain.paraChainId },
      },
    },
  };

  const acc = {
    V1: {
      parents: 0,
      interior: {
        X1: {
          AccountKey20: { network: "Any", key: address },
        },
      },
    },
  };

  const ass = {
    V1: [
      {
        fun: { Fungible: amount.toChainData() },
        id: { Concrete: { interior: "Here", parents: 0 } },
      },
    ],
  };

  return api?.tx.xcmPallet.limitedReserveTransferAssets(
    dst,
    acc,
    ass,
    0,
    "Unlimited"
  );
};
