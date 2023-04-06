import { ChainId } from "../configs";
import { Chain } from "../types";
import {
  getPubkeyFromSS58Addr,
  isValidAddressPolkadotAddress,
  isValidEvmAddress,
} from "@astar-network/astar-sdk-core";
import { evmToAddress } from "@polkadot/util-crypto";

export function isChainEqual(
  c1: Chain | ChainId,
  c2: Chain | ChainId
): boolean {
  const c1Name = typeof c1 === "string" ? c1 : c1.id;
  const c2Name = typeof c2 === "string" ? c2 : c2.id;

  return c1Name.toLowerCase() === c2Name.toLowerCase();
}

export const getAddress = (address: string, addressPrefix: number): string => {
  if (isValidAddressPolkadotAddress(address)) {
    return address;
  } else if (isValidEvmAddress(address)) {
    const ss58MappedAddr = evmToAddress(address, addressPrefix);
    const hexPublicKey = getPubkeyFromSS58Addr(ss58MappedAddr);
    return hexPublicKey;
  } else {
    // eslint-disable-next-line no-throw-literal
    throw `The address ${address} is not valid.`;
  }
};
