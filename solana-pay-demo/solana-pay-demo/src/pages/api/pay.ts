import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { encodeURL, findReference, validateTransfer } from '@solana/pay';
import BigNumber from 'bignumber.js';

// CONSTANTS
const myWallet = '3FXpM78re8qZu9sVDA7GXvmvWRbwT28RHbnx4nxfZ5sz'; // Replace with your wallet address (this is the destination where the payment will be sent)
const splToken = new PublicKey("5xFx6KRRP1M1Uf6ai5zvBQ9UxZNTeJqPwnm1tth75fbE");
const recipient = new PublicKey(myWallet);
const amount = new BigNumber(108); // 0.0001 SOL
const label = 'QuickNode Guide Store';
const memo = 'QN Solana Pay Demo Public Memo';
const quicknodeEndpoint = 'https://solana-mainnet.g.alchemy.com/v2/rMpMPyElirTfjAJMZZCIRXXA7hydMdvx'; // Replace with your QuickNode endpoint


async function generateUrl(
    recipient: PublicKey,
    amount: BigNumber,
    splToken: PublicKey,
    reference: PublicKey,
    label: string,
    message: string,
    memo: string,
  ) {
    const url: URL = encodeURL({
      recipient,
      amount,
      splToken,
      reference,
      label,
      message,
      memo,
    });
    return { url };
  }

  const paymentRequests = new Map<string, { recipient: PublicKey; amount: BigNumber; memo: string }>();

  async function verifyTransaction(reference: PublicKey) {
    // 1 - Check that the payment request exists
    const paymentData = paymentRequests.get(reference.toBase58());
    if (!paymentData) {
      throw new Error('Payment request not found');
    }
    const { recipient, amount, memo } = paymentData;
    // 2 - Establish a Connection to the Solana Cluster
    const connection = new Connection(quicknodeEndpoint, 'confirmed');
    console.log('recipient', recipient.toBase58());
    console.log('amount', amount);
    console.log('reference', reference.toBase58());
    console.log('memo', memo);
  
    // 3 - Find the transaction reference
    const found = await findReference(connection, reference);
    console.log(found.signature)
  
    // 4 - Validate the transaction
    const response = await validateTransfer(
      connection,
      found.signature,
      {
        recipient,
        amount,
        splToken: undefined,
        reference,
        //memo
      },
      { commitment: 'confirmed' }
    );
    // 5 - Delete the payment request from local storage and return the response
    if (response) {
      paymentRequests.delete(reference.toBase58());
    }
    return response;
  }


  export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
      try {
        const reference = new Keypair().publicKey;
        const message = `QuickNode Demo - Order ID #0${Math.floor(Math.random() * 999999) + 1}`;
        const urlData = await generateUrl(
          recipient,
          amount,
          splToken,
          reference,
          label,
          message,
          memo
        );
        const ref = reference.toBase58();
        paymentRequests.set(ref, { recipient, amount, memo });
        const { url } = urlData;
        res.status(200).json({ url: url.toString(), ref });
      } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
    else if (req.method === 'GET') {
        // 1 - Get the reference query parameter from the NextApiRequest
        const reference = req.query.reference;
        if (!reference) {
          res.status(400).json({ error: 'Missing reference query parameter' });
          return;
        }
        // 2 - Verify the transaction
        try {
          const referencePublicKey = new PublicKey(reference as string);
          const response = await verifyTransaction(referencePublicKey);
          if (response) {
            res.status(200).json({ status: 'verified' });
          } else {
            res.status(404).json({ status: 'not found' });
          }
        } catch (error) {
          console.error('Error:', error);
          res.status(500).json({ error: 'Internal Server Error' });
        }
      }

   
  }