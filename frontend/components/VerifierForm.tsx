"use client";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ArciumClient } from "@arcium-hq/client"; // Import Arcium SDK
import * as snarkjs from "snarkjs";
import { Zkverifier } from "../../contracts/target/types/zkverifier"; // IDL

export function VerifierForm() {
  const [age, setAge] = useState<number>(0);
  const [status, setStatus] = useState<string>("");
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();

  const provider = new anchor.AnchorProvider(connection, { publicKey, signTransaction } as any, {});
  const program = new Program<Zkverifier>(/* IDL */, "YourProgramIdHere", provider);

  const handleSubmit = async () => {
    if (!publicKey) return setStatus("Connect wallet");

    setStatus("Encrypting and computing...");

    // Arcium integration: Assume a pre-deployed MXE for simple >18 check
    const client = new ArciumClient(process.env.ARCIUM_API_KEY);
    const encryptedInput = client.encrypt({ value: age }); // Simplified

    const taskId = await client.submitTask({
      mxeId: "test-mxe", // Replace with real
      inputs: encryptedInput,
      computation: "check_age > 18", // Pseudo
    });

    const result = await client.waitForResult(taskId); // { isCompliant: true, commitment }

    setStatus("Generating zk proof...");

    // Generate zk proof
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      { value: age },
      "/circuits/build/compliance.wasm",
      "/circuits/build/compliance_final.zkey"
    );

    const proofBytes = /* pack proof to [u8;32] */ Buffer.from(JSON.stringify(proof)).slice(0,32); // Simplified
    const publicInputs = Buffer.from(JSON.stringify(publicSignals));

    setStatus("Verifying on-chain...");

    const [verificationState] = anchor.web3.PublicKey.findProgramAddressSync(
      [publicKey.toBuffer()],
      program.programId
    );

    const [verifierState] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("verifier")],
      program.programId
    );

    await program.methods
      .verifyProof(proofBytes, Array.from(publicInputs))
      .accounts({
        verificationState,
        verifierState,
      })
      .rpc();

    setStatus("Verified! Compliant: " + result.isCompliant);
  };

  return (
    <div className="space-y-4">
      <Input
        type="number"
        placeholder="Enter age"
        value={age}
        onChange={(e) => setAge(parseInt(e.target.value))}
      />
      <Button onClick={handleSubmit}>Verify Compliance</Button>
      <p>{status}</p>
    </div>
  );
}