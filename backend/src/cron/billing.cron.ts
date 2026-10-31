import cron from 'node-cron';
import { runBillingCycle } from '../services/billing.service.ts';

let task: cron.ScheduledTask | null = null;

export function initBillingCron() {
  if (process.env.NODE_ENV === 'test') {
    return; // Don't run background cron during unit tests
  }

  // Run every night at midnight (00:00)
  task = cron.schedule('0 0 * * *', async () => {
    console.log('⏰ [Cron] Starting scheduled nightly subscription billing run...');
    try {
      const result = await runBillingCycle();
      console.log(`⏰ [Cron] Finished nightly billing run: ${result.createdCount} invoices generated.`);
    } catch (err) {
      console.error('❌ [Cron] Error during scheduled billing run:', err);
    }
  });

  console.log('⏳ [Cron] Nightly subscription billing scheduler initialized (0 0 * * *).');
}

export function stopBillingCron() {
  if (task) {
    task.stop();
  }
}

