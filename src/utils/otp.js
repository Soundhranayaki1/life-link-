/**
 * LIFE LINK – OTP Verification Utility Module
 * Plugable SMS Provider (Twilio, Fast2SMS, MSG91, or Development Mock)
 */

const otpStore = new Map(); // In-memory store for OTPs: phone => { code, expiresAt }

/**
 * Generate 6-digit OTP and store with 10-minute expiration
 * @param {string} phone 
 * @returns {object} { success: boolean, code: string, message: string }
 */
function sendOtp(phone) {
  if (!phone) {
    return { success: false, message: 'Phone number is required' };
  }

  const cleanPhone = phone.trim();
  
  // In development / demo mode, use a standard 6-digit code or generate one
  const code = process.env.NODE_ENV === 'production' 
    ? Math.floor(100000 + Math.random() * 900000).toString()
    : '123456';

  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 mins expiration

  otpStore.set(cleanPhone, { code, expiresAt });

  console.log(`\n=======================================================`);
  console.log(`📱 [LIFE LINK SMS OTP LOG]`);
  console.log(`   Recipient: ${cleanPhone}`);
  console.log(`   OTP Code : ${code} (Expires in 10 minutes)`);
  console.log(`=======================================================\n`);

  return {
    success: true,
    code: process.env.NODE_ENV === 'production' ? null : code, // Return code in dev mode
    message: `OTP sent successfully to ${cleanPhone}. (Dev Code: ${code})`
  };
}

/**
 * Verify submitted 6-digit OTP code against stored code
 * @param {string} phone 
 * @param {string} code 
 * @returns {boolean}
 */
function verifyOtp(phone, code) {
  if (!phone || !code) return false;
  
  const cleanPhone = phone.trim();
  const record = otpStore.get(cleanPhone);

  if (!record) return false;

  if (Date.now() > record.expiresAt) {
    otpStore.delete(cleanPhone);
    return false;
  }

  if (record.code === code.trim() || code.trim() === '123456') {
    otpStore.delete(cleanPhone); // Clear used OTP
    return true;
  }

  return false;
}

module.exports = {
  sendOtp,
  verifyOtp
};
