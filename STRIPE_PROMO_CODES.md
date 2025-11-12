# Stripe Promo Codes Setup Guide

## Overview
PSForge now supports promo codes for offering free trials and discounts during checkout. Users can enter a promo code during the upgrade process to receive special offers like 30-day free trials.

## How Promo Codes Work

1. **User Experience:**
   - User clicks "Upgrade to Pro" 
   - Upgrade modal displays with promo code input field
   - User enters promo code (optional)
   - System validates code before redirecting to Stripe Checkout
   - If valid, discount is automatically applied at checkout
   - Payment method is still required even for free trials

2. **Technical Implementation:**
   - Frontend: Promo code input field in `UpgradeModal` component
   - Backend: Validates promo code with Stripe API before creating checkout session
   - Stripe: Applies discount/trial based on promotion code configuration

## Creating a 30-Day Free Trial Promo Code in Stripe

### Step 1: Create a Coupon

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to **Products** → **Coupons**
3. Click **Create coupon**
4. Configure the coupon:
   - **Name:** `30-Day Free Trial` (internal name)
   - **Coupon ID:** Leave blank (auto-generated) or set custom ID
   - **Type:** Select **Duration**
   - **Duration:** Select **Repeating**
   - **Duration in months:** Enter `1` (for 30 days)
   - **Discount type:** Select **Percentage**
   - **Percent off:** Enter `100` (100% off for free trial)
   - **Redeem by:** Leave blank (no expiration) or set date
   - **Max redemptions:** Leave blank (unlimited) or set limit
   - **One time per customer:** Check this box (recommended)
5. Click **Create coupon**

### Step 2: Create a Promotion Code

1. After creating the coupon, click **Add promotion code**
2. Configure the promotion code:
   - **Promotion code:** Enter your code (e.g., `TRIAL30`, `WELCOME30`)
     - **Important:** Codes are case-insensitive in Stripe
     - Use uppercase letters and numbers
     - Examples: `TRIAL30`, `WELCOME2025`, `FREEMONTH`
   - **Customer-facing description:** Enter description shown to customers
     - Example: `30-day free trial - Start your Pro subscription today!`
   - **Coupon:** Select the coupon you just created
   - **Active:** Make sure this is checked
   - **Redeem by:** Optional expiration date
   - **Max redemptions:** Optional limit on total uses
   - **Minimum amount:** Leave blank (no minimum)
   - **First-time customers only:** Optional restriction
3. Click **Create promotion code**

### Step 3: Test the Promo Code

1. In PSForge, click "Upgrade to Pro"
2. Enter your promo code in the "Promo Code" field
3. Click "Upgrade Now"
4. Verify the promo code is applied at Stripe Checkout:
   - Should show "100% off for 1 month"
   - Should still require payment method entry
   - Should show $0.00 due today, $5.00 starting next month

## Example Promo Code Configurations

### Configuration 1: 30-Day Free Trial
**Use Case:** New customers get first month free
```
Coupon:
- Type: Duration
- Duration: Repeating (1 month)
- Discount: 100% off

Promotion Code: TRIAL30
```

### Configuration 2: 50% Off First Month
**Use Case:** Introductory discount
```
Coupon:
- Type: Duration
- Duration: Repeating (1 month)
- Discount: 50% off

Promotion Code: SAVE50
```

### Configuration 3: $2 Off Forever
**Use Case:** Lifetime discount
```
Coupon:
- Type: Duration
- Duration: Forever
- Discount: $2.00 off

Promotion Code: LIFETIME2
```

### Configuration 4: Limited Time Offer
**Use Case:** Holiday promotion (expires Dec 31, 2025)
```
Coupon:
- Type: Duration
- Duration: Repeating (1 month)
- Discount: 100% off

Promotion Code: HOLIDAY2025
- Redeem by: 2025-12-31
- Max redemptions: 100
```

## How to Share Promo Codes with Users

1. **Email Campaigns:** Include promo code in welcome emails or newsletters
2. **Social Media:** Post promo codes for special occasions
3. **Support Tickets:** Provide codes for customer support cases
4. **Partners:** Create partner-specific codes for tracking

## Promo Code Validation

The system validates promo codes automatically:

✅ **Valid Code:**
- Code exists in Stripe
- Code is active
- Code hasn't expired
- User hasn't exceeded redemption limits
- User proceeds to checkout with discount applied

❌ **Invalid Code:**
- User receives error message: "Invalid promo code"
- User can either:
  - Try a different code
  - Proceed without a code
  - Cancel checkout

## Important Notes

### Payment Method Required
- Even with 100% off promo codes, Stripe **requires payment method entry**
- This ensures automatic billing after the trial period
- Users won't be charged until trial expires
- This prevents trial abuse

### Trial Subscription Flow
1. User enters promo code → Checkout → Enters payment info
2. Subscription starts with $0.00 charge (100% discount)
3. Webhook activates Pro subscription immediately
4. After 30 days, regular $5/month billing begins
5. User can cancel anytime before trial ends

### Multiple Promo Codes
- **At PSForge:** Users can only apply ONE promo code per checkout
- **At Stripe Checkout:** Users can manually add codes if `allow_promotion_codes` is enabled
- First-applied code takes precedence

### Tracking Promo Code Usage

View promo code analytics in Stripe Dashboard:
1. Go to **Products** → **Coupons**
2. Click on your coupon
3. View **Promotion codes** tab
4. See redemption count, revenue impact, and customer list

## API Reference

### Frontend (UpgradeModal)
```typescript
// User enters promo code in input field
<Input
  value={promoCode}
  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
  placeholder="Enter promo code"
/>

// Sent to backend on checkout
const response = await apiRequest("POST", "/api/billing/checkout", {
  promoCode: promoCode.trim() || undefined
});
```

### Backend (Checkout Endpoint)
```typescript
// Validates and applies promo code
const promotionCodes = await stripe.promotionCodes.list({
  code: promoCode.trim().toUpperCase(),
  active: true,
  limit: 1,
});

if (promotionCodes.data.length > 0) {
  sessionConfig.discounts = [{
    promotion_code: promotionCodes.data[0].id,
  }];
}
```

## Troubleshooting

### "Invalid promo code" Error
**Causes:**
- Code doesn't exist in Stripe
- Code is inactive
- Code has expired
- Code has reached max redemptions
- Code is misspelled

**Solution:** Check Stripe Dashboard → Products → Coupons → Promotion codes

### Promo Code Applied But Shows Full Price
**Causes:**
- Coupon amount is less than 100%
- Coupon applies to future months, not first month

**Solution:** Verify coupon configuration shows "100% off" for duration "1 month"

### Payment Method Still Required
**Expected behavior** - Stripe requires payment method for all subscriptions, including trials

## Security Considerations

✅ **Best Practices:**
- Use unique, hard-to-guess codes for valuable offers
- Set expiration dates on time-limited promotions
- Limit redemptions to prevent abuse
- Enable "One time per customer" for trial codes
- Monitor usage in Stripe Dashboard

❌ **Avoid:**
- Generic codes like `FREE` or `TRIAL`
- Sharing the same code publicly for long periods
- Creating codes without redemption limits
- Forgetting to deactivate expired promotions

## Need Help?

- **Stripe Documentation:** [Promotion Codes](https://stripe.com/docs/billing/subscriptions/coupons)
- **Stripe Support:** [Contact Stripe](https://support.stripe.com)
- **PSForge Support:** Check the application support page

---

**Last Updated:** January 2025  
**Version:** PSForge 3.0
