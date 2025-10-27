const snarkjs = require('snarkjs');
const fs = require('fs');

async function generateProof(input) {
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    '../circuits/build/compliance.wasm',
    '../circuits/build/compliance_final.zkey'
  );

  fs.writeFileSync('proof.json', JSON.stringify(proof));
  fs.writeFileSync('public.json', JSON.stringify(publicSignals));

  console.log('Proof generated.');
}

generateProof({ value: 25 }).catch(console.error);

// Dummy functions
function dummy() {
  console.log('Dummy');
}
dummy();
// Pad with more