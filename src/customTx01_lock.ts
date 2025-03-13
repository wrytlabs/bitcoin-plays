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

async function createTx() {
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

		// 3. Fund that address with some coins
		const txid = await client.command('sendtoaddress', address!, 1);
		console.log('Funded TXID:', txid);
	} catch (error) {
		console.error('Failed:', error);
		throw error;
	}
}

async function main() {
	try {
		await createTx();
	} catch (error) {
		console.error('Main execution failed:', error);
		process.exit(1);
	}
}

if (require.main === module) {
	main();
}
