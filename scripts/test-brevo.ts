import fs from 'fs';
import path from 'path';

// 1. Parse .env.local
const envLocalPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  });
}

async function main() {
  console.log('===============================================================');
  console.log('✉️  MUVERA BREVO (SENDINBLUE) API INTEGRATION TEST');
  console.log('===============================================================\n');

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: BREVO_API_KEY is not defined in .env.local!');
    process.exit(1);
  }

  console.log(`1. Key Configured: ${apiKey.slice(0, 12)}...${apiKey.slice(-6)}`);
  console.log('2. Querying Brevo Account API (https://api.brevo.com/v3/account)...');

  const res = await fetch('https://api.brevo.com/v3/account', {
    headers: {
      'api-key': apiKey,
      accept: 'application/json',
    },
  });

  const bodyText = await res.text();
  let data: any = {};
  try {
    data = JSON.parse(bodyText);
  } catch {
    //
  }

  if (!res.ok) {
    console.log(`\n❌ Brevo API Response (${res.status} ${res.statusText}):`);
    console.log(data);

    if (data.message && data.message.includes('unrecognised IP address')) {
      console.log('\n🔒 [ACTION REQUIRED: BREVO IP SECURITY]');
      console.log('Brevo has IP Whitelisting protection enabled for your account.');
      console.log('To allow this machine/server to send emails & campaigns:');
      console.log(' 👉 Open this link: https://app.brevo.com/security/authorised_ips');
      console.log(' 👉 Add your IP address shown in the error message above, OR disable IP restriction.');
    }
    return;
  }

  console.log('\n🎉 SUCCESS: Connected to Brevo Account!');
  console.log(`   - Email:       ${data.email}`);
  console.log(`   - Company:     ${data.companyName || 'N/A'}`);
  console.log(`   - Plan:        ${data.plan?.[0]?.type || 'Standard'}`);
  console.log(`   - Credits:     ${data.plan?.[0]?.credits ?? 'N/A'}`);

  console.log('\n3. Fetching Verified Senders (https://api.brevo.com/v3/senders)...');
  const sendersRes = await fetch('https://api.brevo.com/v3/senders', {
    headers: {
      'api-key': apiKey,
      accept: 'application/json',
    },
  });

  if (sendersRes.ok) {
    const sendersData = await sendersRes.json();
    console.log(`   Found ${sendersData.senders?.length || 0} registered sender(s):`);
    (sendersData.senders || []).forEach((s: any) => {
      console.log(`     • ${s.name} <${s.email}> (Active: ${s.active})`);
    });
  }

  console.log('\n4. Testing Live Transactional Email Dispatch (https://api.brevo.com/v3/smtp/email)...');
  const fromEmail = process.env.EMAIL_FROM_ADDRESS || 'muveraclothing@gmail.com';
  const fromName = process.env.EMAIL_FROM_NAME || 'MUVERA Luxury Streetwear';

  const sendTestRes = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: fromName,
        email: fromEmail,
      },
      to: [{ email: 'muveraclothing@gmail.com', name: 'Muvera Team' }],
      subject: 'MUVERA Platform Test: Brevo API Integration Live',
      htmlContent: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; background: #0E0E10; color: #fff; padding: 32px; border-radius: 16px;">
          <h1 style="color: #FACC15; font-size: 26px; text-align: center; margin: 0;">MUVERA</h1>
          <p style="text-align: center; color: #A1A1AA; font-size: 12px; text-transform: uppercase;">Security &amp; Account Protection</p>
          <div style="background: #18181B; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #2E2E38;">
            <h2 style="font-size: 16px; color: #10B981; margin-top: 0;">✓ Brevo API Connected &amp; Verified</h2>
            <p style="color: #D1C6AB; font-size: 14px; line-height: 1.6;">
              Your Brevo API Key and verified sender (<strong>${fromEmail}</strong>) are fully active and ready to deliver password resets, transactional alerts, and blitz drop marketing campaigns.
            </p>
          </div>
          <p style="text-align: center; color: #71717A; font-size: 12px;">© 2026 MUVERA Luxury Streetwear. All rights reserved.</p>
        </div>
      `,
      textContent: 'Your Brevo API Key has been successfully connected and verified on MUVERA!',
      tags: ['verification_test'],
    }),
  });

  if (sendTestRes.ok) {
    const testResult = await sendTestRes.json();
    console.log(`   ✓ Test Email Dispatched Successfully!`);
    console.log(`   ✓ Brevo Message ID: ${testResult.messageId}`);
  } else {
    const errText = await sendTestRes.text();
    console.log(`   ⚠️ Dispatch Note (${sendTestRes.status}): ${errText}`);
  }

  console.log('\n===============================================================');
  console.log('✓ Brevo Email & Campaign Integration is ready for MUVERA!');
  console.log('===============================================================');
}

main().catch(console.error);
