"use client";

import {
  ArrowBigDownDash,
  ArrowBigUpDash,
  Gauge,
  Loader2,
  RadioTower,
  ScanSearch,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { Address } from "viem";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { base } from "wagmi/chains";
import {
  MAX_SIGNAL_NOTE_LENGTH,
  MAX_SIGNAL_TITLE_LENGTH,
  signalBoardAbi,
  signalBoardContractAddress,
} from "@/lib/signal-board";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const DIRECTIONS = [
  { value: "UP", label: "UP", icon: ArrowBigUpDash, tone: "#49F07A" },
  { value: "DOWN", label: "DOWN", icon: ArrowBigDownDash, tone: "#FF715A" },
  { value: "HOLD", label: "HOLD", icon: Gauge, tone: "#FFD64A" },
] as const;

function shortAddress(address?: Address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDate(createdAt?: bigint) {
  if (!createdAt) return "--";
  return new Date(Number(createdAt) * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function FlipText({
  value,
  tone = "#D6E7FF",
}: {
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {value.split("").map((char, index) => (
        <span
          key={`${char}-${index}`}
          className="grid h-11 w-8 place-items-center rounded-sm border border-[#4A5568] bg-[#11151B] font-mono text-lg font-black text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.45)]"
          style={{ color: char === " " ? "#11151B" : tone }}
        >
          {char === " " ? "_" : char}
        </span>
      ))}
    </div>
  );
}

export function SignalBoardApp() {
  const [signalIdInput, setSignalIdInput] = useState("1");
  const [title, setTitle] = useState("ETH BETA BREATHING");
  const [direction, setDirection] = useState<(typeof DIRECTIONS)[number]["value"]>("UP");
  const [intensity, setIntensity] = useState(72);
  const [note, setNote] = useState(
    "Momentum is back but still uneven, so the board reads bullish with caution, not blind euphoria.",
  );
  const [status, setStatus] = useState(
    "Broadcast one chain-native signal with direction, strength, and context.",
  );
  const [walletStatus, setWalletStatus] = useState("");

  const { address, chainId, connector, isConnected } = useAccount();
  const { connectors, connectAsync, isPending: connecting } = useConnect();
  const { disconnectAsync, isPending: disconnecting } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const {
    data: hash,
    writeContract,
    isPending: writing,
    error: writeError,
  } = useWriteContract();

  const { isLoading: confirming, isSuccess: confirmed } =
    useWaitForTransactionReceipt({ hash });

  const availableConnectors = useMemo(
    () =>
      connectors
        .filter((item) => item.type !== "mock")
        .sort((a, b) => {
          const score = (item: (typeof connectors)[number]) => {
            if (item.id === "baseAccount" || item.name === "Base Account") {
              return 0;
            }
            if (item.type === "injected") return 1;
            return 2;
          };

          return score(a) - score(b);
        }),
    [connectors],
  );

  async function connectWallet() {
    const errors: string[] = [];
    setWalletStatus("Opening wallet...");

    for (const item of availableConnectors) {
      try {
        await connectAsync({ connector: item, chainId: base.id });
        setWalletStatus("");
        return;
      } catch (error) {
        errors.push(
          error instanceof Error
            ? `${item.name}: ${error.message}`
            : `${item.name}: connection failed`,
        );
      }
    }

    setWalletStatus(
      errors[0] ??
        "No wallet connector is available. Open this app inside Base App or install a wallet.",
    );
  }

  async function disconnectWallet() {
    try {
      if (connector) {
        await disconnectAsync({ connector });
      } else {
        await disconnectAsync();
      }
      setWalletStatus("Wallet disconnected. Tap Connect to reconnect.");
    } catch (error) {
      setWalletStatus(
        error instanceof Error ? error.message : "Could not disconnect wallet.",
      );
    }
  }
  const parsedSignalId = BigInt(Math.max(1, Number(signalIdInput || "1")));

  const signalQuery = useReadContract({
    abi: signalBoardAbi,
    address: signalBoardContractAddress,
    functionName: "getSignal",
    args: [parsedSignalId],
    query: {
      enabled: Boolean(signalBoardContractAddress),
      refetchInterval: 12000,
    },
  });

  const totalQuery = useReadContract({
    abi: signalBoardAbi,
    address: signalBoardContractAddress,
    functionName: "nextSignalId",
    query: {
      enabled: Boolean(signalBoardContractAddress),
      refetchInterval: 12000,
    },
  });

  const signalTuple = signalQuery.data as
    | readonly [Address, string, string, bigint, string, bigint]
    | undefined;

  const signal = useMemo(
    () =>
      signalTuple
        ? {
            author: signalTuple[0],
            title: signalTuple[1],
            direction: signalTuple[2] as "UP" | "DOWN" | "HOLD",
            intensity: signalTuple[3],
            note: signalTuple[4],
            createdAt: signalTuple[5],
          }
        : undefined,
    [signalTuple],
  );

  const totalSignals = totalQuery.data ? Math.max(Number(totalQuery.data) - 1, 0) : 0;
  const activeDirection =
    DIRECTIONS.find((item) => item.value === (signal?.direction ?? direction)) ?? DIRECTIONS[0];
  const liveIntensity = Number(signal?.intensity ?? BigInt(intensity));

  const canPublish =
    Boolean(signalBoardContractAddress) &&
    isConnected &&
    chainId === base.id &&
    title.trim().length > 0 &&
    title.trim().length <= MAX_SIGNAL_TITLE_LENGTH &&
    note.trim().length > 0 &&
    note.trim().length <= MAX_SIGNAL_NOTE_LENGTH;

  const statusText = confirmed
    ? "Signal confirmed on Base."
    : writeError
      ? writeError.message
      : status;

  function publishSignal() {
    if (!signalBoardContractAddress) return;
    setStatus("Confirm the signal broadcast in your wallet.");
    writeContract({
      address: signalBoardContractAddress,
      abi: signalBoardAbi,
      functionName: "publishSignal",
      args: [title.trim(), direction, BigInt(intensity), note.trim()],
      chainId: base.id,
    });
  }

  return (
    <main className="min-h-screen bg-[#0A0D12] text-[#E8EEF7]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="rounded-[30px] border border-[#344153] bg-[linear-gradient(180deg,#D8DEE8_0%,#9AA6B5_100%)] p-[2px] shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
          <div className="rounded-[28px] bg-[linear-gradient(180deg,#1C2128_0%,#0D1117_100%)] px-5 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-[16px] border border-[#657284] bg-[#11151B] text-[#D9E6F5]">
                  <RadioTower className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#8FA6C0]">
                    Base Signal Board
                  </p>
                  <h1 className="mt-1 text-3xl font-black uppercase tracking-[0.04em] text-white sm:text-4xl">
                    Broadcast directional conviction.
                  </h1>
                </div>
              </div>

              {isConnected ? (
                <div className="flex items-center gap-2 self-start lg:self-end">
                  <span className="rounded-full border border-[#49586B] bg-[#11151B] px-3 py-2 text-sm font-semibold text-[#D9E6F5]">
                    {shortAddress(address)}
                  </span>
                  <button
                    className="rounded-full border border-[#49586B] bg-[#E8EEF7] px-4 py-2 text-sm font-black uppercase text-[#0D1117]"
                    onClick={disconnectWallet}
                  >{disconnecting ? "Disconnecting" : "Disconnect"}</button>
                </div>
              ) : (
                <button
                  className="inline-flex items-center gap-2 self-start rounded-full border border-[#49586B] bg-[#E8EEF7] px-4 py-2 text-sm font-black uppercase text-[#0D1117] disabled:opacity-60"
                  disabled={availableConnectors.length === 0 || connecting}
                  onClick={connectWallet}
                >
                  {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                  Connect
                </button>
              )}
            {walletStatus ? (
            <p className="w-full text-right text-xs font-semibold opacity-75">
              {walletStatus}
            </p>
          ) : null}
        </div>
          </div>
        </header>

        <div className="mt-4 grid flex-1 gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
          <aside className="grid gap-4">
            <section className="rounded-[30px] border border-[#344153] bg-[linear-gradient(180deg,#1A1F27_0%,#0F131A_100%)] p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-[14px] border border-[#49586B] bg-[#11151B] text-[#D9E6F5]">
                  <RadioTower className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-3xl font-black uppercase tracking-[0.04em] text-white">
                    New signal
                  </h2>
                  <p className="text-sm font-semibold text-[#94A8BF]">
                    Post a live directional read.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-[0.22em] text-[#8FA6C0]">
                    Signal title
                  </span>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value.toUpperCase())}
                    maxLength={MAX_SIGNAL_TITLE_LENGTH}
                    className="mt-2 w-full rounded-[18px] border border-[#3B4758] bg-[#0C1016] px-4 py-3 text-base font-black uppercase text-white outline-none placeholder:text-[#607186]"
                    placeholder="ETH BETA BREATHING"
                  />
                </label>

                <div>
                  <span className="text-[11px] font-black uppercase tracking-[0.22em] text-[#8FA6C0]">
                    Direction
                  </span>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {DIRECTIONS.map((item) => {
                      const Icon = item.icon;
                      const active = direction === item.value;
                      return (
                        <button
                          key={item.value}
                          className="rounded-[18px] border px-3 py-3"
                          style={{
                            borderColor: active ? item.tone : "#3B4758",
                            backgroundColor: active ? `${item.tone}22` : "#0C1016",
                          }}
                          onClick={() => setDirection(item.value)}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <Icon className="h-4 w-4" style={{ color: item.tone }} />
                            <span className="text-sm font-black uppercase text-white">
                              {item.label}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="block">
                  <span className="flex items-center justify-between text-[11px] font-black uppercase tracking-[0.22em] text-[#8FA6C0]">
                    <span>Intensity</span>
                    <span>{intensity}</span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={intensity}
                    onChange={(event) => setIntensity(Number(event.target.value))}
                    className="mt-3 w-full accent-[#D6E7FF]"
                  />
                </label>

                <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-[0.22em] text-[#8FA6C0]">
                    Context
                  </span>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    maxLength={MAX_SIGNAL_NOTE_LENGTH}
                    rows={5}
                    className="mt-2 w-full rounded-[18px] border border-[#3B4758] bg-[#0C1016] px-4 py-3 text-base font-semibold leading-7 text-white outline-none placeholder:text-[#607186]"
                    placeholder="Why this signal matters right now."
                  />
                </label>

                {!isConnected ? (
                  <button
                    className="w-full rounded-[20px] bg-[#E8EEF7] px-4 py-3 text-base font-black uppercase text-[#0D1117]"
                    onClick={connectWallet}
                  >
                    Connect wallet
                  </button>
                ) : chainId !== base.id ? (
                  <button
                    className="w-full rounded-[20px] bg-[#D6E7FF] px-4 py-3 text-base font-black uppercase text-[#0D1117] disabled:opacity-60"
                    disabled={switching}
                    onClick={() => switchChain({ chainId: base.id })}
                  >
                    {switching ? "Switching..." : "Switch to Base"}
                  </button>
                ) : (
                  <button
                    className="w-full rounded-[20px] bg-[#E8EEF7] px-4 py-3 text-base font-black uppercase text-[#0D1117] disabled:opacity-60"
                    disabled={!canPublish || writing || confirming}
                    onClick={publishSignal}
                  >
                    {writing || confirming ? "Broadcasting..." : "Broadcast signal"}
                  </button>
                )}

                <p className="text-sm leading-6 text-[#94A8BF]">{statusText}</p>
              </div>
            </section>

            <section className="rounded-[30px] border border-[#344153] bg-[linear-gradient(180deg,#1A1F27_0%,#0F131A_100%)] p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-[14px] border border-[#49586B] bg-[#11151B] text-[#D9E6F5]">
                  <ScanSearch className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-3xl font-black uppercase tracking-[0.04em] text-white">
                    Lookup
                  </h2>
                  <p className="text-sm font-semibold text-[#94A8BF]">
                    Pull a prior board call by ID.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-[0.22em] text-[#8FA6C0]">
                    Signal ID
                  </span>
                  <input
                    value={signalIdInput}
                    onChange={(event) => setSignalIdInput(event.target.value)}
                    inputMode="numeric"
                    className="mt-2 w-full rounded-[18px] border border-[#3B4758] bg-[#0C1016] px-4 py-3 text-base font-black text-white outline-none"
                  />
                </label>

                <div className="rounded-[22px] border border-[#3B4758] bg-[#0C1016] p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#8FA6C0]">
                    Current signal
                  </p>
                  <p className="mt-2 text-xl font-black uppercase text-white">
                    {signal?.title || "Waiting for first signal"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#94A8BF]">
                    {signal?.note ||
                      "Once a signal exists onchain, this panel shows direction, intensity, context, and author."}
                  </p>
                </div>
              </div>
            </section>
          </aside>

          <section className="grid gap-4">
            <section className="rounded-[34px] border border-[#344153] bg-[linear-gradient(180deg,#1A1F27_0%,#0F131A_100%)] p-5">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div>
                  <p className="inline-flex items-center gap-2 rounded-full border border-[#49586B] bg-[#11151B] px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[#8FA6C0]">
                    <RadioTower className="h-3.5 w-3.5" />
                    Live conviction layer
                  </p>
                  <h2 className="mt-4 max-w-4xl text-4xl font-black uppercase leading-[0.94] text-white sm:text-5xl">
                    A chain-native board for directional calls, not a sleepy text log.
                  </h2>
                  <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-[#94A8BF] sm:text-lg">
                    Write a signal title, choose up, down, or hold, set the intensity, and leave a reason others can actually read.
                  </p>
                </div>

                <div className="grid gap-3">
                  <div className="rounded-[26px] border border-[#49586B] bg-[#0C1016] p-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#8FA6C0]">
                      Total signals
                    </p>
                    <p className="mt-2 text-5xl font-black text-white">{totalSignals || "00"}</p>
                    <p className="mt-2 text-sm font-semibold text-[#94A8BF]">Board entries on Base</p>
                  </div>
                  <div
                    className="rounded-[26px] border p-5"
                    style={{
                      borderColor: `${activeDirection.tone}66`,
                      backgroundColor: `${activeDirection.tone}14`,
                    }}
                  >
                    <p className="text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: activeDirection.tone }}>
                      Current bias
                    </p>
                    <p className="mt-2 text-3xl font-black uppercase text-white">
                      {signal?.direction || direction}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#D8E4F1]">
                      Intensity {liveIntensity}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[34px] border border-[#344153] bg-[linear-gradient(180deg,#B6C2D0_0%,#8896A5_100%)] p-[2px] shadow-[0_28px_70px_rgba(0,0,0,0.35)]">
              <div className="rounded-[32px] bg-[#0D1117] p-5">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="rounded-[28px] border border-[#364353] bg-[#0A0D12] p-4">
                    <div className="rounded-[20px] border border-[#445062] bg-[#171D25] px-4 py-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#8FA6C0]">
                        Flip board
                      </p>
                      <div className="mt-4 space-y-3">
                        <FlipText value={(signal?.title || title).padEnd(18, " ").slice(0, 18)} />
                        <FlipText value={(signal?.direction || direction).padEnd(8, " ").slice(0, 8)} tone={activeDirection.tone} />
                        <FlipText value={`INT ${String(liveIntensity).padStart(3, "0")}`} tone="#D6E7FF" />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {[
                        ["Direction", signal?.direction || direction],
                        ["Intensity", String(liveIntensity)],
                        ["Date", formatDate(signal?.createdAt)],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-[18px] border border-[#364353] bg-[#11151B] p-4">
                          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#8FA6C0]">
                            {label}
                          </p>
                          <p className="mt-2 text-lg font-black uppercase text-white">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <div className="rounded-[26px] border border-[#364353] bg-[#11151B] p-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#8FA6C0]">
                        Signal note
                      </p>
                      <p className="mt-3 text-sm font-semibold leading-7 text-[#D8E4F1]">
                        {signal?.note || note}
                      </p>
                    </div>
                    <div className="rounded-[26px] border border-[#364353] bg-[#11151B] p-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#8FA6C0]">
                        Author
                      </p>
                      <p className="mt-2 text-lg font-black uppercase text-white">
                        {signal?.author && signal.author !== ZERO_ADDRESS
                          ? shortAddress(signal.author)
                          : "--"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-3 md:grid-cols-3">
              {[
                ["01", "Pick direction", "Up, down, or hold with intent"],
                ["02", "Set strength", "Use a clean 0-100 intensity score"],
                ["03", "Broadcast on Base", "Store the call with context and date"],
              ].map(([step, label, sub]) => (
                <div
                  key={step}
                  className="rounded-[24px] border border-[#344153] bg-[linear-gradient(180deg,#1A1F27_0%,#0F131A_100%)] p-4"
                >
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8FA6C0]">
                    Step {step}
                  </p>
                  <p className="mt-2 text-xl font-black uppercase text-white">{label}</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[#94A8BF]">{sub}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
