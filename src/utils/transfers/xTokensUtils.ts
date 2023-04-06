import { AnyApi, FixedPointNumber } from "@acala-network/sdk-core";
import { TokenBalance } from "../../types";
import { ChainId, chains } from "../../configs/chains/index";

type TransferProps = {
  api: AnyApi;
  amount: FixedPointNumber;
  address: string;
  tokenObj?: any;
};

export const xTokensTransferToReleayChain = ({
  api,
  amount,
  address,
  tokenObj,
}: TransferProps) => {
  const accountId = api?.createType("AccountId32", address).toHex();

  const dst = {
    interior: { X1: { AccountId32: { id: accountId, network: "Any" } } },
    parents: 1,
  };

  return api.tx.xTokens.transfer(
    tokenObj,
    amount.toChainData(),
    { V1: dst },
    "Unlimited"
  );
};

type TransferToEVMProps = TransferProps & {
  token: string;
  to: ChainId;
  getCrossChainFee: (token: string, to: ChainId) => TokenBalance;
};

export const xTokensTransferToEVMChain = ({
  api,
  amount,
  address,
  tokenObj,
  token,
  to,
  getCrossChainFee,
}: TransferToEVMProps) => {
  const toChain = chains[to];

  const destFee = getCrossChainFee(token, to);

  const dst = {
    parents: 1,
    interior: {
      X2: [
        { Parachain: toChain.paraChainId },
        { AccountKey20: { key: address, network: "Any" } },
      ],
    },
  };

  return token === "KAR" ||
    token === "KUSD" ||
    token === "MOVR" ||
    token === "ACA" ||
    token === "AUSD" ||
    token === "GLMR"
    ? api.tx.xTokens.transfer(
        tokenObj,
        amount.toChainData(),
        { V1: dst },
        "Unlimited"
      )
    : api.tx.xTokens.transferMulticurrencies(
        [
          [tokenObj, amount.toChainData()],
          [{ Token: destFee.token }, destFee.balance.toChainData()],
        ],
        1,
        { V1: dst },
        "Unlimited"
      );
};

type TransferToOtherProps = TransferProps & {
  to: ChainId;
};

export const xTokensTransferToOtherChain = ({
  api,
  amount,
  to,
  address,
  tokenObj,
}: TransferToOtherProps) => {
  const accountId = api?.createType("AccountId32", address).toHex();
  const toChain = chains[to];

  const dst: any = {
    parents: 1,
    interior: {
      X2: [
        { Parachain: toChain.paraChainId },
        { AccountId32: { id: accountId, network: "Any" } },
      ],
    },
  };

  return api.tx.xTokens.transfer(
    tokenObj,
    amount.toChainData(),
    { V1: dst },
    "Unlimited"
  );
};

type TransferToStatemineProps = TransferProps & {
  token: string;
  to: ChainId;
  getCrossChainFee: (token: string, to: ChainId) => TokenBalance;
};

export const xTokensTransferToStatemine = ({
  api,
  amount,
  to,
  token,
  address,
  tokenObj,
  getCrossChainFee,
}: TransferToStatemineProps) => {
  const toChain = chains[to];

  const accountId = api.createType("AccountId32", address).toHex();

  const destFee = getCrossChainFee(token, to);

  const dst: any = {
    parents: 1,
    interior: {
      X2: [
        { Parachain: toChain.paraChainId },
        { AccountId32: { id: accountId, network: "Any" } },
      ],
    },
  };

  return api.tx.xTokens.transferMulticurrencies(
    [
      [tokenObj, amount.toChainData()],
      [{ Token: destFee.token }, destFee.balance.toChainData()],
    ],
    1,
    { V1: dst },
    "Unlimited"
  );
};
