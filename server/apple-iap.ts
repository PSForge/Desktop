import { storage } from './storage';
import type { InsertAppleTransaction, InsertAppleNotificationEvent, AppleTransactionStatus } from '@shared/schema';

const APPLE_PRODUCTION_VERIFY_URL = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_SANDBOX_VERIFY_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';

interface AppleReceiptResponse {
  status: number;
  environment?: string;
  receipt?: {
    bundle_id: string;
    in_app: Array<{
      transaction_id: string;
      original_transaction_id: string;
      product_id: string;
      purchase_date_ms: string;
      expires_date_ms?: string;
      is_trial_period?: string;
      is_in_intro_offer_period?: string;
    }>;
  };
  latest_receipt_info?: Array<{
    transaction_id: string;
    original_transaction_id: string;
    product_id: string;
    purchase_date_ms: string;
    expires_date_ms?: string;
    is_trial_period?: string;
    is_in_intro_offer_period?: string;
  }>;
  pending_renewal_info?: Array<{
    auto_renew_status: string;
    expiration_intent?: string;
    is_in_billing_retry_period?: string;
  }>;
}

export interface AppleNotificationPayloadV2 {
  notificationType: string;
  subtype?: string;
  notificationUUID?: string;
  data?: {
    signedTransactionInfo?: string;
    signedRenewalInfo?: string;
    environment?: string;
    bundleId?: string;
  };
}

export interface DecodedTransactionInfo {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  purchaseDate: number;
  expiresDate?: number;
  environment?: string;
  bundleId?: string;
}

export async function verifyReceipt(
  receiptData: string,
  excludeOldTransactions: boolean = true
): Promise<AppleReceiptResponse | null> {
  const sharedSecret = process.env.APPLE_SHARED_SECRET;
  
  if (!sharedSecret) {
    console.error('APPLE_SHARED_SECRET not configured');
    return null;
  }

  const requestBody = {
    'receipt-data': receiptData,
    'password': sharedSecret,
    'exclude-old-transactions': excludeOldTransactions,
  };

  try {
    let response = await fetch(APPLE_PRODUCTION_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    let result: AppleReceiptResponse = await response.json();

    if (result.status === 21007) {
      response = await fetch(APPLE_SANDBOX_VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      result = await response.json();
    }

    return result;
  } catch (error) {
    console.error('Apple receipt verification failed:', error);
    return null;
  }
}

function base64urlDecode(input: string): string {
  let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = base64.length % 4;
  if (padding) {
    base64 += '='.repeat(4 - padding);
  }
  return Buffer.from(base64, 'base64').toString('utf-8');
}

export function decodeAppleJWT(signedPayload: string): any | null {
  try {
    const parts = signedPayload.split('.');
    if (parts.length !== 3) return null;
    
    const payload = parts[1];
    const decoded = base64urlDecode(payload);
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Failed to decode Apple JWT:', error);
    return null;
  }
}

export function mapAppleNotificationToStatus(
  notificationType: string,
  subtype?: string
): AppleTransactionStatus {
  switch (notificationType) {
    case 'SUBSCRIBED':
    case 'DID_RENEW':
    case 'DID_RECOVER':
    case 'OFFER_REDEEMED':
    case 'RENEWAL_EXTENDED':
      return 'active';
    
    case 'EXPIRED':
      if (subtype === 'VOLUNTARY') {
        return 'canceled';
      }
      return 'expired';
    
    case 'DID_CHANGE_RENEWAL_STATUS':
      if (subtype === 'AUTO_RENEW_DISABLED') {
        return 'active';
      }
      if (subtype === 'AUTO_RENEW_ENABLED') {
        return 'active';
      }
      return 'active';
    
    case 'DID_FAIL_TO_RENEW':
      if (subtype === 'GRACE_PERIOD') {
        return 'grace_period';
      }
      return 'billing_retry';
    
    case 'GRACE_PERIOD_EXPIRED':
      return 'expired';
    
    case 'REFUND':
    case 'REFUND_DECLINED':
      return 'revoked';
      
    case 'REVOKE':
      return 'revoked';
    
    case 'CONSUMPTION_REQUEST':
      return 'active';
    
    case 'DID_CHANGE_RENEWAL_PREF':
    case 'PRICE_INCREASE':
      if (subtype === 'ACCEPTED') {
        return 'active';
      }
      return 'active';
    
    case 'TEST':
      return 'active';
    
    default:
      console.warn(`🍎 Unknown Apple notification type: ${notificationType}/${subtype}`);
      return 'active';
  }
}

export async function processAppleNotification(
  payload: AppleNotificationPayloadV2
): Promise<{ success: boolean; message: string; userId?: string }> {
  const startTime = Date.now();
  const { notificationType, subtype, notificationUUID, data } = payload;

  console.log(`🍎 Processing Apple notification: ${notificationType}${subtype ? `/${subtype}` : ''}`);

  let eventRecord: InsertAppleNotificationEvent = {
    notificationType,
    subtype: subtype || undefined,
    notificationUUID: notificationUUID || undefined,
    status: 'processing',
    payload: payload as any,
  };

  try {
    let transactionInfo: DecodedTransactionInfo | null = null;
    
    if (data?.signedTransactionInfo) {
      const decoded = decodeAppleJWT(data.signedTransactionInfo);
      if (decoded) {
        transactionInfo = {
          transactionId: decoded.transactionId,
          originalTransactionId: decoded.originalTransactionId,
          productId: decoded.productId,
          purchaseDate: decoded.purchaseDate,
          expiresDate: decoded.expiresDate,
          environment: data.environment || decoded.environment,
          bundleId: data.bundleId || decoded.bundleId,
        };
      }
    }

    if (!transactionInfo?.originalTransactionId) {
      eventRecord.status = 'failed';
      eventRecord.errorMessage = 'No transaction info found in notification';
      eventRecord.processingTimeMs = Date.now() - startTime;
      await storage.createAppleNotificationEvent(eventRecord);
      return { success: false, message: 'No transaction info found' };
    }

    eventRecord.originalTransactionId = transactionInfo.originalTransactionId;

    const existingTransaction = await storage.getAppleTransactionByOriginalId(
      transactionInfo.originalTransactionId
    );

    if (!existingTransaction) {
      eventRecord.status = 'failed';
      eventRecord.errorMessage = 'No matching user found for transaction';
      eventRecord.processingTimeMs = Date.now() - startTime;
      await storage.createAppleNotificationEvent(eventRecord);
      return { success: false, message: 'Transaction not linked to any user' };
    }

    eventRecord.userId = existingTransaction.userId;

    const newStatus = mapAppleNotificationToStatus(notificationType, subtype);
    
    await storage.updateAppleTransaction(existingTransaction.id, {
      status: newStatus,
      transactionId: transactionInfo.transactionId,
      expiresDate: transactionInfo.expiresDate 
        ? new Date(transactionInfo.expiresDate).toISOString() 
        : undefined,
    });

    const user = await storage.getUser(existingTransaction.userId);
    if (user) {
      if (newStatus === 'active' && user.role !== 'subscriber' && user.role !== 'admin') {
        await storage.updateUser(existingTransaction.userId, { role: 'subscriber' });
        console.log(`📈 User ${existingTransaction.userId} upgraded to subscriber via Apple`);
      } else if (
        (newStatus === 'expired' || newStatus === 'revoked' || newStatus === 'canceled') && 
        user.role === 'subscriber'
      ) {
        await storage.updateUser(existingTransaction.userId, { role: 'free' });
        console.log(`📉 User ${existingTransaction.userId} downgraded to free via Apple`);
      }
    }

    eventRecord.status = 'processed';
    eventRecord.processingTimeMs = Date.now() - startTime;
    await storage.createAppleNotificationEvent(eventRecord);

    console.log(`✅ Apple notification processed: ${notificationType} for user ${existingTransaction.userId}`);
    
    return { 
      success: true, 
      message: `Processed ${notificationType}`, 
      userId: existingTransaction.userId 
    };
  } catch (error: any) {
    console.error('Error processing Apple notification:', error);
    
    eventRecord.status = 'failed';
    eventRecord.errorMessage = error.message || 'Unknown error';
    eventRecord.processingTimeMs = Date.now() - startTime;
    
    try {
      await storage.createAppleNotificationEvent(eventRecord);
    } catch (logError) {
      console.error('Failed to log Apple notification event:', logError);
    }

    return { success: false, message: error.message || 'Processing failed' };
  }
}

export async function linkAppleTransactionToUser(
  userId: string,
  receiptData: string
): Promise<{ success: boolean; message: string; transaction?: any }> {
  const receiptResponse = await verifyReceipt(receiptData);
  
  if (!receiptResponse || receiptResponse.status !== 0) {
    const statusMessages: Record<number, string> = {
      21000: 'The App Store could not read the receipt',
      21002: 'The receipt data was malformed',
      21003: 'The receipt could not be authenticated',
      21004: 'The shared secret does not match',
      21005: 'The receipt server is not available',
      21006: 'This receipt is valid but the subscription has expired',
      21007: 'This receipt is from the sandbox environment',
      21008: 'This receipt is from the production environment',
      21010: 'This receipt could not be authorized',
    };
    
    const message = statusMessages[receiptResponse?.status || 0] || 'Receipt verification failed';
    return { success: false, message };
  }

  const latestReceipt = receiptResponse.latest_receipt_info?.[0] || 
                        receiptResponse.receipt?.in_app?.[0];

  if (!latestReceipt) {
    return { success: false, message: 'No transaction found in receipt' };
  }

  const transactionData: InsertAppleTransaction = {
    userId,
    originalTransactionId: latestReceipt.original_transaction_id,
    transactionId: latestReceipt.transaction_id,
    productId: latestReceipt.product_id,
    bundleId: receiptResponse.receipt?.bundle_id,
    purchaseDate: new Date(parseInt(latestReceipt.purchase_date_ms)).toISOString(),
    expiresDate: latestReceipt.expires_date_ms 
      ? new Date(parseInt(latestReceipt.expires_date_ms)).toISOString() 
      : undefined,
    isTrialPeriod: latestReceipt.is_trial_period === 'true',
    isInIntroOfferPeriod: latestReceipt.is_in_intro_offer_period === 'true',
    status: 'active',
    environment: receiptResponse.environment === 'Sandbox' ? 'sandbox' : 'production',
  };

  const existing = await storage.getAppleTransactionByOriginalId(latestReceipt.original_transaction_id);
  
  if (existing) {
    if (existing.userId !== userId) {
      return { success: false, message: 'Transaction already linked to another user' };
    }
    
    const updated = await storage.updateAppleTransaction(existing.id, {
      transactionId: transactionData.transactionId,
      expiresDate: transactionData.expiresDate,
      status: 'active',
    });
    
    return { success: true, message: 'Transaction updated', transaction: updated };
  }

  const transaction = await storage.createAppleTransaction(transactionData);

  await storage.updateUser(userId, { role: 'subscriber' });
  console.log(`📈 User ${userId} upgraded to subscriber via Apple IAP`);

  return { success: true, message: 'Transaction linked successfully', transaction };
}
