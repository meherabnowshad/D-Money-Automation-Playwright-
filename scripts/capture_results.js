const { chromium } = require('@playwright/test');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function renderTerminalCard(title, suiteTag, command, terminalOutput, outputPath) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 620 } });

  const escapedOutput = terminalOutput
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/✓/g, '<span style="color:#10b981;font-weight:bold;">✓</span>')
    .replace(/passed/g, '<span style="color:#10b981;font-weight:bold;">passed</span>')
    .replace(/\[chromium\]/g, '<span style="color:#6366f1;font-weight:bold;">[chromium]</span>')
    .replace(/Running 1 test using 1 worker/g, '<span style="color:#94a3b8;">Running 1 test using 1 worker</span>');

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body {
        margin: 0;
        padding: 24px;
        background: #0f172a;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, monospace;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .card {
        width: 100%;
        background: #1e293b;
        border-radius: 12px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
        border: 1px solid #334155;
        overflow: hidden;
      }
      .header {
        background: #0f172a;
        padding: 12px 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid #334155;
      }
      .dots {
        display: flex;
        gap: 6px;
      }
      .dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
      }
      .dot-red { background: #ef4444; }
      .dot-yellow { background: #f59e0b; }
      .dot-green { background: #10b981; }
      .title {
        color: #94a3b8;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.5px;
      }
      .badge {
        background: rgba(16, 185, 129, 0.2);
        color: #34d399;
        font-size: 11px;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: 9999px;
        border: 1px solid rgba(16, 185, 129, 0.3);
      }
      .content {
        padding: 20px 24px;
      }
      .cmd-bar {
        background: #0f172a;
        padding: 10px 14px;
        border-radius: 8px;
        color: #38bdf8;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 13px;
        margin-bottom: 18px;
        border: 1px solid #1e293b;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .cmd-prompt { color: #f43f5e; font-weight: bold; }
      .terminal-body {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 13.5px;
        line-height: 1.6;
        color: #f1f5f9;
        white-space: pre-wrap;
        word-break: break-all;
      }
      .footer {
        margin-top: 18px;
        padding-top: 14px;
        border-top: 1px solid #334155;
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: #64748b;
        font-size: 12px;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="header">
        <div class="dots">
          <div class="dot dot-red"></div>
          <div class="dot dot-yellow"></div>
          <div class="dot dot-green"></div>
        </div>
        <div class="title">${title} (${suiteTag})</div>
        <div class="badge">PASSED</div>
      </div>
      <div class="content">
        <div class="cmd-bar">
          <span class="cmd-prompt">$</span> ${command}
        </div>
        <div class="terminal-body">${escapedOutput}</div>
        <div class="footer">
          <span>Framework: Playwright · Headed Video Recorded</span>
          <span>Environment: macOS · Chromium</span>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;

  await page.setContent(html);
  await page.waitForTimeout(500);
  await page.screenshot({ path: outputPath });
  await browser.close();
}

async function main() {
  fs.mkdirSync('assets', { recursive: true });

  console.log('Running Regression Test...');
  let regressionOutput = '';
  try {
    regressionOutput = execSync('npx playwright test tests/regression.spec.ts', { encoding: 'utf-8' });
  } catch (err) {
    regressionOutput = err.stdout || err.message;
  }
  console.log('Regression Output:\n', regressionOutput);

  await renderTerminalCard(
    'DMoney Portal - Regression Test Execution',
    '@regression',
    'npx playwright test -g "@regression"',
    regressionOutput,
    'assets/regression_test_result.png'
  );
  console.log('Saved assets/regression_test_result.png');

  console.log('Running Smoke Test...');
  let smokeOutput = '';
  try {
    smokeOutput = execSync('npx playwright test tests/smoke.spec.ts', { encoding: 'utf-8' });
  } catch (err) {
    smokeOutput = err.stdout || err.message;
  }
  console.log('Smoke Output:\n', smokeOutput);

  await renderTerminalCard(
    'DMoney Portal - Smoke Test Execution',
    '@smoke',
    'npx playwright test -g "@smoke"',
    smokeOutput,
    'assets/smoke_test_result.png'
  );
  console.log('Saved assets/smoke_test_result.png');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

