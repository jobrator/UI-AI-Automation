import { Locator } from 'playwright';
import { CustomWorld } from './world';

/**
 * Pick a CV inside the "Apply for this job" modal.
 *
 * The CV picker is NOT a <select> — it is a custom dropdown rendered as a
 * "Select a CV" trigger plus a list of the candidate's uploaded documents.
 * Submitting without choosing one makes `POST /job-posts/<id>/apply` return 500
 * (surfaced in the UI as the misleading "You can apply to a job Only Once!"),
 * which is why every earlier apply attempt failed.
 */
export async function selectCvInApplyModal(world: CustomWorld, dialog: Locator): Promise<boolean> {
  const page = world.page;

  // Legacy native-select form, in case the build changes back.
  const nativeSelect = dialog.locator('select').first();
  if (await nativeSelect.isVisible({ timeout: 1500 }).catch(() => false)) {
    for (const option of await nativeSelect.locator('option').all()) {
      const value = await option.getAttribute('value');
      if (value && !/select/i.test((await option.innerText().catch(() => '')) || '')) {
        await nativeSelect.selectOption({ value });
        return true;
      }
    }
  }

  const trigger = dialog.locator('button:has-text("Select a CV"), [class*="select"]:has-text("Select a CV")')
    .filter({ visible: true }).first();
  if (!(await trigger.isVisible({ timeout: 4000 }).catch(() => false))) return false;
  await trigger.click().catch(() => {});
  await page.waitForTimeout(1200);

  const option = page
    .locator('li:visible, [role="option"]:visible, .dropdown-item:visible, [class*="option"]:visible')
    .filter({ hasText: /CV|Resume|\.pdf|\.docx?/i })
    .first();
  if (!(await option.isVisible({ timeout: 4000 }).catch(() => false))) return false;
  const label = ((await option.textContent().catch(() => '')) ?? '').trim();
  await option.click().catch(() => {});
  await page.waitForTimeout(900);
  world.logMessage(`[Journey/Bridge] Attached CV "${label}" in the apply modal.`);
  return true;
}
