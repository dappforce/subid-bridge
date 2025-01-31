import { Wallet } from "@acala-network/sdk/wallet";
import { AnyApi, FixedPointNumber } from "@acala-network/sdk-core";
import {
  catchError,
  combineLatest,
  firstValueFrom,
  map,
  Observable,
  of,
} from "rxjs";

import "@acala-network/types/argument/api-tx";
import { ApiRx } from "@polkadot/api";
import { SubmittableExtrinsic } from "@polkadot/api/types";
import { ISubmittableResult } from "@polkadot/types/types";

import { BaseCrossChainAdapter } from "../base-chain-adapter";
import { ChainId, chains } from "../configs";
import { ApiNotFound } from "../errors";
import {
  BalanceData,
  BasicToken,
  RouteConfigs,
  TransferParams,
} from "../types";
import { isChainEqual } from "../utils/is-chain-equal";
import {
  xTokensTransferToEVMChain,
  xTokensTransferToOtherChain,
  xTokensTransferToReleayChain,
  xTokensTransferToStatemine,
} from "../utils/transfers/xTokensUtils";

const ACALA_DEST_WEIGHT = "5000000000";

export const acalaRoutersConfig: Omit<RouteConfigs, "from">[] = [
  {
    to: "polkadot",
    token: "DOT",
    xcm: {
      fee: { token: "DOT", amount: "469417452" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "moonbeam",
    token: "GLMR",
    xcm: {
      fee: { token: "GLMR", amount: "8000000000000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "moonbeam",
    token: "ACA",
    xcm: {
      fee: { token: "ACA", amount: "24963428577" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "moonbeam",
    token: "AUSD",
    xcm: {
      fee: { token: "AUSD", amount: "2000000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "parallel",
    token: "PARA",
    xcm: {
      fee: { token: "PARA", amount: "9600000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "parallel",
    token: "ACA",
    xcm: {
      fee: { token: "ACA", amount: "1920000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "parallel",
    token: "AUSD",
    xcm: {
      fee: { token: "AUSD", amount: "2880000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "parallel",
    token: "LDOT",
    xcm: {
      fee: { token: "LDOT", amount: "96000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "astar",
    token: "ASTR",
    xcm: {
      fee: { token: "ASTR", amount: "4635101624603120" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "astar",
    token: "ACA",
    xcm: {
      fee: { token: "ACA", amount: "1108000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "astar",
    token: "AUSD",
    xcm: {
      fee: { token: "AUSD", amount: "252800000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "astar",
    token: "LDOT",
    xcm: {
      fee: { token: "LDOT", amount: "3692000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "interlay",
    token: "INTR",
    xcm: {
      fee: { token: "INTR", amount: "21787589" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "interlay",
    token: "IBTC",
    xcm: {
      fee: { token: "IBTC", amount: "72" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "hydra",
    token: "DAI",
    xcm: {
      fee: { token: "DAI", amount: "2926334210356268" },
      weightLimit: ACALA_DEST_WEIGHT,
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
    token: "GLMR",
    xcm: {
      fee: {
        token: "GLMR",
        amount: "44033465433729636",
      },
      weightLimit: "Unlimited",
    },
  },
];
export const karuraRoutersConfig: Omit<RouteConfigs, "from">[] = [
  {
    to: "kusama",
    token: "KSM",
    xcm: {
      fee: { token: "KSM", amount: "79999999" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "statemine",
    token: "RMRK",
    xcm: {
      fee: { token: "KSM", amount: "16000000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "statemine",
    token: "ARIS",
    xcm: {
      fee: { token: "KSM", amount: "16000000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "statemine",
    token: "USDT",
    xcm: {
      fee: { token: "KSM", amount: "16000000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "shiden",
    token: "SDN",
    xcm: {
      fee: { token: "SDN", amount: "4662276356431024" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "shiden",
    token: "KUSD",
    xcm: {
      fee: { token: "KUSD", amount: "1200000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "bifrostKusama",
    token: "BNC",
    xcm: {
      fee: { token: "BNC", amount: "5120000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "bifrostKusama",
    token: "KAR",
    xcm: {
      fee: { token: "KAR", amount: "4800000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "bifrostKusama",
    token: "KUSD",
    xcm: {
      fee: { token: "KUSD", amount: "25600000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "bifrostKusama",
    token: "VSKSM",
    xcm: {
      fee: { token: "VSKSM", amount: "64000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "altair",
    token: "AIR",
    xcm: {
      fee: { token: "AIR", amount: "6400000000000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "altair",
    token: "KUSD",
    xcm: {
      fee: { token: "KUSD", amount: "51200000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "shadow",
    token: "CSM",
    xcm: {
      fee: { token: "CSM", amount: "4000000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "shadow",
    token: "KAR",
    xcm: {
      fee: { token: "KAR", amount: "4000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "shadow",
    token: "KUSD",
    xcm: {
      fee: { token: "KUSD", amount: "4000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "crab",
    token: "CRAB",
    xcm: {
      fee: { token: "CRAB", amount: "4000000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "integritee",
    token: "TEER",
    xcm: {
      fee: { token: "TEER", amount: "4000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "kintsugi",
    token: "KINT",
    xcm: {
      fee: { token: "KINT", amount: "170666666" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "kintsugi",
    token: "KBTC",
    xcm: {
      fee: { token: "KBTC", amount: "85" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "kintsugi",
    token: "LKSM",
    xcm: {
      fee: { token: "LKSM", amount: "186480000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "khala",
    token: "PHA",
    xcm: {
      fee: { token: "PHA", amount: "64000000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "khala",
    token: "KUSD",
    xcm: {
      fee: { token: "KUSD", amount: "16000000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "khala",
    token: "KAR",
    xcm: {
      fee: { token: "KAR", amount: "8000000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "kico",
    token: "KICO",
    xcm: {
      fee: { token: "KICO", amount: "96000000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "kico",
    token: "KAR",
    xcm: {
      fee: { token: "KAR", amount: "160000000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "kico",
    token: "KUSD",
    xcm: {
      fee: { token: "KUSD", amount: "320000000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "calamari",
    token: "KMA",
    xcm: {
      fee: { token: "KMA", amount: "4000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "calamari",
    token: "KUSD",
    xcm: {
      fee: { token: "KUSD", amount: "100000000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "calamari",
    token: "KAR",
    xcm: {
      fee: { token: "KAR", amount: "100000000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "calamari",
    token: "LKSM",
    xcm: {
      fee: { token: "LKSM", amount: "7692307692" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "moonriver",
    token: "MOVR",
    xcm: {
      fee: { token: "MOVR", amount: "80000000000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "moonriver",
    token: "KAR",
    xcm: {
      fee: { token: "KAR", amount: "9880000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "moonriver",
    token: "KUSD",
    xcm: {
      fee: { token: "KUSD", amount: "16536000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "heiko",
    token: "HKO",
    xcm: {
      fee: { token: "HKO", amount: "1440000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "heiko",
    token: "KAR",
    xcm: {
      fee: { token: "KAR", amount: "2400000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "heiko",
    token: "KUSD",
    xcm: {
      fee: { token: "KUSD", amount: "19200000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "heiko",
    token: "LKSM",
    xcm: {
      fee: { token: "LKSM", amount: "48000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "pichiu",
    token: "PCHU",
    xcm: {
      fee: { token: "PCHU", amount: "400000000000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "pichiu",
    token: "KAR",
    xcm: {
      fee: { token: "KAR", amount: "400000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "pichiu",
    token: "KUSD",
    xcm: {
      fee: { token: "KUSD", amount: "400000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "pichiu",
    token: "LKSM",
    xcm: {
      fee: { token: "LKSM", amount: "400000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "turing",
    token: "TUR",
    xcm: {
      fee: { token: "TUR", amount: "1664000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "turing",
    token: "KAR",
    xcm: {
      fee: { token: "KAR", amount: "32000000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "turing",
    token: "KUSD",
    xcm: {
      fee: { token: "KUSD", amount: "256000000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "turing",
    token: "LKSM",
    xcm: {
      fee: { token: "LKSM", amount: "6400000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "basilisk",
    token: "BSX",
    xcm: {
      fee: { token: "BSX", amount: "22000000000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "basilisk",
    token: "KUSD",
    xcm: {
      fee: { token: "KUSD", amount: "3150402683" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "basilisk",
    token: "DAI",
    xcm: {
      fee: { token: "DAI", amount: "4400000000000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "basilisk",
    token: "USDCet",
    xcm: {
      fee: { token: "USDCet", amount: "4400" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "listen",
    token: "LT",
    xcm: {
      fee: { token: "LT", amount: "6400000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "listen",
    token: "KAR",
    xcm: {
      fee: { token: "KAR", amount: "6400000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "listen",
    token: "KUSD",
    xcm: {
      fee: { token: "KUSD", amount: "6400000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "listen",
    token: "LKSM",
    xcm: {
      fee: { token: "LKSM", amount: "6400000000" },
      weightLimit: ACALA_DEST_WEIGHT,
    },
  },
  {
    to: "quartz",
    token: "QTZ",
    xcm: { fee: { token: "QTZ", amount: "0" }, weightLimit: ACALA_DEST_WEIGHT },
  },
  {
    to: "moonriver",
    token: "BNC",
    xcm: {
      fee: {
        token: "BNC",
        amount: "105081753604",
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
        amount: "74074074074",
      },
      weightLimit: "Unlimited",
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
    to: "heiko",
    token: "MOVR",
    xcm: {
      fee: {
        token: "MOVR",
        amount: "1895734597156398",
      },
      weightLimit: "Unlimited",
    },
  },
];

export const acalaTokensConfig: Record<string, BasicToken> = {
  ACA: { name: "ACA", symbol: "ACA", decimals: 12, ed: "100000000000" },
  AUSD: { name: "AUSD", symbol: "AUSD", decimals: 12, ed: "100000000000" },
  LDOT: { name: "LDOT", symbol: "LDOT", decimals: 10, ed: "500000000" },
  INTR: { name: "INTR", symbol: "INTR", decimals: 10, ed: "1000000000" },
  IBTC: { name: "IBTC", symbol: "IBTC", decimals: 8, ed: "100" },
  GLMR: {
    name: "GLMR",
    symbol: "GLMR",
    decimals: 18,
    ed: "100000000000000000",
  },
  PARA: { name: "PARA", symbol: "PARA", decimals: 12, ed: "100000000000" },
  ASTR: {
    name: "ASTR",
    symbol: "ASTR",
    decimals: 18,
    ed: "100000000000000000",
  },
  DOT: { name: "DOT", symbol: "DOT", decimals: 10, ed: "100000000" },
  DAI: {
    name: "DAI",
    symbol: "DAI",
    decimals: 18,
    ed: "10000000000000000",
  },
};

export const karuraTokensConfig: Record<string, BasicToken> = {
  KAR: { name: "KAR", symbol: "KAR", decimals: 12, ed: "100000000000" },
  KUSD: { name: "KUSD", symbol: "KUSD", decimals: 12, ed: "10000000000" },
  LKSM: { name: "LKSM", symbol: "LKSM", decimals: 12, ed: "500000000" },
  SDN: { name: "SDN", symbol: "SDN", decimals: 18, ed: "10000000000000000" },
  BNC: { name: "BNC", symbol: "BNC", decimals: 12, ed: "8000000000" },
  VSKSM: { name: "VSKSM", symbol: "VSKSM", decimals: 12, ed: "100000000" },
  AIR: { name: "AIR", symbol: "AIR", decimals: 18, ed: "100000000000000000" },
  CSM: { name: "CSM", symbol: "CSM", decimals: 12, ed: "1000000000000" },
  CRAB: {
    name: "CRAB",
    symbol: "CRAB",
    decimals: 18,
    ed: "1000000000000000000",
  },
  BSX: { name: "BSX", symbol: "BSX", decimals: 12, ed: "1000000000000" },
  TEER: { name: "TEER", symbol: "TEER", decimals: 12, ed: "100000000000" },
  KINT: { name: "KINT", symbol: "KINT", decimals: 12, ed: "133330000" },
  KBTC: { name: "KBTC", symbol: "KBTC", decimals: 8, ed: "66" },
  KICO: { name: "KICO", symbol: "KICO", decimals: 14, ed: "100000000000000" },
  PCHU: {
    name: "PCHU",
    symbol: "PCHU",
    decimals: 18,
    ed: "100000000000000000",
  },
  LT: { name: "LT", symbol: "LT", decimals: 12, ed: "1000000000000" },
  KMA: { name: "KMA", symbol: "KMA", decimals: 12, ed: "100000000000" },
  MOVR: { name: "MOVR", symbol: "MOVR", decimals: 18, ed: "1000000000000000" },
  TUR: { name: "TUR", symbol: "TUR", decimals: 10, ed: "40000000000" },
  HKO: { name: "HKO", symbol: "HKO", decimals: 12, ed: "100000000000" },
  PHA: { name: "PHA", symbol: "PHA", decimals: 12, ed: "40000000000" },
  KSM: { name: "KSM", symbol: "KSM", decimals: 12, ed: "100000000" },
  RMRK: { name: "RMRK", symbol: "RMRK", decimals: 10, ed: "100000000" },
  ARIS: { name: "ARIS", symbol: "ARIS", decimals: 8, ed: "1000000000000" },
  USDT: { name: "USDT", symbol: "USDT", decimals: 6, ed: "10000" },
  QTZ: { name: "QTZ", symbol: "QTZ", decimals: 18, ed: "1000000000000000000" },
  DAI: {
    name: "DAI",
    symbol: "DAI",
    decimals: 18,
    ed: "10000000000000000",
  },
  USDCet: {
    name: "USDCet",
    symbol: "USDCet",
    decimals: 6,
    ed: "10000",
  },
};

class BaseAcalaAdapter extends BaseCrossChainAdapter {
  private wallet?: Wallet;

  public async init(api: AnyApi, wallet?: Wallet) {
    this.api = api;

    if (this.api?.type === "rxjs") {
      await firstValueFrom(api.isReady as Observable<ApiRx>);
    }

    await api.isReady;

    // use custom wallet or create a new one
    if (wallet) {
      this.wallet = wallet;
    } else {
      this.wallet = new Wallet(api);
    }

    await this.wallet.isReady;
  }

  public override subscribeMinInput(
    token: string,
    to: ChainId
  ): Observable<FixedPointNumber> {
    if (!this.wallet) {
      throw new ApiNotFound(this.chain.id);
    }

    const destFee = this.getCrossChainFee(token, to);

    return of(
      this.getDestED(token, to).balance.add(
        destFee.token === token ? destFee.balance : FixedPointNumber.ZERO
      )
    );
  }

  public subscribeTokenBalance(
    token: string,
    address: string
  ): Observable<BalanceData> {
    if (!this.wallet) {
      throw new ApiNotFound(this.chain.id);
    }

    const zeroResult: Observable<BalanceData> = new Observable((sub) =>
      sub.next({
        free: FixedPointNumber.ZERO,
        locked: FixedPointNumber.ZERO,
        available: FixedPointNumber.ZERO,
        reserved: FixedPointNumber.ZERO,
      })
    );

    return this.wallet
      .subscribeBalance(token, address)
      .pipe(catchError((_) => zeroResult));
  }

  public subscribeMaxInput(
    token: string,
    address: string,
    to: ChainId
  ): Observable<FixedPointNumber> {
    if (!this.wallet) {
      throw new ApiNotFound(this.chain.id);
    }

    const tokens = this.wallet.getPresetTokens();
    const { nativeToken } = tokens;

    return combineLatest({
      txFee:
        token === nativeToken.name
          ? this.estimateTxFee({
              amount: FixedPointNumber.ZERO,
              to,
              token,
              address:
                to === "moonriver" || to === "moonbeam"
                  ? "0x0000000000000000000000000000000000000000"
                  : address,
              signer: address,
            })
          : "0",
      balance: this.wallet
        .subscribeBalance(token, address)
        .pipe(map((i) => i.available)),
    }).pipe(
      map(({ balance, txFee }) => {
        const feeFactor = 1.2;
        const fee = FixedPointNumber.fromInner(
          txFee,
          nativeToken.decimals || 12
        ).mul(new FixedPointNumber(feeFactor));

        return balance.minus(fee);
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

    const tokenFormSDK = this.wallet?.getToken(token);
    const destFee = this.getCrossChainFee(token, to);

    const toChain = chains[to];

    const commonParams = {
      api: this.api,
      tokenObj: tokenFormSDK?.toChainData() as any,
      address,
      amount,
    };

    // to moonriver/moonbeam
    if (
      isChainEqual(toChain, "moonriver") ||
      isChainEqual(toChain, "moonbeam")
    ) {
      return xTokensTransferToEVMChain({
        ...commonParams,
        token,
        destFee,
        to,
      });
    }

    // to relay-chain
    if (isChainEqual(toChain, "kusama") || isChainEqual(toChain, "polkadot")) {
      return xTokensTransferToReleayChain({ ...commonParams });
    }

    return isChainEqual(toChain, "statemine") ||
      isChainEqual(toChain, "statemint")
      ? xTokensTransferToStatemine({
          ...commonParams,
          destFee,
          to,
        })
      : xTokensTransferToOtherChain({
          ...commonParams,
          to,
        });
  }
}

export class AcalaAdapter extends BaseAcalaAdapter {
  constructor() {
    super(chains.acala, acalaRoutersConfig, acalaTokensConfig);
  }
}

export class KaruraAdapter extends BaseAcalaAdapter {
  constructor() {
    super(chains.karura, karuraRoutersConfig, karuraTokensConfig);
  }
}
