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

async function getBitcoinInfo() {
	try {
		const blockchainInfo = await client.getBlockchainInformation();
		console.log('Blockchain Info:', blockchainInfo);
		return blockchainInfo;
	} catch (error) {
		console.error('Failed to get blockchain info:', error);
		throw error;
	}
}

async function setupWallet(walletName: string) {
	try {
		// get all wallets
		const allWallets = await client.command('listwallets');

		// create wallet if not available
		if (!allWallets.includes(walletName)) {
			const wallet = await client.command('createwallet', walletName);
		} else {
			const loadWallet = await client.command('getwalletinfo');
		}

		// get addresses
		let address = '';
		const addresses = await client.command(
			'listreceivedbyaddress',
			1,
			true
		);
		console.log({ addresses });

		if (addresses.length == 0) {
			// Get a new address from the wallet
			address = await client.command('getnewaddress');
			console.log({ message: 'New Address:', address, walletName });
		} else {
			address = addresses.at(0).address;
		}

		return { address, walletName };
	} catch (error: any) {
		// If wallet already exists, load it
		if (error.message.includes('Database already exists')) {
			await client.command('loadwallet', 'bob');
			console.log('Existing wallet loaded');
		} else {
			throw error;
		}
	}
}

async function createTx() {
	try {
		// opcodes
		const ops = [
			bitcoin.opcodes.OP_5,
			bitcoin.opcodes.OP_8,
			bitcoin.opcodes.OP_ADD,
			bitcoin.opcodes.OP_13,
			bitcoin.opcodes.OP_EQUAL,
		];

		// redeem script
		const redeemScript = bitcoin.script.compile(ops);

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
		console.error('Failed to generate new block:', error);
		throw error;
	}
}

async function main() {
	try {
		// await getBitcoinInfo();
		const alice = await setupWallet('alice');
		console.log({ alice });

		await createTx();
	} catch (error) {
		console.error('Main execution failed:', error);
		process.exit(1);
	}
}

if (require.main === module) {
	main();
}

export { getBitcoinInfo };
