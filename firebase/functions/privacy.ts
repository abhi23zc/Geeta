import { onRequest } from 'firebase-functions/v2/https';
import { defineString } from 'firebase-functions/params';

const operator = defineString('PRIVACY_OPERATOR', { default: 'Atharv Kumar' });
const contact = defineString('PRIVACY_CONTACT_EMAIL', { default: 'webifyit.in@gmail.com' });
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function privacyHtml(name: string, email: string) {
  if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('A privacy operator and valid contact email are required');
  const owner = escapeHtml(name), address = escapeHtml(email);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Aarambh Privacy Policy</title>
<style>body{margin:0;background:#faf7f1;color:#29251f;font:17px/1.7 system-ui,sans-serif}main{max-width:780px;margin:auto;padding:48px 24px}h1{font-size:36px;line-height:1.2}h2{font-size:23px;margin-top:32px}a{color:#805015;overflow-wrap:anywhere}footer{margin-top:40px;border-top:1px solid #ddd;padding-top:20px}li{margin-bottom:8px}</style></head>
<body><main><h1>Aarambh Privacy Policy</h1><p>Effective date: October 12, 2026</p>
<p>Aarambh: Gita &amp; Morning Ritual (Android package <strong>com.zrf.aarambh</strong>) is operated by ${owner}. This policy explains how the released app handles information when you use its morning alarms, breathing practices, Gita teachings, quizzes, downloads and notifications.</p>
<h2>Information stored on your device</h2><p>Alarm settings, tasks, reflections, quiz answers and history, learning progress, saved teachings, downloaded audio and app preferences are stored locally. Personal task and reflection text and individual quiz answers are not uploaded by the notification system. Android backup or device-transfer settings may affect whether local app data is backed up by your device provider.</p>
<h2>Information processed by our online services</h2><p>No name, email or password is required to use the app. Its notification service uses Firebase Anonymous Authentication to create a persistent installation identifier. When the app connects to that service, it may transmit:</p>
<ul><li>An anonymous Firebase user ID, app user code and Firebase Cloud Messaging push token.</li><li>Notification preferences and permission status, language, timezone, app version and activity timestamps.</li><li>A limited activity summary: most recent practice and quiz completion dates, streak count and whether you have saved teachings.</li><li>Notification delivery status, errors and whether an announcement was opened.</li></ul>
<p>Requests for teachings and audio include the requested dates or files. Google/Firebase infrastructure may process IP addresses, request metadata and operational logs. The content service temporarily uses a hashed IP address to limit excessive requests.</p>
<h2>How we use information</h2><p>We use this information to deliver content, send announcements according to your preferences, select relevant notification audiences using language and activity summaries, avoid duplicate notifications, measure announcement delivery and openings, troubleshoot failures and protect our services.</p>
<h2>Permissions</h2><p>Notification permission enables reminders and announcements. Alarm, full-screen presentation and background-related settings support timely morning alarms and their lock-screen presentation. Audio playback and vibration support the ritual experience. These permissions do not grant us access to your contacts, photos or precise location.</p>
<h2>Service providers and sharing</h2><p>We use Google Firebase and Google Cloud for authentication, messaging, content storage, databases and server operations. They process information needed to provide these services; see <a href="https://policies.google.com/privacy">Google's Privacy Policy</a>. Authorized app administrators can access notification installation records and activity summaries for these purposes. We do not sell user information or use it for third-party advertising. We may disclose information when required by law or necessary to protect users and our services.</p>
<p>The current production release does not enable subscriptions or initialize RevenueCat purchases. If a future release changes these practices, we will update this policy.</p>
<h2>Retention and security</h2><p>Local information remains until you remove it using available app controls or clear app storage. Server-side installation identifiers and notification preferences remain until the operator removes them; uninstalling the app does not automatically delete these records. Notification delivery details and recipient snapshots are scheduled for deletion after 90 days from campaign expiry, and administrative audit records after 90 days. Aggregate campaign counts may remain. Infrastructure logs follow the service's configured retention.</p>
<p>Connections to the production services use HTTPS. Backend access controls restrict notification records and administrative operations. No storage or transmission method is completely secure.</p>
<h2>Your choices and deletion requests</h2><p>You can disable announcements in the app or revoke notification permission in Android settings. Changes made offline reach our servers when the app next connects; previously submitted notifications may still arrive. Clearing Android app storage removes local information but does not automatically remove server records.</p>
<p>To request deletion of server-side information, email <a href="mailto:${address}">${address}</a> with the subject “Aarambh data deletion” and your app user code, if available. If you cannot find the code, contact us for help identifying the installation. We may request information needed to verify the request. Relevant legal or security obligations may require limited retention.</p>
<h2>Children and changes to this policy</h2><p>If a parent or guardian believes a child has provided information through the app, contact us to request review and deletion. We will update this page when our data practices change and revise the effective date.</p>
<footer><strong>Privacy contact</strong><p>${owner}<br><a href="mailto:${address}">${address}</a></p></footer></main></body></html>`;
}

export const privacyPolicy = onRequest({ region: 'asia-south1', invoker: 'public', memory: '256MiB', maxInstances: 3 }, (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.set('Allow', 'GET, HEAD').status(405).send('Method not allowed'); return; }
  res.set('Cache-Control', 'public, max-age=300').set('X-Content-Type-Options', 'nosniff').set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'").type('html').status(200).send(privacyHtml(operator.value(), contact.value()));
});
