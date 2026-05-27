import Razorpay from 'razorpay';

const keyId = process.env.RAZORPAY_KEY_ID ?? '';
const keySecret = process.env.RAZORPAY_KEY_SECRET ?? '';
const mode = process.env.RAZORPAY_MODE ?? 'test';

if (mode === 'live' && process.env.NODE_ENV !== 'production') {
  throw new Error(
    '[PaySys] LIVE Razorpay mode in non-production environment is strictly forbidden.',
  );
}

if (process.env.NODE_ENV !== 'production' && !keyId.startsWith('rzp_test_')) {
  throw new Error(
    '[PaySys] Non-test Razorpay key in non-production environment. Only rzp_test_ keys are permitted.',
  );
}

if (!keyId || !keySecret) {
  throw new Error(
    '[PaySys] Razorpay credentials missing. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.',
  );
}

export const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});
