import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';
import { maskPhone } from '../utils/phone.js';

/** Send the login code. Add more providers (MSG91, AWS SNS…) by adding a branch here. */
export async function sendLoginCode(phone: string, code: string) {
  const text = `${code} is your Loop login code. It expires in 5 minutes. Do not share it.`;

  if (env.SMS_PROVIDER === 'console') {
    console.log(`\n📱 Login code for ${phone}: ${code}\n`);
    return;
  }

  if (env.SMS_PROVIDER === 'twilio') {
    const sid = env.TWILIO_ACCOUNT_SID!;
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: phone, From: env.TWILIO_FROM!, Body: text }),
    });
    if (!res.ok) {
      console.error(`Twilio error for ${maskPhone(phone)}:`, res.status, await res.text().catch(() => ''));
      throw new HttpError(502, 'sms_failed', 'Could not send the SMS. Check the number and try again.');
    }
  }
}
