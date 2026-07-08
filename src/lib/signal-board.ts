import type { Address } from "viem";

export const MAX_SIGNAL_TITLE_LENGTH = 24;
export const MAX_SIGNAL_NOTE_LENGTH = 160;

export const signalBoardAbi = [
  {
    type: "function",
    name: "publishSignal",
    stateMutability: "nonpayable",
    inputs: [
      { name: "title", type: "string" },
      { name: "direction", type: "string" },
      { name: "intensity", type: "uint256" },
      { name: "note", type: "string" },
    ],
    outputs: [{ name: "signalId", type: "uint256" }],
  },
  {
    type: "function",
    name: "getSignal",
    stateMutability: "view",
    inputs: [{ name: "signalId", type: "uint256" }],
    outputs: [
      { name: "author", type: "address" },
      { name: "title", type: "string" },
      { name: "direction", type: "string" },
      { name: "intensity", type: "uint256" },
      { name: "note", type: "string" },
      { name: "createdAt", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "nextSignalId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export type SignalBoardData = {
  author: Address;
  title: string;
  direction: string;
  intensity: bigint;
  note: string;
  createdAt: bigint;
};

export const signalBoardContractAddress = process.env
  .NEXT_PUBLIC_SIGNAL_BOARD_CONTRACT_ADDRESS as Address | undefined;
