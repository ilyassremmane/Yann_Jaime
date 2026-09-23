import CDP from 'chrome-remote-interface';

/* Capture d'écran d'une page via Chrome piloté en CDP (headless + remote-debugging). */
const [url, shot, widthArg, heightArg, mobileArg] = process.argv.slice(2);
const width = Number(widthArg ?? 1280);
const height = Number(heightArg ?? 900);
const mobile = mobileArg === 'mobile';

const client = await CDP({ port: 9222 });
const { Page, Runtime, Emulation, Log } = client;
const errors = [];
Log.enable().catch(() => {});
client.on('Log.entryAdded', ({ entry }) => {
  if (['error'].includes(entry.level) || entry.source === 'exception') errors.push(entry.text ?? entry.url);
});
await Emulation.setDeviceMetricsOverride({
  width,
  height,
  deviceScaleFactor: 1,
  mobile,
});
await Page.enable();
await Page.navigate({ url });
await Page.loadEventFired();
await new Promise((r) => setTimeout(r, 9000));
if (shot) {
  const { data } = await Page.captureScreenshot({ format: 'png' });
  const { writeFileSync } = await import('node:fs');
  writeFileSync(shot, Buffer.from(data, 'base64'));
  console.log('capture:', shot);
}
/* DOM + erreurs console */
const dom = await Runtime.evaluate({ expression: 'document.documentElement.outerHTML.length' });
console.log('dom-length:', dom.result.value);
const bodyText = await Runtime.evaluate({
  expression: 'document.body ? document.body.innerText.slice(0, 1500) : \"(pas de body)\"',
});
console.log('---TEXTE---');
console.log(bodyText.result.value);
console.log('---ERREURS---');
console.log(errors.slice(0, 12).join('\\n') || '(aucune)');
await client.close();

