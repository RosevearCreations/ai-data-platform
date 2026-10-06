import {
  markScheduledJobDue,
  reconcileScheduledJobAlarms,
  scheduledJobIdFromAlarm
} from "./scheduled-job-store";

async function configureExtension() {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  await reconcileScheduledJobAlarms();
}

chrome.runtime.onInstalled.addListener(() => {
  void configureExtension().catch((error: unknown) => {
    console.error("Unable to configure extension scheduling.", error);
  });
});

chrome.runtime.onStartup.addListener(() => {
  void reconcileScheduledJobAlarms().catch((error: unknown) => {
    console.error("Unable to restore scheduled job alarms.", error);
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  const jobId = scheduledJobIdFromAlarm(alarm.name);
  if (!jobId) return;

  void markScheduledJobDue(jobId).catch((error: unknown) => {
    console.error("Unable to mark scheduled extraction job due.", error);
  });
});
