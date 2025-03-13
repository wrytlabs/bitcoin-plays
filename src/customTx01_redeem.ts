import Client from 'bitcoin-core';
import * as bitcoin from 'bitcoinjs-lib';

interface BitcoinConfig {
	network: string;
	host: string;
	username: string;
	password: string;
	wallet: string;
}

const config: BitcoinConfig = {
	network: 'regtest',
	host: 'http://127.0.0.1:18443',
	username: 'bitcoin',
	password: 'bitcoin',
	wallet: 'alice',
};

const client = new Client(config);

async function createTx0() {
	try {
		const secret = Buffer.from('secret data');
		const hash160 = bitcoin.crypto.hash160(secret);

		const addresses = await client.command(
			'listreceivedbyaddress',
			1,
			true
		);

		const addressInfo = await client.command(
			'getaddressinfo',
			addresses[0].address
		);
		const pubkey = Buffer.from(addressInfo.pubkey, 'hex');

		// redeem script
		const redeemScript = bitcoin.script.compile([
			bitcoin.opcodes.OP_IF,
			bitcoin.opcodes.OP_HASH160,
			hash160,
			bitcoin.opcodes.OP_EQUAL,
			bitcoin.opcodes.OP_ELSE,
			pubkey,
			bitcoin.opcodes.OP_CHECKSIG,
			bitcoin.opcodes.OP_ENDIF,
		]);

		// create the P2SH address from redeemScript
		const { address } = bitcoin.payments.p2sh({
			redeem: { output: redeemScript, network: bitcoin.networks.regtest },
			network: bitcoin.networks.regtest,
		});
		console.log('Custom Script Address (P2SH):', address);

		// input script
		const inputScript = bitcoin.script.compile([
			secret, // preimage
			bitcoin.opcodes.OP_TRUE, // take the IF branch
			redeemScript, // required for P2SH
		]);

		// funding tx
		const fundingTx =
			'9f71ceb4feaab6c8d8e209763e1e9bece87c0054024a234ae75a96082a5572ca';
		const fundingOut = 0;
		const fundingAmount = 100000000;

		const psbt = new bitcoin.Psbt({ network: bitcoin.networks.regtest });

		// Add the input
		psbt.addInput({
			hash: fundingTx,
			index: fundingOut,
			witnessUtxo: {
				script: redeemScript,
				value: fundingAmount,
			},
		});

		// Add the output
		const destinationAddress = addresses[0].address;
		const fee = 1000; // satoshis
		psbt.addOutput({
			address: destinationAddress,
			value: fundingAmount - fee,
		});

		// Finalize the input with our custom script
		psbt.finalizeInput(0, () => {
			return {
				finalScriptSig: inputScript,
				finalScriptWitness: undefined,
			};
		});

		// Extract transaction
		const tx = psbt.extractTransaction();
		const rawTx = tx.toHex();
		console.log('hex: ', rawTx);

		// Broadcast
		const txid = await client.command('sendrawtransaction', rawTx);
		console.log('Transaction broadcast:', txid);

		return txid;
	} catch (error) {
		console.error('Failed:', error);
		throw error;
	}
}

async function main() {
	try {
		await createTx0();
	} catch (error) {
		console.error('Main execution failed:', error);
		process.exit(1);
	}
}

if (require.main === module) {
	main();
}
