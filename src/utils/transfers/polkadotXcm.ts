import { AnyApi, FixedPointNumber } from "@acala-network/sdk-core";
import { Chain } from "../../types";

type TransferProps = {
  api: AnyApi;
  address: string;
  amount: FixedPointNumber;
  toChain: Chain;
};

export const polkadotXcmTransferToRelayChain = ({
  api,
  amount,
  address,
}: Omit<TransferProps, "toChain">) => {
  const accountId = api?.createType("AccountId32", address).toHex();

  const dst = {
    parents: 1,
    interior: "Here",
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
      id: {
        Concrete: {
          parents: 1,
          interior: "Here",
        },
      },
      fun: { Fungible: amount.toChainData() },
    },
  ];

  return api?.tx.polkadotXcm.reserveWithdrawAssets(
    { V1: dst },
    { V1: acc },
    { V1: ass },
    0
  );
};

export const polkadotXcmTransferToOtherParachains = ({
  api,
  amount,
  address,
  toChain,
}: TransferProps) => {
  const accountId = api?.createType("AccountId32", address).toHex();

  const dst = {
    parents: 1,
    interior: { X1: { Parachain: toChain.paraChainId } },
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
      id: { Concrete: { parents: 0, interior: "Here" } },
      fun: { Fungible: amount.toChainData() },
    },
  ];

  return api?.tx.polkadotXcm.reserveWithdrawAssets(
    { V1: dst },
    { V1: acc },
    { V1: ass },
    0
  );
};

export const polkadotXcmTransferNativeToken = ({
  api,
  toChain,
  address,
  amount,
}: TransferProps) => {
  const accountId = api?.createType("AccountId32", address).toHex();

  const dst = {
    interior: { X1: { ParaChain: toChain.paraChainId } },
    parents: 0,
  };
  const acc = {
    interior: {
      X1: {
        AccountId32: {
          id: accountId,
          network: "Any",
        },
      },
    },
    parents: 0,
  };
  const ass = [
    {
      fun: { Fungible: amount.toChainData() },
      id: { Concrete: { interior: "Here", parents: 0 } },
    },
  ];

  return api?.tx.polkadotXcm.reserveTransferAssets(
    { V1: dst },
    { V1: acc },
    { V1: ass },
    0
  );
};
